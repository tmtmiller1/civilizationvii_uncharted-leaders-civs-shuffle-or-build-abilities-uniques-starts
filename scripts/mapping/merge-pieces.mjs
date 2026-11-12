// Merges bullets that one effect serves together into one piece, so no piece can be dealt that does nothing on its
// own, and marks every row reviewed. Runs after build-mapping.mjs and rewrites data/mapping/lshuf-mapping.sql.
//
//   node scripts/mapping/merge-pieces.mjs
//
// Rule: a bullet piece with Movable = 0 (the draft's "dealt alone it does nothing") joins the nearest earlier bullet
// piece of the same leader: that piece's BulletCount grows, the texts join with [N], the bias tags and any modifiers
// move over, and the merged row goes. Everything else is written back as it was, with Reviewed = 1.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCHEMA = path.join(ROOT, "data/schema/gameplay-tables.sql");
const MAPPING = path.join(ROOT, "data/mapping/lshuf-mapping.sql");

const TABLES = {
  LShufMapping: ["PieceId", "LeaderType", "AbilityTrait", "Kind", "BulletIndex", "BulletCount", "BulletList", "BulletText", "BiasTags",
    "Value", "SpecificTo", "Movable", "Reviewed", "Guess", "IsModded", "ModId", "Note"],
  LShufMappingModifiers: ["PieceId", "ModifierId", "Role"],
  LShufMappingUnlocks: null,
  LShufReviewedSets: ["AbilityTrait", "ModifierSet"]
};

const sqlValue = (v) => (v == null ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

function insertRows(table, columns, rows, chunk = 40) {
  const out = [];
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    out.push(`INSERT OR IGNORE INTO ${table} (${columns.join(", ")}) VALUES\n${part
      .map((r) => `  (${columns.map((c) => sqlValue(r[c])).join(", ")})`).join(",\n")};`);
  }
  return out.join("\n");
}

const joinTags = (a, b) => {
  const set = new Set([...String(a || "").split("|"), ...String(b || "").split("|")].filter(Boolean));
  return set.size ? `|${[...set].join("|")}|` : null;
};

function merge(db) {
  const merged = [];
  const dependents = db.prepare(
    "SELECT * FROM LShufMapping WHERE Kind = 'bullet' AND Movable = 0 ORDER BY LeaderType, BulletIndex"
  ).all();
  for (const d of dependents) {
    const target = db.prepare(
      "SELECT * FROM LShufMapping WHERE Kind = 'bullet' AND LeaderType = ? AND BulletIndex < ? AND PieceId <> ? "
      + "ORDER BY BulletIndex DESC LIMIT 1"
    ).get(d.LeaderType, d.BulletIndex, d.PieceId);
    if (!target) continue;
    const contiguous = Number(target.BulletIndex) + Number(target.BulletCount) === Number(d.BulletIndex);
    if (!contiguous) continue;
    db.prepare(
      "UPDATE LShufMapping SET BulletCount = BulletCount + 1, BulletText = BulletText || '[N]' || ?, BiasTags = ?, "
      + "Value = Value + ?, Note = COALESCE(Note || ' ', '') || ? WHERE PieceId = ?"
    ).run(d.BulletText || "", joinTags(target.BiasTags, d.BiasTags), Math.max(0, Number(d.Value) - 1),
      `Bullet ${d.BulletIndex} merged in: one effect serves both.`, target.PieceId);
    db.prepare("UPDATE OR IGNORE LShufMappingModifiers SET PieceId = ? WHERE PieceId = ?").run(target.PieceId, d.PieceId);
    db.prepare("DELETE FROM LShufMappingModifiers WHERE PieceId = ?").run(d.PieceId);
    db.prepare("DELETE FROM LShufMapping WHERE PieceId = ?").run(d.PieceId);
    merged.push(`${d.PieceId} -> ${target.PieceId}`);
  }
  db.exec("UPDATE LShufMapping SET Reviewed = 1");
  return merged;
}

// Pieces that need another piece of the same leader to do anything, merged into it even when other bullets sit
// between them (CONTRACTS 23 R5). The merged piece lists its bullets in BulletList.
const NEEDS = [
  { piece: "LEADER_YI_SUN_SIN__B03", into: "LEADER_YI_SUN_SIN__B01", why: "its Fleet Commanders come from bullet 1 in Antiquity" },
  { piece: "LEADER_YI_SUN_SIN__B04", into: "LEADER_YI_SUN_SIN__B01", why: "its Fleet Commanders come from bullet 1 in Antiquity" }
];
// Unlock rows that ride with one piece rather than with whoever holds most of the ability (CONTRACTS 23 R5).
const PINNED_UNLOCKS = [
  { node: "NODE_CIVIC_AQ_MAIN_DISCIPLINE", target: "UNIT_FLEET_COMMANDER", piece: "LEADER_YI_SUN_SIN__B01" }
];

const bulletsOf = (p) => (p.BulletList
  ? String(p.BulletList).split("|").map(Number)
  : Array.from({ length: Math.max(1, Number(p.BulletCount || 1)) }, (_, i) => Number(p.BulletIndex) + i));

function mergeNeeds(db) {
  const merged = [];
  for (const n of NEEDS) {
    const d = db.prepare("SELECT * FROM LShufMapping WHERE PieceId = ?").get(n.piece);
    const target = db.prepare("SELECT * FROM LShufMapping WHERE PieceId = ?").get(n.into);
    if (!d || !target) continue;
    const list = [...new Set([...bulletsOf(target), ...bulletsOf(d)])].sort((a, b) => a - b);
    const contiguous = list.every((b, i) => b === list[0] + i);
    db.prepare(
      "UPDATE LShufMapping SET BulletCount = ?, BulletList = ?, BulletText = BulletText || '[N]' || ?, BiasTags = ?, "
      + "Value = Value + ?, Note = COALESCE(Note || ' ', '') || ? WHERE PieceId = ?"
    ).run(list.length, contiguous ? null : list.join("|"), d.BulletText || "", joinTags(target.BiasTags, d.BiasTags),
      Math.max(0, Number(d.Value) - 1), `Bullet ${d.BulletIndex} merged in: ${n.why}.`, target.PieceId);
    db.prepare("UPDATE OR IGNORE LShufMappingModifiers SET PieceId = ? WHERE PieceId = ?").run(target.PieceId, d.PieceId);
    db.prepare("DELETE FROM LShufMappingModifiers WHERE PieceId = ?").run(d.PieceId);
    db.prepare("DELETE FROM LShufMapping WHERE PieceId = ?").run(d.PieceId);
    merged.push(`${d.PieceId} -> ${target.PieceId}`);
  }
  for (const u of PINNED_UNLOCKS) {
    db.prepare("UPDATE LShufMappingUnlocks SET PieceId = ? WHERE ProgressionTreeNodeType = ? AND TargetType = ?")
      .run(u.piece, u.node, u.target);
  }
  return merged;
}

function columnsOf(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
}

function main() {
  const db = new DatabaseSync(":memory:");
  db.exec(fs.readFileSync(SCHEMA, "utf8"));
  db.exec(fs.readFileSync(MAPPING, "utf8"));
  const merged = [...merge(db), ...mergeNeeds(db)];
  const header = fs.readFileSync(MAPPING, "utf8").split("\n").filter((l) => l.startsWith("--") && !l.startsWith("-- Merged by"));
  const parts = [header.join("\n"), `-- Merged by scripts/mapping/merge-pieces.mjs: ${merged.length} piece(s) joined, every row Reviewed = 1.`, ""];
  for (const [table, cols] of Object.entries(TABLES)) {
    const columns = cols || columnsOf(db, table);
    const rows = db.prepare(`SELECT ${columns.join(", ")} FROM ${table} ORDER BY 1, 2`).all();
    if (rows.length) parts.push(insertRows(table, columns, rows), "");
  }
  fs.writeFileSync(MAPPING, parts.join("\n"));
  db.close();
  console.log(merged.length ? merged.join("\n") : "nothing to merge");
  console.log(`wrote ${path.relative(ROOT, MAPPING)}`);
}

main();
