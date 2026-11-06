// Self-check for the deal: runs the generated SQL on scratch copies of Debug/gameplay-copy.sqlite and compares the
// LShufResult* rows with computeDeal(buildDealInput(...)) for a set of seeds and options; checks foreign keys and
// the rows other mods own. The original database is never opened for writing.
//
//   node scripts/generate/selfcheck.mjs [scratchDir] [--quick] [--only=<name part>]
// The last scenario's database is left at <scratchDir>/run.sqlite for inspection.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { buildDealInput, computeDeal } from "../../shared/deal/lshuf-deal.js";
import { BIAS_TABLES } from "../../shared/lshuf-constants.js";
import { buildFiles, DEAL_FILES, KNOWN_FILE } from "./generate.mjs";
import { inputGroups } from "./inputs.mjs";
import { scenarios } from "./selfcheck-scenarios.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = path.join(os.homedir(), "Library/Application Support/Civilization VII/Debug/gameplay-copy.sqlite");
const args = process.argv.slice(2);
const scratch = path.resolve(args.find((a) => !a.startsWith("--")) || path.join(os.tmpdir(), "lshuf-selfcheck"));
const quick = args.includes("--quick");
const only = (args.find((a) => a.startsWith("--only=")) || "").slice("--only=".length);

const FK_TABLES = [
  "Types", "Traits", "LeaderTraits", "TraitModifiers", "Modifiers", "ModifierArguments", "ModifierStrings", "AiListTypes",
  "AiLists", "AiFavoredItems", "ProgressionTreeNodeUnlocks", "LeaderCivPriorities", ...BIAS_TABLES
];
const PROTECTED = `SELECT LeaderType, TraitType FROM LeaderTraits WHERE TraitType LIKE 'TRAIT_CD_FLIP_%'
  OR TraitType LIKE 'TRAIT_PARTISANS_%' OR TraitType IN ('TRAIT_LEADER_MAJOR_CIV', 'TRAIT_LEADER_MINOR_CIV',
  'TRAIT_LEADER_AGGRESSIVE', 'TRAIT_UNLOCK_FLEET_COMMANDER') OR TraitType LIKE '%_VICTORY' ORDER BY 1, 2`;

function fnv(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h | 0;
}

function open(file) {
  const db = new DatabaseSync(file);
  db.function("Make_Hash", { deterministic: true }, (s) => fnv(String(s)));
  return db;
}

const readFile = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

// Two stand-in listed modded leaders so the modded rules run: Nearl (six attributes, the reviewed modifier set)
// and Bocchi (one attribute, an ability modifier with a leader-type requirement).
function addStandIns(db) {
  const nearlMods = db
    .prepare("SELECT ModifierSet FROM LShufReviewedSets WHERE AbilityTrait = 'TRAIT_LEADER_NEARL_ABILITY'")
    .get();
  if (!nearlMods) return false;
  const mods = nearlMods.ModifierSet.split("|").filter(Boolean);
  db.exec(`INSERT INTO Types (Type, Kind) VALUES ('LEADER_Nearl', 'KIND_LEADER'), ('LEADER_Bocchi', 'KIND_LEADER'),
    ('TRAIT_LEADER_NEARL_ABILITY', 'KIND_TRAIT'), ('TRAIT_LEADER_BOCCHI_ABILITY', 'KIND_TRAIT');
  INSERT INTO Leaders (LeaderType, Name, IsMajorLeader, InheritFrom) VALUES ('LEADER_Nearl', 'LOC_X', 1, 'LEADER_DEFAULT'),
    ('LEADER_Bocchi', 'LOC_Y', 1, 'LEADER_DEFAULT');
  INSERT INTO Traits (TraitType, Name, InternalOnly) VALUES ('TRAIT_LEADER_NEARL_ABILITY', 'LOC_NEARL_NAME', 1),
    ('TRAIT_LEADER_BOCCHI_ABILITY', 'LOC_BOCCHI_NAME', 1);
  INSERT INTO LeaderTraits (LeaderType, TraitType) SELECT 'LEADER_Nearl', TraitType FROM LShufAttributeTraits
    WHERE TraitType <> 'TRAIT_LEADER_ATTRIBUTE_WILDCARD';
  INSERT INTO LeaderTraits (LeaderType, TraitType) VALUES ('LEADER_Nearl', 'TRAIT_LEADER_NEARL_ABILITY'),
    ('LEADER_Bocchi', 'TRAIT_LEADER_BOCCHI_ABILITY'), ('LEADER_Bocchi', 'TRAIT_LEADER_ATTRIBUTE_ECONOMIC');
  INSERT INTO TraitModifiers (ModifierId, TraitType) VALUES ('CHALLENGE_AMINA_MAJOR_TRIUMPHS_ANTIQUITY_COMPLETE', 'TRAIT_LEADER_BOCCHI_ABILITY'),
    ('AMINA_MOD_RESOURCE_GOLD', 'TRAIT_LEADER_BOCCHI_ABILITY');`);
  const ins = db.prepare("INSERT OR IGNORE INTO Modifiers (ModifierId, ModifierType) SELECT ?, ModifierType FROM Modifiers WHERE ModifierId = 'AMINA_MOD_RESOURCE_GOLD'");
  const tm = db.prepare("INSERT INTO TraitModifiers (ModifierId, TraitType) VALUES (?, 'TRAIT_LEADER_NEARL_ABILITY')");
  for (const m of mods) {
    ins.run(m);
    tm.run(m);
  }
  return true;
}

function buildBase() {
  fs.mkdirSync(scratch, { recursive: true });
  const base = path.join(scratch, "base.sqlite");
  fs.copyFileSync(SOURCE, base);
  const db = open(base);
  db.exec(readFile("data/schema/gameplay-tables.sql"));
  const mappingFile = path.join(root, "data/mapping/lshuf-mapping.sql");
  if (!fs.existsSync(mappingFile)) throw new Error("data/mapping/lshuf-mapping.sql is missing");
  db.exec(fs.readFileSync(mappingFile, "utf8"));
  db.exec(readFile(KNOWN_FILE));
  const standIns = addStandIns(db);
  db.close();
  const reviewed = path.join(scratch, "base-reviewed.sqlite");
  fs.copyFileSync(base, reviewed);
  const r = open(reviewed);
  r.exec("UPDATE LShufMapping SET Reviewed = 1;");
  r.close();
  return { base, reviewed, standIns };
}

// The load criteria as watched in probes 7 and 13 (CONTRACTS.md section 9).
function criterionMet(criterion, gameConfig) {
  const m = /<(ConfigurationValueMatches|ConfigurationValueContains)><Group>Game<\/Group><ConfigurationId>([^<]+)<\/ConfigurationId><Value>([^<]*)<\/Value>/.exec(criterion);
  const [, kind, keyName, value] = m;
  const v = gameConfig[keyName];
  if (v == null || typeof v === "number") return false;
  if (kind === "ConfigurationValueMatches") return String(v) === value;
  const entries = Array.isArray(v) ? v.map(String) : String(v).split(",");
  return value.split(",").some((w) => entries.includes(w));
}

function applyInputs(db, gameConfig) {
  const files = buildFiles();
  let applied = 0;
  for (const g of inputGroups()) {
    if (!criterionMet(g.criterion, gameConfig)) continue;
    db.exec(files.get(g.file));
    applied += 1;
  }
  return { files, applied };
}

const readTableOf = (db) => (name) => {
  try {
    return db.prepare(`SELECT * FROM "${name}"`).all().map((r) => ({ ...r }));
  } catch (_e) {
    return [];
  }
};

function configFromTables(db) {
  const seed = db.prepare("SELECT MIN(Seed) AS s FROM LShufSeed").get().s;
  const options = {};
  for (const r of db.prepare("SELECT Name, Value FROM LShufOptions").all()) options[r.Name] = r.Value;
  return {
    seed: seed == null ? 1 : seed,
    options,
    kept: db.prepare("SELECT LeaderType FROM LShufKept").all().map((r) => r.LeaderType),
    out: db.prepare("SELECT LeaderType, Reason FROM LShufOut").all().map((r) => ({ ...r })),
    modOK: db.prepare("SELECT LeaderType FROM LShufModOK").all().map((r) => r.LeaderType)
  };
}

const RESULT_TABLES = {
  leaders: "LShufResultLeaders",
  pieces: "LShufResultPieces",
  attributes: "LShufResultAttributes",
  biases: "LShufResultBiases",
  unlocks: "LShufResultUnlocks",
  meta: "LShufResultMeta"
};

const canon = (rows) => rows.map((r) => JSON.stringify(Object.keys(r).sort().map((k) => [k, r[k]]))).sort();

function compare(js, db) {
  const diffs = [];
  for (const [k, table] of Object.entries(RESULT_TABLES)) {
    const a = canon(js[k]);
    const b = canon(db.prepare(`SELECT * FROM ${table}`).all().map((r) => ({ ...r })));
    if (a.length !== b.length || a.some((x, i) => x !== b[i])) {
      const onlyJs = a.filter((x) => !b.includes(x)).slice(0, 3);
      const onlySql = b.filter((x) => !a.includes(x)).slice(0, 3);
      diffs.push(`${table}: js ${a.length} rows, sql ${b.length}; only js ${onlyJs.join(" ")}; only sql ${onlySql.join(" ")}`);
    }
  }
  return diffs;
}

function fkCounts(db) {
  const out = {};
  for (const t of FK_TABLES) out[t] = db.prepare(`PRAGMA foreign_key_check(${t})`).all().length;
  return out;
}

function gameChecks(db, before) {
  const problems = [];
  const after = fkCounts(db);
  for (const t of FK_TABLES) if (after[t] > before.fk[t]) problems.push(`foreign_key_check(${t}): ${before.fk[t]} -> ${after[t]}`);
  const prot = JSON.stringify(db.prepare(PROTECTED).all());
  if (prot !== before.protected) problems.push("protected LeaderTraits rows changed");
  const twoAbilities = db
    .prepare(`SELECT lt.LeaderType, COUNT(*) AS c FROM LeaderTraits lt JOIN Traits t ON t.TraitType = lt.TraitType
      JOIN Leaders l ON l.LeaderType = lt.LeaderType WHERE l.IsMajorLeader = 1 AND t.Name IS NOT NULL GROUP BY lt.LeaderType HAVING c > 1`)
    .all();
  if (twoAbilities.length) problems.push(`leaders with two abilities: ${twoAbilities.map((r) => r.LeaderType).join(", ")}`);
  const emptyPersona = db
    .prepare(`SELECT l.LeaderType FROM LShufWork_L l JOIN LeaderTraits lt ON lt.LeaderType = l.LeaderType
      AND lt.TraitType = 'TRAIT_LSHUF_PERSONA_' || l.LeaderType
      WHERE NOT EXISTS (SELECT 1 FROM TraitModifiers tm WHERE tm.TraitType = lt.TraitType)
        AND EXISTS (SELECT 1 FROM LShufMappingModifiers mm JOIN LShufMapping m ON m.PieceId = mm.PieceId
          JOIN LShufWork_L p ON p.LeaderType = l.PersonaFrom JOIN TraitModifiers tm ON tm.TraitType = p.Ability
            AND tm.ModifierId = mm.ModifierId WHERE m.LeaderType = l.PersonaFrom AND m.Kind = 'agenda')`)
    .all();
  if (emptyPersona.length) problems.push(`personality traits with no agenda: ${emptyPersona.map((r) => r.LeaderType).join(", ")}`);
  const emptyDealt = db
    .prepare(`SELECT lt.LeaderType FROM LeaderTraits lt WHERE lt.TraitType = 'TRAIT_LSHUF_' || lt.LeaderType
      AND NOT EXISTS (SELECT 1 FROM TraitModifiers tm WHERE tm.TraitType = lt.TraitType)`)
    .all();
  if (emptyDealt.length) problems.push(`dealt traits with no modifiers: ${emptyDealt.map((r) => r.LeaderType).join(", ")}`);
  const resultBiases = db.prepare("SELECT COUNT(*) AS c FROM LShufResultBiases").get().c;
  const tableBiases = BIAS_TABLES.reduce((s, t) => s + db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c, 0);
  if (resultBiases !== tableBiases) problems.push(`bias rows: result ${resultBiases}, tables ${tableBiases}`);
  return problems;
}

// Run a file; on an error, find and name the failing statement.
function execReporting(db, name, sql) {
  try {
    db.exec(sql);
  } catch (e) {
    for (const stmt of sql.split(/;\n/)) {
      try {
        db.exec(`${stmt};`);
      } catch (e2) {
        throw new Error(`${name}: ${e2.message}\n${stmt.slice(0, 600)}`);
      }
    }
    throw e;
  }
}

function runScenario(sc, bases) {
  const file = path.join(scratch, "run.sqlite");
  fs.copyFileSync(sc.reviewed ? bases.reviewed : bases.base, file);
  const db = open(file);
  const { files, applied } = applyInputs(db, sc.config);
  const input = buildDealInput(readTableOf(db), configFromTables(db));
  const js = computeDeal(input);
  const before = { fk: fkCounts(db), protected: JSON.stringify(db.prepare(PROTECTED).all()) };
  const t0 = Date.now();
  for (const d of DEAL_FILES) execReporting(db, d.file, files.get(d.file));
  const ms = Date.now() - t0;
  const diffs = compare(js, db);
  const problems = gameChecks(db, before);
  const dealt = js.leaders.filter((r) => r.Status === "dealt").length;
  db.close();
  return { diffs, problems, ms, applied, dealt, pieces: js.pieces.length, meta: js.meta.filter((m) => m.Name.startsWith("Fallback")) };
}

function main() {
  const bases = buildBase();
  console.log(`scratch ${scratch}; stand-in modded leaders ${bases.standIns ? "added" : "skipped"}`);
  const all = only ? scenarios().filter((sc) => sc.name.includes(only)) : scenarios();
  const list = quick ? all.slice(0, 4) : all;
  let bad = 0;
  for (const sc of list) {
    const r = runScenario(sc, bases);
    const ok = !r.diffs.length && !r.problems.length;
    if (!ok) bad += 1;
    const fb = r.meta.map((m) => m.Name).join(",");
    console.log(`${ok ? "ok  " : "FAIL"} ${sc.name} (inputs ${r.applied}, dealt ${r.dealt}, pieces ${r.pieces}${fb ? `, ${fb}` : ""}, sql ${r.ms} ms)`);
    for (const d of [...r.diffs, ...r.problems]) console.log(`     ${d}`);
  }
  console.log(`${list.length - bad}/${list.length} scenarios match`);
  process.exit(bad ? 1 : 0);
}

main();
