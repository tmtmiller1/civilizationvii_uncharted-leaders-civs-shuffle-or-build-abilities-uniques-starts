// Writes data/text-generated/lshuf-piece-text.sql: one LOC_LSHUF_PIECE_<PieceId> per bullet piece (CONTRACTS.md 8).
//
//   node scripts/setup-copy/build-piece-text.mjs [--loc PATH] [--no-check]
//
// The SQL doesn't carry any text. Each statement splits the source ability's description out of the live
// LocalizedText at load time, in every language the localization database holds, with the splitBullets() rule from
// shared/lshuf-text.js: bullet n is the n-th non-empty, trimmed piece between [LI] markers after the first [LI], up to
// the first [/BLIST]. So another mod's rewritten description is the text that gets split.
//
// The piece list comes from LShufMapping (data/mapping/lshuf-mapping.sql, workstream A) when that file exists; until
// then it's every bullet of each base game and DLC ability, counted on its live English text in
// Debug/localization-copy.sqlite. The description key of each ability comes from data/setup-copy/setup-copy.sql.
// Rerun after either file changes.
//
// The check loads the output into a copy of localization-copy.sqlite and compares every English piece with
// bulletAt() in JS.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { splitBullets, bulletAt } from "../../shared/lshuf-text.js";
import { pieceId } from "../../shared/lshuf-constants.js";
import { VANILLA_LEADERS, MODDED_LEADERS } from "../../shared/lshuf-known-leaders.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEBUG = path.join(os.homedir(), "Library/Application Support/Civilization VII/Debug");
const args = process.argv.slice(2);
const argOf = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const LOC_DB = argOf("--loc", path.join(DEBUG, "localization-copy.sqlite"));
const MAPPING = path.join(ROOT, "data/mapping/lshuf-mapping.sql");
const SETUP_COPY = path.join(ROOT, "data/setup-copy/setup-copy.sql");
const OUT = path.join(ROOT, "data/text-generated/lshuf-piece-text.sql");
const MODS_ROOT = argOf("--mods-root", "/Volumes/tp-share/Repos_Mine/civilization_vii_reference_mods");

const LI = "'[LI]'";
const WS = "' ' || char(9) || char(10) || char(13)";
const quote = (s) => `'${String(s).replace(/'/g, "''")}'`;

// The text after the first [LI], up to the first [/BLIST] after it (or the end), as an SQL expression over Text.
const AFTER = `substr(Text, instr(Text, ${LI}) + 4)`;
const BODY = `CASE WHEN instr(${AFTER}, '[/BLIST]') > 0 THEN substr(${AFTER}, 1, instr(${AFTER}, '[/BLIST]') - 1) `
  + `ELSE ${AFTER} END`;
const SEG = `substr(rest, 1, instr(rest, ${LI}) - 1)`;

// A piece's text: its bullet, or its bullets joined with [N] when it covers several (BulletCount > 1).
function pieceStatement(piece) {
  const first = Number(piece.BulletIndex);
  const last = first + Math.max(1, Number(piece.BulletCount || 1)) - 1;
  return [
    `-- ${piece.PieceId}: bullet${last > first ? `s ${first}-${last}` : ` ${first}`} of ${piece.DescriptionKey}`,
    "WITH RECURSIVE seg(Language, rest, piece, n) AS (",
    `  SELECT Language, (${BODY}) || ${LI}, NULL, 0 FROM LocalizedText`,
    `  WHERE Tag = ${quote(piece.DescriptionKey)} AND instr(Text, ${LI}) > 0`,
    "  UNION ALL",
    `  SELECT Language, substr(rest, instr(rest, ${LI}) + 4), trim(${SEG}, ${WS}),`,
    `    n + (trim(${SEG}, ${WS}) <> '')`,
    `  FROM seg WHERE instr(rest, ${LI}) > 0`,
    ")",
    "INSERT OR REPLACE INTO LocalizedText (Language, Tag, Text)",
    `SELECT Language, ${quote(`LOC_LSHUF_PIECE_${piece.PieceId}`)}, group_concat(piece, '[N]') FROM`,
    `  (SELECT Language, piece, n FROM seg WHERE n BETWEEN ${first} AND ${last} AND piece <> '' ORDER BY Language, n)`,
    "GROUP BY Language;"
  ].join("\n");
}

function readSql(db, file) {
  db.exec(fs.readFileSync(file, "utf8"));
}

// Description key per ability trait, from the setup copy (base game, DLC and the listed modded leaders).
function abilityKeys() {
  const db = new DatabaseSync(":memory:");
  readSql(db, path.join(ROOT, "data/schema/gameplay-tables.sql"));
  readSql(db, path.join(ROOT, "data/schema/frontend-tables.sql"));
  readSql(db, SETUP_COPY);
  const rows = db.prepare(
    "SELECT lt.LeaderType, t.TraitType, t.Description FROM LShufSetup_LeaderTraits lt "
    + "JOIN LShufSetup_Traits t ON t.TraitType = lt.TraitType WHERE t.Name IS NOT NULL ORDER BY lt.LeaderType"
  ).all();
  db.close();
  return rows;
}

function piecesFromMapping(keys) {
  const db = new DatabaseSync(":memory:");
  readSql(db, path.join(ROOT, "data/schema/gameplay-tables.sql"));
  readSql(db, MAPPING);
  const rows = db.prepare(
    "SELECT PieceId, LeaderType, AbilityTrait, BulletIndex, BulletCount FROM LShufMapping WHERE Kind = 'bullet' "
    + "AND BulletIndex IS NOT NULL ORDER BY PieceId"
  ).all();
  db.close();
  const byTrait = new Map(keys.map((k) => [k.TraitType, k.Description]));
  const missing = rows.filter((r) => !byTrait.has(r.AbilityTrait));
  return {
    pieces: rows
      .filter((r) => byTrait.has(r.AbilityTrait))
      .map((r) => ({ ...r, DescriptionKey: byTrait.get(r.AbilityTrait) })),
    notes: missing.map((r) => `${r.PieceId}: ability ${r.AbilityTrait} isn't in the setup copy, no text generated`)
  };
}

function piecesFromBulletCounts(keys, loc) {
  const pieces = [];
  const notes = [];
  const read = loc.prepare("SELECT Text FROM LocalizedText WHERE Language = 'en_US' AND Tag = ?");
  for (const k of keys.filter((row) => VANILLA_LEADERS.includes(row.LeaderType))) {
    const text = read.get(k.Description)?.Text;
    const count = splitBullets(text).bullets.length;
    if (!count) notes.push(`${k.LeaderType}: ${k.Description} has no [LI] bullets`);
    for (let i = 1; i <= count; i++) {
      pieces.push({ PieceId: pieceId.bullet(k.LeaderType, i), LeaderType: k.LeaderType, AbilityTrait: k.TraitType,
        BulletIndex: i, DescriptionKey: k.Description });
    }
  }
  return { pieces, notes };
}

const XML_ENTITIES = { "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": "\"", "&apos;": "'" };
const unescapeXml = (s) => s.replace(/&(lt|gt|amp|quot|apos);/g, (m) => XML_ENTITIES[m]);

// English text rows for the listed modded leaders' description keys, read from their mods' files on tp-share, so the
// check covers their pieces too (they aren't in the Debug localization copy). Only en_us files are read.
function moddedEnglish(keys) {
  const found = new Map();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.xml$/i.test(entry.name) && /en_us/i.test(full)) {
        const text = fs.readFileSync(full, "utf8");
        const rows = /<(?:Row|Replace)\s+Tag="([^"]+)"[^>]*>\s*<Text>([\s\S]*?)<\/Text>/g;
        for (let m = rows.exec(text); m; m = rows.exec(text)) {
          if (keys.has(m[1]) && !found.has(m[1])) found.set(m[1], unescapeXml(m[2]));
        }
      }
    }
  };
  if (!fs.existsSync(MODS_ROOT)) return found;
  for (const folder of new Set(MODDED_LEADERS.map((m) => m.workshopId))) {
    const dir = path.join(MODS_ROOT, folder);
    if (fs.existsSync(dir)) walk(dir);
  }
  return found;
}

function check(sqlText, pieces) {
  const tmp = path.join(os.tmpdir(), `lshuf-piece-check-${process.pid}.sqlite`);
  fs.copyFileSync(LOC_DB, tmp);
  const db = new DatabaseSync(tmp);
  try {
    const add = db.prepare("INSERT OR IGNORE INTO LocalizedText (Language, Tag, Text) VALUES ('en_US', ?, ?)");
    const modded = moddedEnglish(new Set(pieces.map((p) => p.DescriptionKey)));
    for (const [tag, text] of modded) add.run(tag, text);
    db.exec(sqlText);
    db.exec(sqlText); // twice: INSERT OR REPLACE keeps it exact
    const get = db.prepare("SELECT Text FROM LocalizedText WHERE Language = ? AND Tag = ?");
    const langs = db.prepare("SELECT COUNT(*) AS n FROM LocalizedText WHERE Tag LIKE 'LOC_LSHUF_PIECE_%'").get().n;
    let same = 0;
    const wrong = [];
    const noSource = [];
    for (const p of pieces) {
      const source = get.get("en_US", p.DescriptionKey)?.Text;
      if (!source) noSource.push(p.PieceId);
      const count = Math.max(1, Number(p.BulletCount || 1));
      const parts = [];
      for (let i = 0; i < count; i++) parts.push(bulletAt(source, Number(p.BulletIndex) + i));
      const want = parts.filter(Boolean).join("[N]");
      const got = get.get("en_US", `LOC_LSHUF_PIECE_${p.PieceId}`)?.Text || "";
      if (!want && !got) wrong.push(`${p.PieceId}: no bullet ${p.BulletIndex} in the English text`);
      else if (want === got) same++;
      else wrong.push(`${p.PieceId}: SQL ${JSON.stringify(got.slice(0, 60))} vs JS ${JSON.stringify(want.slice(0, 60))}`);
    }
    return { same, wrong, rows: langs, modded: modded.size, noSource };
  } finally {
    db.close();
    fs.rmSync(tmp, { force: true });
  }
}

function main() {
  const keys = abilityKeys();
  const fromMapping = fs.existsSync(MAPPING);
  const loc = new DatabaseSync(LOC_DB, { readOnly: true });
  const { pieces, notes } = fromMapping ? piecesFromMapping(keys) : piecesFromBulletCounts(keys, loc);
  loc.close();
  const source = fromMapping
    ? "the bullet pieces in data/mapping/lshuf-mapping.sql"
    : "every bullet of the 38 base game and DLC abilities, counted on live English (the mapping file wasn't there yet)";
  const header = [
    "-- Generated by scripts/setup-copy/build-piece-text.mjs; don't edit by hand. Rerun after the mapping or the setup",
    `-- copy changes. Pieces: ${source}.`,
    "-- Each statement splits the live description in every language present with the splitBullets() rule",
    "-- (shared/lshuf-text.js), so another mod's rewritten text is the text that gets split. Loaded by UpdateText."
  ].join("\n");
  const sqlText = `${header}\n\n${pieces.map(pieceStatement).join("\n\n")}\n`;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, sqlText);
  console.log(`wrote ${OUT}: ${pieces.length} pieces from ${fromMapping ? "the mapping" : "bullet counts"}`);
  for (const n of notes) console.log(`note: ${n}`);
  if (args.includes("--no-check")) return 0;
  const result = check(sqlText, pieces);
  console.log(`check: ${result.modded} modded descriptions added from tp-share en_us files; `
    + `${result.rows} LOC_LSHUF_PIECE rows after loading twice into a copy of ${path.basename(LOC_DB)}`);
  if (result.noSource.length) console.log(`check: no English source text for ${result.noSource.join(", ")}`);
  console.log(`check: ${result.same} of ${pieces.length} English pieces match bulletAt() in JS`);
  for (const w of result.wrong.slice(0, 20)) console.log(`  differs: ${w}`);
  return result.wrong.length ? 1 : 0;
}

process.exit(main());
