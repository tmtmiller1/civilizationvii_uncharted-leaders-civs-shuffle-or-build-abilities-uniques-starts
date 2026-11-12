// The per-value and per-leader input groups (CONTRACTS.md section 9): one small SQL file each, and their criteria.
import {
  DEALING, MODE, OPTION_DEFAULTS, PARAM, PERSONA, REVEAL, SEED_MAX, SEED_MIN, configKeyOf, BUILD_SLOTS, KEY,
  listValue, A_MODE, B_MODE, T_MODE, CA_MODE, CU_MODE, MODE_CUSTOM, CC_MODE, AGE_ORDER
} from "../../shared/lshuf-constants.js";
import { MODDED_LEADER_TYPES, MODDED_LEADERS, VANILLA_LEADERS, KNOWN_LEADERS } from "../../shared/lshuf-known-leaders.js";
import { KNOWN_CIVS } from "../../shared/lshuf-known-civs.js";
import { buildPieceIds } from "./build-pieces.mjs";
import { q } from "./sql-util.mjs";

export const INPUT_LOAD_ORDER = 20010;
const BOOLS = ["KeepMine", "ModdedAbilities", "ModdedAttributes", "ModdedBiases"];
const VALUES = {
  Mode: [...Object.values(MODE), MODE_CUSTOM],
  Biases: Object.values(B_MODE),
  Abilities: Object.values(A_MODE),
  Attributes: Object.values(T_MODE),
  CivAbilities: Object.values(CA_MODE),
  CivUniques: Object.values(CU_MODE),
  CivCivics: Object.values(CC_MODE),
  Personality: Object.values(PERSONA),
  Dealing: Object.values(DEALING),
  Reveal: Object.values(REVEAL),
  // On by default, so turning it off needs its own group.
  KeepBuiltCiv: ["1", "0"]
};

const matches = (key, value) =>
  `<ConfigurationValueMatches><Group>Game</Group><ConfigurationId>${key}</ConfigurationId><Value>${value}</Value></ConfigurationValueMatches>`;
const contains = (key, value) =>
  `<ConfigurationValueContains><Group>Game</Group><ConfigurationId>${key}</ConfigurationId><Value>${value}</Value></ConfigurationValueContains>`;

// Each entry: { id, criterion, file, sql }.
export function inputGroups() {
  const out = [];
  for (let n = SEED_MIN; n <= SEED_MAX; n += 1) {
    out.push({
      id: `lshuf-seed-${n}`,
      criterion: matches(PARAM.Seed, n),
      file: `data/generated/seed/seed-${n}.sql`,
      sql: `DELETE FROM LShufSeed;\nINSERT INTO LShufSeed (Seed) VALUES (${n});\n`
    });
  }
  for (const name of Object.keys(OPTION_DEFAULTS)) {
    const values = BOOLS.includes(name) ? ["1"] : VALUES[name];
    for (const value of values) {
      out.push({
        id: `lshuf-opt-${name}-${value}`,
        criterion: matches(configKeyOf(PARAM[name]), value),
        file: `data/generated/options/opt-${name}-${value}.sql`,
        sql: `INSERT OR REPLACE INTO LShufOptions (Name, Value) VALUES (${q(name)}, ${q(value)});\n`
      });
    }
  }
  // The age this game's database is loaded for (the start age, then each new age): the deal plays builder civs in
  // it, so a civ picked from another age (Test of Time) builds as a civ of this one.
  for (const age of AGE_ORDER) {
    out.push({
      id: `lshuf-age-${age}`,
      criterion: `<AgeInUse>${age}</AgeInUse>`,
      file: `data/generated/options/age-${age}.sql`,
      sql: `INSERT OR REPLACE INTO LShufOptions (Name, Value) VALUES ('Age', ${q(age)});\n`
    });
  }
  const leaderGroup = (kind, leader, criterion, sql) => ({
    id: `lshuf-${kind}-${leader}`,
    criterion,
    file: `data/generated/${kind}/${kind}-${leader}.sql`,
    sql
  });
  const outRow = (leader, reason) => `INSERT OR IGNORE INTO LShufOut (LeaderType, Reason) VALUES (${q(leader)}, ${q(reason)});\n`;
  for (const l of KNOWN_LEADERS) {
    out.push(leaderGroup("keep", l, matches(KEY.keep(l), 1), `INSERT OR IGNORE INTO LShufKept (LeaderType) VALUES (${q(l)});\n`));
  }
  for (const l of VANILLA_LEADERS) {
    out.push(leaderGroup("out", l, contains(configKeyOf(PARAM.LeadersOut), listValue(l)), outRow(l, "list")));
  }
  for (const l of MODDED_LEADER_TYPES) {
    out.push(leaderGroup("moddedout", l, contains(configKeyOf(PARAM.ModdedOut), listValue(l)), outRow(l, "moddedlist")));
  }
  for (const l of KNOWN_LEADERS) out.push(leaderGroup("notin", l, contains(KEY.NotInGame, listValue(l)), outRow(l, "notingame")));
  for (const l of MODDED_LEADER_TYPES) {
    out.push(leaderGroup("modok", l, matches(KEY.modOK(l), 1), `INSERT OR IGNORE INTO LShufModOK (LeaderType) VALUES (${q(l)});\n`));
  }
  out.push(...buildGroups(leaderGroup));
  return out;
}

// Build your own leader (CONTRACTS 13, builder slots): per slot, the builder per known leader, its civ per known
// civilization (selected through Civilizations, so a missing DLC civ is skipped), and one group per card id. Slot 1
// keeps the unsuffixed ids and keys; slots 2..BUILD_SLOTS append the slot number.
function buildGroups(leaderGroup) {
  const out = [];
  const ids = buildPieceIds();
  for (let n = 1; n <= BUILD_SLOTS; n++) {
    const sfx = n === 1 ? "" : String(n);
    for (const l of KNOWN_LEADERS) {
      out.push(leaderGroup(`build${sfx}`, l, contains(KEY.builderN(n), listValue(l)),
        `INSERT OR IGNORE INTO LShufBuild (Slot, LeaderType) VALUES (${n}, ${q(l)});\n`));
    }
    for (const c of KNOWN_CIVS) {
      out.push({
        id: `lshuf-buildciv${sfx}-${c}`,
        criterion: contains(KEY.builderCivN(n), listValue(c)),
        file: `data/generated/buildciv${sfx}/buildciv${sfx}-${c}.sql`,
        sql: `UPDATE LShufBuild SET CivilizationType = ${q(c)} WHERE Slot = ${n} AND ${q(c)} IN (SELECT CivilizationType FROM Civilizations);\n`
      });
    }
    for (const id of ids) {
      out.push({
        id: `lshuf-built${sfx}-${id}`,
        criterion: contains(KEY.builtN(n), listValue(id)),
        file: `data/generated/built${sfx}/built${sfx}-${id}.sql`,
        sql: `INSERT OR IGNORE INTO LShufBuildPieces (Slot, PieceId) SELECT ${n}, ${q(id)} WHERE EXISTS (SELECT 1 FROM LShufBuild WHERE Slot = ${n});\n`
      });
    }
  }
  return out;
}

export function knownLeadersSql() {
  const rows = [
    ...VANILLA_LEADERS.map((l) => `(${q(l)}, 0, NULL)`),
    ...MODDED_LEADERS.map((m) => `(${q(m.leaderType)}, 1, ${q(m.modId)})`)
  ];
  return `INSERT OR IGNORE INTO LShufKnownLeaders (LeaderType, IsModded, ModId) VALUES\n  ${rows.join(",\n  ")};\n`;
}
