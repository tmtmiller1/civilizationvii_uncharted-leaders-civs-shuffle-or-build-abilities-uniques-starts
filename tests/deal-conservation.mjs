// Each deal number deals each ability piece and each attribute once and only once, and gives each leader back as many
// as it gave up (SPEC section 3, "Modes 3 and 4"). Checked on both runners' rows: the SQL for the sampled deal
// numbers, computeDeal for 1..32. With the mapping as shipped (Reviewed = 0, so the split modes deal whole abilities)
// and with every row reviewed (bullets). Waits on B and A.
import test from "node:test";

import { dealConfig, dealModule, gameConfig, jsResult, loadGame, readTableFrom, resultObjects, sqlResult } from "./_harness.mjs";
import {
  checkAttributesConserved,
  checkBulletsConserved,
  checkDealShape,
  DEAL_MODES,
  DEALINGS,
  loadForJs,
  reviewAll,
  SAMPLE_SEEDS,
  SPLIT_MODES
} from "./_deal.mjs";
import { MODE } from "../shared/lshuf-constants.js";

const JS_SEEDS = Array.from({ length: 32 }, (_, i) => i + 1);

function checkAll(result, ctx) {
  const shape = checkDealShape(result, ctx);
  const mode = ctx.spec.options.Mode;
  if (mode !== MODE.SwapAbilities) checkAttributesConserved(result, { ...ctx, attrPool: shape.attrPool });
  if (SPLIT_MODES.includes(mode) && ctx.reviewed) {
    checkBulletsConserved(result, { ...ctx, abilityPool: shape.abilityPool });
  }
}

for (const reviewed of [false, true]) {
  const hooks = reviewed ? [reviewAll()] : [];
  const tag = reviewed ? "mapping reviewed" : "mapping as shipped";

  test(`SQL rows: every piece and attribute dealt once (${tag})`, async () => {
    for (const mode of DEAL_MODES) {
      for (const Dealing of DEALINGS) {
        for (const seed of SAMPLE_SEEDS) {
          const spec = { seed, options: { Mode: mode, Dealing } };
          const run = await loadGame({ config: gameConfig(spec), hooks });
          try {
            const where = `SQL ${mode} ${Dealing} seed ${seed} (${tag})`;
            checkAll(resultObjects(run.db, sqlResult(run.db)), { pre: run.pre, spec, where, reviewed });
          } finally {
            run.close();
          }
        }
      }
    }
  });

  test(`computeDeal rows: every piece and attribute dealt once, seeds 1..32 (${tag})`, async () => {
    const deal = await dealModule();
    for (const mode of DEAL_MODES) {
      const run = await loadForJs({ spec: { seed: 1, options: { Mode: mode } }, hooks });
      try {
        for (const Dealing of DEALINGS) {
          for (const seed of JS_SEEDS) {
            const spec = { seed, options: { Mode: mode, Dealing } };
            const result = deal.computeDeal(deal.buildDealInput(readTableFrom(run.pre), dealConfig(spec)));
            const where = `JS ${mode} ${Dealing} seed ${seed} (${tag})`;
            checkAll(resultObjects(run.db, jsResult(run.db, result)), { pre: run.pre, spec, where, reviewed });
          }
        }
      } finally {
        run.close();
      }
    }
  });
}
