// Rewrites shared/lshuf-known-civs.js from the frontend Civilizations table of the saved database set
// (tests/fixtures/source-db/frontend-copy.sqlite, or LSHUF_DEBUG_DIR). Run: node scripts/generate/known-civs.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dir = process.env.LSHUF_DEBUG_DIR || path.join(root, "tests", "fixtures", "source-db");
const db = new DatabaseSync(path.join(dir, "frontend-copy.sqlite"), { readOnly: true });
const civs = db
  .prepare("SELECT CivilizationType FROM Civilizations WHERE CivilizationType <> 'RANDOM' GROUP BY 1 ORDER BY 1")
  .all()
  .map((r) => r.CivilizationType);
db.close();
const text = `// The civilizations the mod knows by name: it ships per-civilization action groups (the builder's civ and its start
// terrain card) only for these. Every CivilizationType in the frontend Civilizations table of the 1.5.0 databases
// (tests/fixtures/source-db/frontend-copy.sqlite, all three ages, 2026-11-06). Regenerate with
// node scripts/generate/known-civs.mjs. A civ here that a player's database lacks (a DLC they don't own) is skipped
// by every query that selects through the game's own tables.

export const KNOWN_CIVS = [
${civs.map((c) => `  "${c}"`).join(",\n")}
];
`;
fs.writeFileSync(path.join(root, "shared", "lshuf-known-civs.js"), text);
console.log(`wrote ${civs.length} civilizations`);
