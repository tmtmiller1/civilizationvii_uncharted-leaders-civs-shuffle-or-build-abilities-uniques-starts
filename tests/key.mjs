// lshufKey in JavaScript gives the same number as lshufKeySql in SQLite, and every intermediate stays below 2^53.
import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { KEY_PRIME, lshufKey, lshufKeySql, SALT } from "../shared/lshuf-key.js";
import { SEED_MAX, SEED_MIN } from "../shared/lshuf-constants.js";

const SEEDS = [SEED_MIN, 2, 3, 17, 42, 127, 128, 199, 255, SEED_MAX];
const RANKS = [0, 1, 2, 5, 37, 63, 64, 199, 500, 999];

test("lshufKey matches lshufKeySql on literals", () => {
  const db = new DatabaseSync(":memory:");
  for (const seed of SEEDS) {
    for (const salt of Object.values(SALT)) {
      for (const rank of RANKS) {
        const sql = db.prepare(`SELECT ${lshufKeySql(seed, salt, rank)} AS k`).get().k;
        assert.equal(sql, lshufKey(seed, salt, rank), `seed ${seed} salt ${salt} rank ${rank}`);
      }
    }
  }
});

test("lshufKey matches lshufKeySql over columns, for every seed", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE s (seed INTEGER, salt INTEGER, rnk INTEGER)");
  const ins = db.prepare("INSERT INTO s VALUES (?, ?, ?)");
  db.exec("BEGIN");
  for (let seed = SEED_MIN; seed <= SEED_MAX; seed++) {
    for (const salt of Object.values(SALT)) for (const rank of [0, 1, 40, 300]) ins.run(seed, salt, rank);
  }
  db.exec("COMMIT");
  const got = db.prepare(`SELECT seed, salt, rnk, ${lshufKeySql("seed", "salt", "rnk")} AS k FROM s`).all();
  for (const r of got) assert.equal(r.k, lshufKey(r.seed, r.salt, r.rnk), JSON.stringify(r));
  assert.equal(got.length, (SEED_MAX - SEED_MIN + 1) * Object.keys(SALT).length * 4);
});

test("every intermediate value stays below 2^53", () => {
  const maxRank = 5000;
  const x0max = SEED_MAX * 7919 + Math.max(...Object.values(SALT)) * 104729 + maxRank * 1299709 + 1;
  assert.ok(x0max < Number.MAX_SAFE_INTEGER);
  assert.ok((KEY_PRIME - 1) * (KEY_PRIME - 1) + 1013904223 < Number.MAX_SAFE_INTEGER);
  for (const seed of SEEDS) {
    for (const rank of RANKS) {
      const k = lshufKey(seed, SALT.Pieces, rank);
      assert.ok(Number.isInteger(k) && k >= 0 && k < KEY_PRIME);
    }
  }
});

test("keys spread: no salt gives the same order of 40 items for two neighbouring seeds", () => {
  for (const salt of Object.values(SALT)) {
    const order = (seed) =>
      Array.from({ length: 40 }, (_, rank) => rank)
        .sort((a, b) => lshufKey(seed, salt, a) - lshufKey(seed, salt, b) || a - b)
        .join(",");
    assert.notEqual(order(1), order(2), `salt ${salt}`);
  }
});
