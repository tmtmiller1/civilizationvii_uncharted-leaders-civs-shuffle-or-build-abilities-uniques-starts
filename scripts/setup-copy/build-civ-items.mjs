// Writes the civilization cards for all three ages (CONTRACTS 14, 18, 19):
//   data/setup-copy/setup-copy-civ.sql   LShufSetup_CivItems and LShufSetup_CivCivics for the civ build screen
//   shared/lshuf-known-civ-items.js      the card list the mod ships one action group per card for
//
//   node scripts/setup-copy/build-civ-items.mjs
//
// Antiquity comes from the saved compiled database (tests/fixtures/source-db, or LSHUF_DEBUG_DIR); Exploration and
// Modern from the game's own data files for those ages (scripts/mapping/civ-age-source.mjs), since the saved
// database is an Antiquity game. The same rules as shared/deal/lshuf-deal-input.js civItemsFromTables: one card per
// unit family, and a unit family or improvement only the civ's own civics tree unlocks belongs to the civics card.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { ageSource, civsOfAge } from "../mapping/civ-age-source.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEBUG_DIR = process.env.LSHUF_DEBUG_DIR || path.join(ROOT, "tests", "fixtures", "source-db");
const OUT_SQL = path.join(ROOT, "data/setup-copy/setup-copy-civ.sql");
const OUT_JS = path.join(ROOT, "shared/lshuf-known-civ-items.js");

const ESC = "ESCAPE '\\'";
const CIVIC_TREE = `n.ProgressionTree LIKE 'TREE\\_CIVICS\\_%' ${ESC} AND n.ProgressionTree NOT LIKE '%\\_MAIN' ${ESC}`;
const unlockedWhere = (cond) => `SELECT u.TargetType FROM ProgressionTreeNodeUnlocks u JOIN ProgressionTreeNodes n
  ON n.ProgressionTreeNodeType = u.ProgressionTreeNodeType WHERE ${cond}`;
const CIVIC_UNLOCKED = unlockedWhere(CIVIC_TREE);
const MAIN_UNLOCKED = unlockedWhere(`NOT (${CIVIC_TREE})`);
const family = (member, base) => `(${member} = ${base} OR ${member} LIKE ${base} || '\\_%' ${ESC})`;
// Every unit of a family only the civ's own civics unlock (CONTRACTS 18).
const CIVIC_UNITS = `SELECT f.UnitType FROM Units b JOIN Units f ON f.TraitType = b.TraitType AND ${family("f.UnitType", "b.UnitType")}
  WHERE NOT EXISTS (SELECT 1 FROM Units p WHERE p.TraitType = b.TraitType AND b.UnitType LIKE p.UnitType || '\\_%' ${ESC})
    AND EXISTS (SELECT 1 FROM Units m WHERE m.TraitType = b.TraitType AND ${family("m.UnitType", "b.UnitType")} AND m.UnitType IN (${CIVIC_UNLOCKED}))
    AND NOT EXISTS (SELECT 1 FROM Units m WHERE m.TraitType = b.TraitType AND ${family("m.UnitType", "b.UnitType")} AND m.UnitType IN (${MAIN_UNLOCKED}))`;
const CIVIC_IMPROVEMENTS = `SELECT ConstructibleType FROM Improvements WHERE ConstructibleType IN (${CIVIC_UNLOCKED})
  AND ConstructibleType NOT IN (${MAIN_UNLOCKED})`;
const BASE_UNITS = `SELECT u.UnitType AS t, u.Name AS n, u.Description AS d FROM Units u WHERE u.TraitType = ?
  AND NOT EXISTS (SELECT 1 FROM Units p WHERE p.TraitType = u.TraitType AND u.UnitType LIKE p.UnitType || '\\_%' ${ESC})
  AND u.UnitType NOT IN (${CIVIC_UNITS}) ORDER BY 1`;
const IMPROVEMENTS = `SELECT m.ConstructibleType AS t, c.Name AS n, c.Description AS d FROM Improvements m
  JOIN Constructibles c ON c.ConstructibleType = m.ConstructibleType
  WHERE m.TraitType = ? AND m.ConstructibleType NOT IN (${CIVIC_IMPROVEMENTS}) ORDER BY 1`;
// The civics tree a base trait reveals (CONTRACTS 18).
const CIV_TREE = `SELECT ma.Value AS tree FROM Modifiers m JOIN ModifierArguments ma ON ma.ModifierId = m.ModifierId
  AND ma.Name = 'ProgressionTreeType' JOIN RequirementSetRequirements rsr ON rsr.RequirementSetId = m.SubjectRequirementSetId
  JOIN Requirements r ON r.RequirementId = rsr.RequirementId JOIN RequirementArguments ra ON ra.RequirementId = r.RequirementId
  AND ra.Name = 'TraitType' WHERE r.RequirementType = 'REQUIREMENT_PLAYER_HAS_CIVILIZATION_OR_LEADER_TRAIT' AND ra.Value = ?
  AND ma.Value LIKE 'TREE\\_CIVICS\\_%' ${ESC} ORDER BY 1 LIMIT 1`;
// The tree's nodes and what they unlock, for the civics card: traditions and constructibles always, a unit only
// when its family belongs to the civics.
const CIVICS_ROWS = `SELECT n.ProgressionTreeNodeType AS node, n.Name AS nodeName, u.TargetType AS type, u.TargetKind AS kind,
    COALESCE((SELECT t.Name FROM Traditions t WHERE t.TraditionType = u.TargetType),
      (SELECT c.Name FROM Constructibles c WHERE c.ConstructibleType = u.TargetType),
      (SELECT q.Name FROM UniqueQuarters q WHERE q.UniqueQuarterType = u.TargetType),
      (SELECT un.Name FROM Units un WHERE un.UnitType = u.TargetType)) AS name
  FROM ProgressionTreeNodes n LEFT JOIN ProgressionTreeNodeUnlocks u ON u.ProgressionTreeNodeType = n.ProgressionTreeNodeType
    AND (u.TargetKind IN ('KIND_TRADITION', 'KIND_CONSTRUCTIBLE', 'KIND_QUARTER')
      OR (u.TargetKind = 'KIND_UNIT' AND u.TargetType IN (${CIVIC_UNITS})))
  WHERE n.ProgressionTree = ? ORDER BY 1, 4, 3`;

// Antiquity's civs from the saved database: every civ with an ability trait whose youngest age is Antiquity (or
// that no age lists).
function antiquityCivs(db) {
  return db.prepare(`SELECT ct.CivilizationType AS civ, MIN(ct.TraitType) AS trait,
      (SELECT MIN(lc.Age) FROM LegacyCivilizations lc WHERE lc.CivilizationType = ct.CivilizationType) AS age
    FROM CivilizationTraits ct
    WHERE ct.TraitType LIKE 'TRAIT\\_%\\_ABILITY' ${ESC} AND ct.CivilizationType IN (SELECT CivilizationType FROM Civilizations)
    GROUP BY ct.CivilizationType ORDER BY ct.CivilizationType`).all()
    .filter((c) => c.age == null || c.age === "AGE_ANTIQUITY").map((c) => ({ civ: c.civ, trait: c.trait, age: "AGE_ANTIQUITY" }));
}

// The civics tree a base trait reveals, from the tables (the compiled database) or, for an age read from the game's
// data files, from the GameEffects modifiers the loader keeps aside.
function treeFinder(db, source) {
  const fromTables = db.prepare(CIV_TREE);
  return (base) => {
    const row = fromTables.get(base);
    if (row) return row.tree;
    for (const m of source ? source.gameEffects.values() : []) {
      const tree = (m.args.find((a) => a.name === "ProgressionTreeType") || {}).value;
      if (!tree || !String(tree).startsWith("TREE_CIVICS_")) continue;
      const asks = (m.subject || []).some((r) => r.type === "REQUIREMENT_PLAYER_HAS_CIVILIZATION_OR_LEADER_TRAIT"
        && !r.inverse && (r.args || []).some((a) => a.name === "TraitType" && a.value === base));
      if (asks) return tree;
    }
    return null;
  };
}

// The tree's nodes with their prerequisites and depth (longest chain before the node), for the drawn tree.
function civicNodes(db, civ, tree) {
  const nodes = db.prepare("SELECT ProgressionTreeNodeType AS node, Name AS name, Cost AS cost FROM ProgressionTreeNodes WHERE ProgressionTree = ? ORDER BY 1").all(tree);
  const prereqs = new Map(nodes.map((n) => [n.node, []]));
  for (const r of db.prepare("SELECT Node AS node, PrereqNode AS pre FROM ProgressionTreePrereqs ORDER BY 1, 2").all()) {
    if (prereqs.has(r.node) && prereqs.has(r.pre)) prereqs.get(r.node).push(r.pre);
  }
  const depth = new Map();
  const depthOf = (node, seen = new Set()) => {
    if (depth.has(node)) return depth.get(node);
    if (seen.has(node)) return 0;
    seen.add(node);
    const d = prereqs.get(node).reduce((m, p) => Math.max(m, depthOf(p, seen) + 1), 0);
    depth.set(node, d);
    return d;
  };
  return nodes.map((n) => ({ civ, node: n.node, name: n.name, cost: n.cost, depth: depthOf(n.node), prereqs: prereqs.get(n.node).join("|") }));
}

// [{ civ, age, kind, type, nameKey, descKey, trait }] and the civics rows for one age's civs.
function itemsOf(db, civs, source = null) {
  const treeOf = treeFinder(db, source);
  const items = [];
  const civics = [];
  const nodes = [];
  for (const c of civs) {
    const base = c.trait.slice(0, -"_ABILITY".length);
    const push = (kind, type, nameKey, descKey, trait) => {
      items.push({ civ: c.civ, age: c.age, kind, type, nameKey, descKey, trait });
    };
    const ability = db.prepare("SELECT Name AS n, Description AS d FROM Traits WHERE TraitType = ?").get(c.trait) || {};
    push("ability", c.civ, ability.n, ability.d, c.trait);
    for (const u of db.prepare(BASE_UNITS).all(base)) push("unit", u.t, u.n, u.d, base);
    for (const i of db.prepare(IMPROVEMENTS).all(base)) push("improvement", i.t, i.n, i.d, base);
    const tree = treeOf(base);
    if (!tree) continue;
    const name = db.prepare("SELECT Name AS n FROM ProgressionTrees WHERE ProgressionTreeType = ?").get(tree);
    push("civics", tree, name ? name.n : null, null, base);
    for (const r of db.prepare(CIVICS_ROWS).all(tree)) civics.push({ civ: c.civ, ...r });
    nodes.push(...civicNodes(db, c.civ, tree));
  }
  return { items, civics, nodes };
}

const sqlValue = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
function inserts(table, cols, rows) {
  const out = [];
  for (let i = 0; i < rows.length; i += 200) {
    out.push(`INSERT INTO ${table} (${cols.join(", ")}) VALUES\n${rows.slice(i, i + 200).map((r) => `  (${r.map(sqlValue).join(", ")})`).join(",\n")};`);
  }
  return out;
}

export function buildCivItems() {
  const fixture = new DatabaseSync(path.join(DEBUG_DIR, "gameplay-copy.sqlite"), { readOnly: true });
  const all = { items: [], civics: [], nodes: [] };
  const add = (r) => (all.items.push(...r.items), all.civics.push(...r.civics), all.nodes.push(...r.nodes));
  add(itemsOf(fixture, antiquityCivs(fixture)));
  fixture.close();
  for (const age of ["AGE_EXPLORATION", "AGE_MODERN"]) {
    const { db, source } = ageSource(age);
    add(itemsOf(db, civsOfAge(age), source));
  }
  return all;
}

function writeOutputs({ items, civics, nodes }) {
  const sql = [
    "-- Generated by scripts/setup-copy/build-civ-items.mjs; don't edit by hand. Every civilization's cards for the civ",
    "-- build screen (CONTRACTS 14, 18, 19): Antiquity from the saved compiled database, Exploration and Modern from the",
    "-- game's data files for those ages. Loads after setup-copy.sql.",
    "", "DELETE FROM LShufSetup_CivItems;", "DELETE FROM LShufSetup_CivCivics;", "DELETE FROM LShufSetup_CivicNodes;",
    ...inserts("LShufSetup_CivItems", ["CivilizationType", "Age", "Kind", "Type", "NameKey", "DescKey", "TraitType"],
      items.map((i) => [i.civ, i.age, i.kind, i.type, i.nameKey, i.descKey, i.trait])),
    ...inserts("LShufSetup_CivCivics", ["CivilizationType", "NodeType", "NodeNameKey", "UnlockType", "UnlockKind", "UnlockNameKey"],
      civics.map((r) => [r.civ, r.node, r.nodeName, r.type, r.kind, r.name])),
    ...inserts("LShufSetup_CivicNodes", ["CivilizationType", "NodeType", "NameKey", "Cost", "Depth", "Prereqs"],
      nodes.map((n) => [n.civ, n.node, n.name, n.cost, n.depth, n.prereqs]))
  ];
  fs.writeFileSync(OUT_SQL, `${sql.join("\n")}\n`);
  const js = `// The civilization cards the mod knows by name (CONTRACTS 14, 18): each civilization's ability, its uniques (one
// card per unit family, improvements; a unit family or improvement only its own civics unlock rides with the civics
// card), and its unique civics. Antiquity from the saved compiled database (tests/fixtures/source-db), Exploration
// and Modern from the game's data files for those ages. Regenerate with node scripts/setup-copy/build-civ-items.mjs.
// A card whose civilization or type a player's database lacks is skipped by every query that selects through the
// game's own tables.

export const KNOWN_CIV_ITEMS = [
${items.map((i) => `  { civ: "${i.civ}", age: "${i.age}", kind: "${i.kind}", type: "${i.type}" }`).join(",\n")}
];
`;
  fs.writeFileSync(OUT_JS, js);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const all = buildCivItems();
  writeOutputs(all);
  const count = (kind) => all.items.filter((i) => i.kind === kind).length;
  const civs = new Set(all.items.map((i) => i.civ)).size;
  console.log(`wrote ${all.items.length} cards for ${civs} civilizations (${count("ability")} abilities, ${count("unit")} unit families, `
    + `${count("improvement")} improvements, ${count("civics")} civics), ${all.civics.length} civics rows and ${all.nodes.length} nodes`);
}
