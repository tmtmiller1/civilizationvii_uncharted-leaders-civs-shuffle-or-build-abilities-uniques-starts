// The mod's SQL uses only what the game's SQLite has and what CONTRACTS 5.1 allows; tests/SQLITE-FEATURES.md lists
// what it uses. The scanner is tests/_sqlite-features.mjs.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { FEATURES, foundTable, GAME_SQLITE, newerThanGame, scan, sqlFiles, stripSql } from "./_sqlite-features.mjs";

const byId = Object.fromEntries(FEATURES.map((f) => [f.id, f]));
const hit = (id, sql) => {
  const f = byId[id];
  const text = stripSql(sql);
  return f.test ? f.test(text) : f.re.test(text);
};

test("the scanner finds what it should and skips comments and strings", () => {
  assert.ok(hit("window", "SELECT ROW_NUMBER() OVER (ORDER BY x) FROM t"));
  assert.ok(!hit("window", "SELECT 'ROW_NUMBER() OVER (' FROM t -- RANK() OVER ("));
  assert.ok(hit("random", "SELECT random()"));
  assert.ok(hit("real", "SELECT 0.5 * x"));
  assert.ok(!hit("real", "SELECT CAST(a / b AS INTEGER) FROM t"));
  assert.ok(hit("update-from", "UPDATE t SET a = s.a FROM s WHERE s.id = t.id;"));
  assert.ok(!hit("update-from", "UPDATE t SET a = (SELECT a FROM s WHERE s.id = t.id) WHERE id IN (SELECT id FROM s);"));
  assert.ok(hit("upsert", "INSERT INTO t VALUES (1) ON CONFLICT (id) DO NOTHING;"));
  assert.ok(hit("correlated", "SELECT (SELECT COUNT(*) FROM t b WHERE b.id < a.id) FROM t a"));
  assert.ok(hit("cte", "WITH x AS (SELECT 1) SELECT * FROM x"));
  assert.ok(hit("string-agg", "SELECT string_agg(x, ',') FROM t"));
});

test("no SQL file uses a feature CONTRACTS 5.1 rules out", () => {
  const found = scan();
  const bad = FEATURES.filter((f) => f.forbidden && found[f.id]).map((f) => `${f.label}: ${found[f.id].join(", ")}`);
  assert.deepEqual(bad, []);
});

test(`no SQL file uses a feature newer than the game's SQLite (${GAME_SQLITE})`, () => {
  const found = scan();
  const bad = FEATURES.filter((f) => newerThanGame(f) && found[f.id]).map((f) => `${f.label} (${f.since}): ${found[f.id].join(", ")}`);
  assert.deepEqual(bad, []);
});

test("tests/SQLITE-FEATURES.md lists what the SQL uses now", () => {
  const doc = fs.readFileSync("tests/SQLITE-FEATURES.md", "utf8");
  assert.ok(doc.includes(foundTable()), `the table is out of date (${sqlFiles().length} SQL files): run node tests/_sqlite-features.mjs --write`);
});
