// Loads data/schema/gameplay-tables.sql plus data/mapping/lshuf-mapping.sql into an in-memory DB twice (the
// mapping must be idempotent), counts the rows, and checks the shapes CONTRACTS.md 4.3 sets. Exits 1 on any
// failure. Usage: node scripts/mapping/selfcheck.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { pieceId, splitTags, biasTableOfTag } from "../../shared/lshuf-constants.js";
import { KNOWN_LEADERS, isModdedLeader, moddedEntry } from "../../shared/lshuf-known-leaders.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const schema = readFileSync(join(ROOT, "data", "schema", "gameplay-tables.sql"), "utf8");
const mapping = readFileSync(join(ROOT, "data", "mapping", "lshuf-mapping.sql"), "utf8");
const TABLES = ["LShufMapping", "LShufMappingModifiers", "LShufMappingUnlocks", "LShufReviewedSets"];

const failures = [];
const fail = (msg) => failures.push(msg);

const db = new DatabaseSync(":memory:");
const counts = [];
for (let pass = 1; pass <= 2; pass++) {
  db.exec(schema);
  db.exec(mapping);
  counts.push(Object.fromEntries(TABLES.map((t) => [t, db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n])));
}
console.log("after pass 1:", JSON.stringify(counts[0]));
console.log("after pass 2:", JSON.stringify(counts[1]));
for (const t of TABLES) if (counts[0][t] !== counts[1][t]) fail(`${t}: ${counts[0][t]} rows after one load, ${counts[1][t]} after two`);

// No foreign keys from the mod's tables to game tables (the file has to run in config too).
for (const t of TABLES) {
  const fks = db.prepare(`PRAGMA foreign_key_list(${t})`).all();
  if (fks.length) fail(`${t} has foreign keys: ${JSON.stringify(fks)}`);
}

const pieces = db.prepare("SELECT * FROM LShufMapping").all();
const byId = new Map(pieces.map((p) => [p.PieceId, p]));
for (const p of pieces) {
  if (!KNOWN_LEADERS.includes(p.LeaderType)) fail(`${p.PieceId}: ${p.LeaderType} isn't a known leader`);
  if (p.Kind === "bullet") {
    if (p.PieceId !== pieceId.bullet(p.LeaderType, p.BulletIndex)) fail(`${p.PieceId}: id doesn't match pieceId.bullet`);
    if (!p.BulletText) fail(`${p.PieceId}: no BulletText`);
  } else if (p.Kind === "agenda") {
    if (p.PieceId !== pieceId.agenda(p.LeaderType)) fail(`${p.PieceId}: id doesn't match pieceId.agenda`);
    if (p.BulletIndex !== null) fail(`${p.PieceId}: agenda with a BulletIndex`);
  } else fail(`${p.PieceId}: Kind ${p.Kind}`);
  if (!(p.Value >= 1 && p.Value <= 5)) fail(`${p.PieceId}: Value ${p.Value}`);
  if (p.Reviewed !== 0) fail(`${p.PieceId}: Reviewed ${p.Reviewed}`);
  if (![0, 1].includes(p.Guess) || ![0, 1].includes(p.Movable)) fail(`${p.PieceId}: Guess/Movable not 0/1`);
  if (p.BiasTags !== null) {
    if (!/^\|.+\|$/.test(p.BiasTags)) fail(`${p.PieceId}: BiasTags ${p.BiasTags} isn't |A|B|`);
    for (const t of splitTags(p.BiasTags)) if (!biasTableOfTag(t)) fail(`${p.PieceId}: bias tag ${t} has no table`);
  }
  const modded = isModdedLeader(p.LeaderType);
  if (p.IsModded !== (modded ? 1 : 0)) fail(`${p.PieceId}: IsModded ${p.IsModded}`);
  if (modded && p.ModId !== moddedEntry(p.LeaderType).modId) fail(`${p.PieceId}: ModId ${p.ModId}`);
  if (!modded && p.ModId !== null) fail(`${p.PieceId}: vanilla with a ModId`);
}
// Bullet indexes run 1..n with no gaps per leader.
const bulletsByLeader = {};
for (const p of pieces.filter((x) => x.Kind === "bullet")) (bulletsByLeader[p.LeaderType] ||= []).push(p.BulletIndex);
for (const [L, list] of Object.entries(bulletsByLeader)) {
  list.sort((a, b) => a - b);
  list.forEach((n, i) => n !== i + 1 && fail(`${L}: bullet indexes ${list.join(",")}`));
}

const mods = db.prepare("SELECT * FROM LShufMappingModifiers").all();
const seen = new Map();
for (const m of mods) {
  const p = byId.get(m.PieceId);
  if (!p) fail(`modifier ${m.ModifierId} on missing piece ${m.PieceId}`);
  if (!["effect", "hidden", "agenda"].includes(m.Role)) fail(`${m.PieceId} ${m.ModifierId}: Role ${m.Role}`);
  if (p && (m.Role === "agenda") !== (p.Kind === "agenda")) fail(`${m.PieceId} ${m.ModifierId}: Role ${m.Role} on a ${p.Kind} piece`);
  const key = `${p ? p.LeaderType : "?"}:${m.ModifierId}`;
  if (seen.has(key)) fail(`${m.ModifierId} sits in both ${seen.get(key)} and ${m.PieceId}`);
  seen.set(key, m.PieceId);
}

const unlocks = db.prepare("SELECT * FROM LShufMappingUnlocks").all();
for (const u of unlocks) if (u.PieceId && !byId.has(u.PieceId)) fail(`unlock ${u.ProgressionTreeNodeType}: PieceId ${u.PieceId} missing`);

for (const r of db.prepare("SELECT * FROM LShufReviewedSets").all()) {
  const list = splitTags(r.ModifierSet);
  const sorted = [...list].sort();
  if (list.join("|") !== sorted.join("|")) fail(`${r.AbilityTrait}: ModifierSet not sorted`);
}

const summary = {
  pieces: pieces.length,
  bullets: pieces.filter((p) => p.Kind === "bullet").length,
  agenda: pieces.filter((p) => p.Kind === "agenda").length,
  guesses: pieces.filter((p) => p.Guess === 1).length,
  movable0: pieces.filter((p) => p.Movable === 0).length,
  specificTo: pieces.filter((p) => p.SpecificTo).length,
  leaders: new Set(pieces.map((p) => p.LeaderType)).size,
  unlocksWithPiece: unlocks.filter((u) => u.PieceId).length
};
console.log("checks:", JSON.stringify(summary));
if (failures.length) {
  for (const f of failures) console.log("FAIL", f);
  process.exit(1);
}
console.log("ok");
