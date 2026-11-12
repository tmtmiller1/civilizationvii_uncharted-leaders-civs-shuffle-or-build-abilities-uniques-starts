// Builds the fixture databases the tests load, into tests/fixtures/db/ (gitignored).
//
//   node scripts/fixtures/build-fixtures.mjs            build any fixture that's missing or older than its source
//   node scripts/fixtures/build-fixtures.mjs --force    rebuild them all
//
// Sources are the game's Debug copies (Debug/gameplay-copy.sqlite and frontend-copy.sqlite), opened read-only and
// copied; the originals are never written. Each fixture is a folder holding gameplay.sqlite, frontend.sqlite and
// manifest.json (what was changed, row counts the tests rely on).
//
// Make_Hash: the game registers a Make_Hash() SQL function that the OnTypeInsert / OnKindInsert / OnTagInsert
// triggers call. The triggers stay in the copies; a stand-in function is registered on every connection instead
// (makeHashStandIn below, also used by tests/_harness.mjs). It returns a 48-bit value at or above 2^33, so it can't
// collide with the game's own 32-bit hashes in the copied rows (Types.Hash is UNIQUE).
//
// Owned by workstream E.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const here = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(here, "..", "..");
export const FIXTURE_ROOT = path.join(PROJECT_ROOT, "tests", "fixtures", "db");
// A saved copy of an in-game database set (tests/fixtures/source-db/, not committed; the 1.5.1 set from a
// mods-off Antiquity lab game) comes first, because the game rewrites its Debug copies at every launch, and a launch
// that stops at the main menu leaves them nearly empty. LSHUF_DEBUG_DIR overrides both.
const SAVED_DIR = path.join(PROJECT_ROOT, "tests", "fixtures", "source-db");
const LIVE_DIR = path.join(os.homedir(), "Library", "Application Support", "Civilization VII", "Debug");
export const DEBUG_DIR =
  process.env.LSHUF_DEBUG_DIR || (fs.existsSync(path.join(SAVED_DIR, "gameplay-copy.sqlite")) ? SAVED_DIR : LIVE_DIR);
export const SOURCES = {
  gameplay: path.join(DEBUG_DIR, "gameplay-copy.sqlite"),
  frontend: path.join(DEBUG_DIR, "frontend-copy.sqlite")
};

// The DLC leader the dlc-removed fixture drops (Crossroads of the World), and the ids the other fixtures add.
export const DLC_LEADER = "LEADER_ADA_LOVELACE";
export const DLC_MARK = "ADA_LOVELACE";
export const ADDED_LEADER = "LEADER_FIXTURE_NEWCOMER";
export const ADDED_ABILITY = "TRAIT_FIXTURE_NEWCOMER_GIFT";
export const ADDED_MODIFIER = "FIXTURE_NEWCOMER_MOD_CAPACITY";
export const EXTRA_MODIFIER = "FIXTURE_EXTRA_AMINA_CAPACITY";
export const EXTRA_ON_TRAIT = "TRAIT_LEADER_AMINA_ABILITY";
export const EXTRA_COPIED_FROM = "AMINA_MOD_RESOURCE_CAPACITY";
// The bias row the added-leader fixture removes, as another mod might.
export const REMOVED_BIAS = { table: "StartBiasBiomes", LeaderType: "LEADER_AMINA", BiomeType: "BIOME_DESERT" };

export const FIXTURES = ["base", "dlc-removed", "added-leader", "extra-modifier", "exploration", "modern"];

// The later ages' fixtures: the game loads another database for each age (other civilizations, units, civics), so
// each has its own saved copies, tests/fixtures/source-db/<folder>/, from a mods-off lab game started in that age
// (1.5.1, from the bench's compiled copies 2026-11-11). The four fixtures above are the Antiquity database.
const AGE_FIXTURES = { exploration: "AGE_EXPLORATION", modern: "AGE_MODERN" };
// The age each fixture's database was loaded for (the harness's AgeInUse default).
export const fixtureAge = (name) => AGE_FIXTURES[name] || "AGE_ANTIQUITY";

export function sourcesOf(name) {
  if (!AGE_FIXTURES[name] || process.env.LSHUF_DEBUG_DIR) return SOURCES;
  const dir = path.join(SAVED_DIR, name);
  return { gameplay: path.join(dir, "gameplay-copy.sqlite"), frontend: path.join(dir, "frontend-copy.sqlite") };
}

export function makeHashStandIn(value) {
  const digest = crypto.createHash("sha1").update(String(value)).digest();
  return (1n << 33n) + (digest.readBigUInt64BE(0) & ((1n << 47n) - 1n));
}

// Foreign keys stay off, as during the game's own load (its cascades are triggers, and a 1.5.0 table has a foreign
// key SQLite can't enforce: CultureSlotAllowances -> Traditions). Tests check keys afterwards with foreignKeyCheck().
export function openDb(file, { readOnly = false } = {}) {
  const db = new DatabaseSync(file, { readOnly, enableForeignKeyConstraints: false });
  db.function("Make_Hash", { deterministic: true }, makeHashStandIn);
  return db;
}

const q = (name) => `"${String(name).replace(/"/g, '""')}"`;
const tablesOf = (db) =>
  db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((r) => r.name);
const columnsOf = (db, table) => db.prepare(`PRAGMA table_info(${q(table)})`).all();

// Per-table foreign_key_check: the whole-database form stops at the first table whose foreign key doesn't point at
// a unique key (CultureSlotAllowances -> Traditions in 1.5.0). Returns { rows: [{table, rowid, parent, fkid}],
// errors: {table: message} }.
export function foreignKeyCheck(db) {
  const rows = [];
  const errors = {};
  for (const table of tablesOf(db)) {
    try {
      for (const r of db.prepare(`PRAGMA foreign_key_check(${q(table)})`).all()) rows.push({ ...r });
    } catch (e) {
      errors[table] = e.message;
    }
  }
  return { rows, errors };
}

const fkKey = (r) => `${r.table}|${r.rowid}|${r.parent}|${r.fkid}`;

// Probe leftovers in the Debug copies (the copies came from a lab run with probe mods on).
function cleanProbeLeftovers(db, kind) {
  const removed = [];
  for (const t of tablesOf(db).filter((n) => /^LShuf/i.test(n))) {
    db.exec(`DROP TABLE ${q(t)}`);
    removed.push(`table ${t}`);
  }
  if (kind === "frontend") {
    const ids = db
      .prepare("SELECT ParameterID FROM Parameters WHERE ParameterID LIKE 'LShuf%'")
      .all()
      .map((r) => r.ParameterID);
    for (const table of ["Parameters", "ParameterDependencies", "ParameterCriteria", "ParameterRequirements"]) {
      if (!tablesOf(db).includes(table)) continue;
      const cols = columnsOf(db, table).map((c) => c.name);
      if (!cols.includes("ParameterID")) continue;
      const n = db.prepare(`DELETE FROM ${q(table)} WHERE ParameterID LIKE 'LShuf%'`).run().changes;
      if (n) removed.push(`${n} ${table} rows`);
    }
    const dv = db.prepare("DELETE FROM DomainValues WHERE Domain LIKE 'LShuf%' OR Value LIKE 'LSHUF_%'").run().changes;
    if (dv) removed.push(`${dv} DomainValues rows`);
    if (ids.length) removed.push(`parameters ${ids.join(", ")}`);
  }
  return removed;
}

// Removes a DLC leader the way a player without the DLC would have it: every row whose text columns name an id
// containing `mark`, with triggers dropped for the duration (so the game's SET NULL triggers can't leave rows that a
// DLC-less database wouldn't have, such as a legend-node unlock with a NULL RequiredTraitType), then the rows left
// pointing at deleted parents, until foreign_key_check shows nothing new against the starting copy.
function removeByMark(db, mark) {
  const baseline = new Set(foreignKeyCheck(db).rows.map(fkKey));
  const triggers = db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'trigger'").all();
  for (const t of triggers) db.exec(`DROP TRIGGER ${q(t.name)}`);
  const like = `%${mark}%`;
  const ids = new Set();
  const textCols = {};
  for (const table of tablesOf(db)) {
    textCols[table] = columnsOf(db, table)
      .filter((c) => !/INT|REAL|BOOL|NUM/i.test(c.type || ""))
      .map((c) => c.name);
    for (const col of textCols[table]) {
      for (const r of db.prepare(`SELECT DISTINCT ${q(col)} AS v FROM ${q(table)} WHERE ${q(col)} LIKE ?`).all(like)) {
        ids.add(r.v);
      }
    }
  }
  db.exec("CREATE TEMP TABLE fixture_drop_ids (id TEXT PRIMARY KEY)");
  const add = db.prepare("INSERT OR IGNORE INTO fixture_drop_ids (id) VALUES (?)");
  for (const id of ids) add.run(id);
  // A requirement whose argument names the leader goes with the argument.
  if (tablesOf(db).includes("RequirementArguments")) {
    const reqs = db
      .prepare("SELECT DISTINCT RequirementId FROM RequirementArguments WHERE Value IN (SELECT id FROM fixture_drop_ids)")
      .all();
    for (const r of reqs) add.run(r.RequirementId);
  }
  const deleted = {};
  for (const table of tablesOf(db)) {
    for (const col of textCols[table] || []) {
      const n = db
        .prepare(`DELETE FROM ${q(table)} WHERE ${q(col)} IN (SELECT id FROM temp.fixture_drop_ids)`)
        .run().changes;
      if (n) deleted[table] = (deleted[table] || 0) + n;
    }
  }
  let orphans = 0;
  for (let pass = 0; pass < 20; pass++) {
    const fresh = foreignKeyCheck(db).rows.filter((r) => !baseline.has(fkKey(r)) && r.rowid != null);
    if (!fresh.length) break;
    for (const r of fresh) {
      orphans += db.prepare(`DELETE FROM ${q(r.table)} WHERE rowid = ?`).run(r.rowid).changes;
      deleted[r.table] = (deleted[r.table] || 0) + 1;
    }
  }
  db.exec("DROP TABLE temp.fixture_drop_ids");
  for (const t of triggers) db.exec(t.sql);
  return { ids: ids.size, deleted, orphans };
}

function addLeaderGameplay(db) {
  db.exec(`
    INSERT INTO Types (Type, Kind) VALUES ('${ADDED_LEADER}', 'KIND_LEADER'), ('${ADDED_ABILITY}', 'KIND_TRAIT');
    INSERT INTO Leaders (LeaderType, InheritFrom, IsMajorLeader, Name)
      VALUES ('${ADDED_LEADER}', 'LEADER_DEFAULT', 1, 'LOC_LEADER_FIXTURE_NEWCOMER_NAME');
    INSERT INTO Traits (TraitType, Name, Description)
      VALUES ('${ADDED_ABILITY}', 'LOC_TRAIT_FIXTURE_NEWCOMER_GIFT_NAME', 'LOC_TRAIT_FIXTURE_NEWCOMER_GIFT_DESCRIPTION');
    INSERT INTO Modifiers (ModifierId, ModifierType, NewOnly, OwnerRequirementSetId, OwnerStackLimit, Permanent,
        RunOnce, SubjectRequirementSetId, SubjectStackLimit)
      SELECT '${ADDED_MODIFIER}', ModifierType, NewOnly, OwnerRequirementSetId, OwnerStackLimit, Permanent, RunOnce,
        SubjectRequirementSetId, SubjectStackLimit FROM Modifiers WHERE ModifierId = '${EXTRA_COPIED_FROM}';
    INSERT INTO ModifierArguments (ModifierId, Name, Extra, SecondExtra, Type, Value)
      SELECT '${ADDED_MODIFIER}', Name, Extra, SecondExtra, Type, Value FROM ModifierArguments
      WHERE ModifierId = '${EXTRA_COPIED_FROM}';
    INSERT INTO TraitModifiers (TraitType, ModifierId) VALUES ('${ADDED_ABILITY}', '${ADDED_MODIFIER}');
    INSERT INTO LeaderTraits (LeaderType, TraitType) VALUES
      ('${ADDED_LEADER}', '${ADDED_ABILITY}'),
      ('${ADDED_LEADER}', 'TRAIT_LEADER_ATTRIBUTE_CULTURAL'),
      ('${ADDED_LEADER}', 'TRAIT_LEADER_ATTRIBUTE_ECONOMIC'),
      ('${ADDED_LEADER}', 'TRAIT_AQ_CULTURE_VICTORY');
    INSERT INTO StartBiasBiomes (LeaderType, BiomeType, Score) VALUES ('${ADDED_LEADER}', 'BIOME_TUNDRA', 20);
  `);
  const { table, LeaderType, BiomeType } = REMOVED_BIAS;
  const removed = db
    .prepare(`DELETE FROM ${q(table)} WHERE LeaderType = ? AND BiomeType = ?`)
    .run(LeaderType, BiomeType).changes;
  return { removedBiasRows: removed };
}

function addLeaderFrontend(db) {
  db.exec(`
    INSERT INTO Leaders (Domain, LeaderType, LeaderName, LeaderDescription, LeaderIcon, LeaderIntroText, SortIndex)
      VALUES ('StandardLeaders', '${ADDED_LEADER}', 'LOC_LEADER_FIXTURE_NEWCOMER_NAME',
        'LOC_LEADER_FIXTURE_NEWCOMER_DESCRIPTION', '${ADDED_LEADER}', 'LOC_LEADER_FIXTURE_NEWCOMER_INTRO', 500);
    INSERT INTO LeaderItems (LeaderDomain, LeaderType, Type, Kind, Name, Description, SortIndex)
      VALUES ('StandardLeaders', '${ADDED_LEADER}', '${ADDED_ABILITY}', 'KIND_TRAIT',
        'LOC_TRAIT_FIXTURE_NEWCOMER_GIFT_NAME', 'LOC_TRAIT_FIXTURE_NEWCOMER_GIFT_DESCRIPTION', 0);
  `);
}

// Another mod adds a modifier to a vanilla ability (as All-Traits Confucius or Confucius Enhanced do). It carries a
// Tooltip argument naming Amina's ability, so a test can see the copy's Tooltip rewritten to the receiver's.
function addExtraModifier(db) {
  db.exec(`
    INSERT INTO Modifiers (ModifierId, ModifierType, NewOnly, OwnerRequirementSetId, OwnerStackLimit, Permanent,
        RunOnce, SubjectRequirementSetId, SubjectStackLimit)
      SELECT '${EXTRA_MODIFIER}', ModifierType, NewOnly, OwnerRequirementSetId, OwnerStackLimit, Permanent, RunOnce,
        SubjectRequirementSetId, SubjectStackLimit FROM Modifiers WHERE ModifierId = '${EXTRA_COPIED_FROM}';
    INSERT INTO ModifierArguments (ModifierId, Name, Extra, SecondExtra, Type, Value)
      SELECT '${EXTRA_MODIFIER}', Name, Extra, SecondExtra, Type, Value FROM ModifierArguments
      WHERE ModifierId = '${EXTRA_COPIED_FROM}' AND Name <> 'Tooltip';
    INSERT INTO ModifierArguments (ModifierId, Name, Value)
      VALUES ('${EXTRA_MODIFIER}', 'Tooltip', 'LOC_TRAIT_LEADER_AMINA_ABILITY_NAME');
    INSERT INTO TraitModifiers (TraitType, ModifierId) VALUES ('${EXTRA_ON_TRAIT}', '${EXTRA_MODIFIER}');
  `);
}

function counts(db, kind) {
  const one = (sql, ...args) => db.prepare(sql).get(...args).n;
  if (kind === "frontend") {
    return {
      standardLeaders: one("SELECT count(*) AS n FROM Leaders WHERE Domain = 'StandardLeaders'"),
      dlcLeaderRows: one("SELECT count(*) AS n FROM Leaders WHERE LeaderType = ?", DLC_LEADER),
      addedLeaderRows: one("SELECT count(*) AS n FROM Leaders WHERE LeaderType = ?", ADDED_LEADER)
    };
  }
  return {
    majorLeaders: one("SELECT count(*) AS n FROM Leaders WHERE IsMajorLeader = 1"),
    leaderTraits: one("SELECT count(*) AS n FROM LeaderTraits"),
    cdFlipRows: one("SELECT count(*) AS n FROM LeaderTraits WHERE TraitType LIKE 'TRAIT_CD_FLIP_%'"),
    partisansRows: one("SELECT count(*) AS n FROM LeaderTraits WHERE TraitType LIKE 'TRAIT_PARTISANS_%'"),
    victoryRows: one("SELECT count(*) AS n FROM LeaderTraits WHERE TraitType LIKE '%_VICTORY'"),
    dlcLeaderRows: one("SELECT count(*) AS n FROM Leaders WHERE LeaderType = ?", DLC_LEADER),
    addedLeaderRows: one("SELECT count(*) AS n FROM Leaders WHERE LeaderType = ?", ADDED_LEADER),
    extraModifierRows: one("SELECT count(*) AS n FROM TraitModifiers WHERE ModifierId = ?", EXTRA_MODIFIER)
  };
}

function copySource(src, dest) {
  // VACUUM INTO from a read-only connection makes a clean copy without touching the original.
  const db = new DatabaseSync(src, { readOnly: true, enableForeignKeyConstraints: false });
  try {
    db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
  } finally {
    db.close();
  }
}

const EDITS = {
  base: { gameplay: () => ({}), frontend: () => ({}) },
  exploration: { gameplay: () => ({}), frontend: () => ({}) },
  modern: { gameplay: () => ({}), frontend: () => ({}) },
  "dlc-removed": {
    gameplay: (db) => removeByMark(db, DLC_MARK),
    frontend: (db) => removeByMark(db, DLC_MARK)
  },
  "added-leader": { gameplay: addLeaderGameplay, frontend: addLeaderFrontend },
  "extra-modifier": { gameplay: (db) => (addExtraModifier(db), {}), frontend: () => ({}) }
};

export function fixturePaths(name) {
  const dir = path.join(FIXTURE_ROOT, name);
  return {
    dir,
    gameplay: path.join(dir, "gameplay.sqlite"),
    frontend: path.join(dir, "frontend.sqlite"),
    manifest: path.join(dir, "manifest.json")
  };
}

function isFresh(name) {
  const p = fixturePaths(name);
  if (!fs.existsSync(p.manifest)) return false;
  const manifest = JSON.parse(fs.readFileSync(p.manifest, "utf8"));
  return Object.entries(sourcesOf(name)).every(
    ([k, src]) => fs.existsSync(src) && manifest.sources?.[k]?.mtimeMs === fs.statSync(src).mtimeMs
  );
}

export function buildFixture(name) {
  if (!EDITS[name]) throw new Error(`unknown fixture ${name}`);
  for (const src of Object.values(sourcesOf(name))) {
    if (!fs.existsSync(src)) throw new Error(`missing source ${src} (a game run writes the Debug copies)`);
  }
  fs.mkdirSync(FIXTURE_ROOT, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(FIXTURE_ROOT, `.build-${name}-`));
  try {
    return finishFixture(name, tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function finishFixture(name, tmp) {
  const manifest = { name, built: new Date().toISOString(), sources: {}, edits: {}, counts: {}, makeHash: "stand-in" };
  for (const kind of ["gameplay", "frontend"]) {
    const src = sourcesOf(name)[kind];
    const stat = fs.statSync(src);
    manifest.sources[kind] = { path: src, mtimeMs: stat.mtimeMs, size: stat.size };
    const dest = path.join(tmp, `${kind}.sqlite`);
    copySource(src, dest);
    const db = openDb(dest);
    try {
      db.exec("BEGIN");
      const cleaned = cleanProbeLeftovers(db, kind);
      const edit = EDITS[name][kind](db) || {};
      db.exec("COMMIT");
      const fk = foreignKeyCheck(db);
      manifest.edits[kind] = { cleanedProbeLeftovers: cleaned, ...edit };
      manifest.counts[kind] = { ...counts(db, kind), fkRows: fk.rows.length, fkErrorTables: Object.keys(fk.errors) };
    } finally {
      db.close();
    }
  }
  fs.writeFileSync(path.join(tmp, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  const final = fixturePaths(name).dir;
  fs.rmSync(final, { recursive: true, force: true });
  try {
    fs.renameSync(tmp, final);
  } catch (e) {
    // Another process built it at the same moment; keep theirs.
    fs.rmSync(tmp, { recursive: true, force: true });
    if (!fs.existsSync(final)) throw e;
  }
  return manifest;
}

export function ensureFixtures(names = FIXTURES, { force = false } = {}) {
  const built = [];
  for (const name of names) {
    if (force || !isFresh(name)) {
      buildFixture(name);
      built.push(name);
    }
  }
  return built;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const force = process.argv.includes("--force");
  const built = ensureFixtures(FIXTURES, { force });
  for (const name of FIXTURES) {
    const m = JSON.parse(fs.readFileSync(fixturePaths(name).manifest, "utf8"));
    const mark = built.includes(name) ? "built" : "fresh";
    console.log(`${mark} ${name}: ${JSON.stringify(m.counts)} edits ${JSON.stringify(m.edits)}`);
  }
}
