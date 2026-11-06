// The per-value and per-leader input groups (CONTRACTS.md section 9): one small SQL file each, and their criteria.
import {
  DEALING,
  MODE,
  ONOFF,
  OPTION_DEFAULTS,
  PARAM,
  PERSONA,
  REVEAL,
  SEED_MAX,
  SEED_MIN,
  configKeyOf,
  KEY,
  listValue
} from "../../shared/lshuf-constants.js";
import { MODDED_LEADER_TYPES, MODDED_LEADERS, VANILLA_LEADERS, KNOWN_LEADERS } from "../../shared/lshuf-known-leaders.js";
import { q } from "./sql-util.mjs";

export const INPUT_LOAD_ORDER = 20010;
const BOOLS = ["KeepMine", "ModdedAbilities", "ModdedAttributes", "ModdedBiases"];
const VALUES = {
  Mode: Object.values(MODE),
  Biases: Object.values(ONOFF),
  Abilities: Object.values(ONOFF),
  Attributes: Object.values(ONOFF),
  Personality: Object.values(PERSONA),
  Dealing: Object.values(DEALING),
  Reveal: Object.values(REVEAL)
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
  return out;
}

export function knownLeadersSql() {
  const rows = [
    ...VANILLA_LEADERS.map((l) => `(${q(l)}, 0, NULL)`),
    ...MODDED_LEADERS.map((m) => `(${q(m.leaderType)}, 1, ${q(m.modId)})`)
  ];
  return `INSERT OR IGNORE INTO LShufKnownLeaders (LeaderType, IsModded, ModId) VALUES\n  ${rows.join(",\n  ")};\n`;
}
