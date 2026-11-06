// The same deal number gives the same deal: twice in JS, with the rows handed over in the other order, and twice
// through the SQL. Waits on workstream B (shared/deal/lshuf-deal.js, data/generated/) and A (the mapping).
import assert from "node:assert/strict";
import test from "node:test";

import { dealConfig, dealModule, gameConfig, loadGame, readTableFrom, sqlResult, assertSameResult, jsResult, rows } from "./_harness.mjs";
import { DEAL_MODES, loadForJs, reviewAll } from "./_deal.mjs";
import { MODE, SEED_MAX, SEED_MIN } from "../shared/lshuf-constants.js";

test("computeDeal: same input, same result; row order doesn't matter", async () => {
  const deal = await dealModule();
  assert.ok(Number.isInteger(deal.DEAL_VERSION), "DEAL_VERSION is an integer");
  for (const mode of DEAL_MODES) {
    const run = await loadForJs({ spec: { seed: 17, options: { Mode: mode } }, hooks: [reviewAll()] });
    try {
      const spec = { seed: 17, options: { Mode: mode } };
      const inputA = deal.buildDealInput(readTableFrom(run.pre), dealConfig(spec));
      const inputB = deal.buildDealInput(readTableFrom(run.pre), dealConfig(spec));
      assert.deepEqual(inputA, inputB, `${mode}: buildDealInput twice`);
      const a = jsResult(run.db, deal.computeDeal(inputA));
      const b = jsResult(run.db, deal.computeDeal(inputB));
      assertSameResult(a, b, `${mode}: computeDeal twice`);
      const inputR = deal.buildDealInput(readTableFrom(run.pre, { reverse: true }), dealConfig(spec));
      const reversed = jsResult(run.db, deal.computeDeal(inputR));
      assertSameResult(a, reversed, `${mode}: rows handed over in reverse order`);
    } finally {
      run.close();
    }
  }
});

test("the SQL: same deal number, same result rows; LShufResultMeta names them", async () => {
  const deal = await dealModule();
  for (const mode of [MODE.SwapAbilities, MODE.SplitMatched]) {
    for (const seed of [SEED_MIN, 99, SEED_MAX]) {
      const results = [];
      for (let i = 0; i < 2; i++) {
        const run = await loadGame({ config: gameConfig({ seed, options: { Mode: mode } }), hooks: [reviewAll()] });
        try {
          results.push(sqlResult(run.db));
          const meta = Object.fromEntries(rows(run.db, "SELECT Name, Value FROM LShufResultMeta").map((r) => [r.Name, r.Value]));
          assert.equal(String(meta.Seed), String(seed), `${mode}: LShufResultMeta Seed`);
          assert.equal(meta.Mode, mode, `${mode}: LShufResultMeta Mode`);
          assert.equal(String(meta.DealVersion), String(deal.DEAL_VERSION), `${mode}: LShufResultMeta DealVersion`);
        } finally {
          run.close();
        }
      }
      assertSameResult(results[0], results[1], `${mode} seed ${seed}`);
    }
  }
});

test("different deal numbers give different deals", async () => {
  const deal = await dealModule();
  const run = await loadForJs({ spec: { seed: 1, options: { Mode: MODE.SwapAbilities } } });
  try {
    const seen = new Set();
    for (let seed = 1; seed <= 8; seed++) {
      const config = dealConfig({ seed, options: { Mode: MODE.SwapAbilities } });
      const r = deal.computeDeal(deal.buildDealInput(readTableFrom(run.pre), config));
      seen.add(JSON.stringify(jsResult(run.db, r).leaders));
    }
    assert.ok(seen.size >= 7, `8 deal numbers gave ${seen.size} different deals`);
  } finally {
    run.close();
  }
});
