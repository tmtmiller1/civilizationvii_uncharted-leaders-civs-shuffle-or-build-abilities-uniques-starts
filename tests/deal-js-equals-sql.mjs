// computeDeal(buildDealInput(...)) gives the same rows as the deal SQL's LShufResult* tables (CONTRACTS 5.1), for the
// sampled deal numbers x every mode x the Off switches x Balanced / Pure chance, with the AI personality setting
// rotating through its three values. Then the reviewed mapping, a keep/left-out setup, and the other fixtures.
// LSHUF_TEST_SEEDS widens the sample. Waits on B and A.
import test from "node:test";

import { assertSameResult } from "./_harness.mjs";
import {
  CUSTOM_COMBOS, DEAL_MODES, DEALINGS, label, MODES, OFF_SETS, PERSONAS, reviewAll, runBoth, SAMPLE_SEEDS, SPLIT_MODES
} from "./_deal.mjs";

async function same(fixture, spec, hooks = []) {
  const r = await runBoth({ fixture, spec, hooks });
  try {
    assertSameResult(r.js, r.sql, `${label(fixture, spec)}: computeDeal vs SQL`);
  } finally {
    r.run.close();
  }
}

test("base fixture: seeds x modes x Off switches x dealing", async () => {
  let n = 0;
  for (const seed of SAMPLE_SEEDS) {
    for (const Mode of MODES) {
      for (const off of OFF_SETS) {
        for (const Dealing of DEALINGS) {
          const Personality = PERSONAS[n++ % PERSONAS.length];
          await same("base", { seed, options: { Mode, Dealing, Personality, ...off } });
        }
      }
    }
  }
});

test("base fixture, mapping reviewed: split modes deal bullets the same way in both", async () => {
  for (const seed of SAMPLE_SEEDS) {
    for (const Mode of SPLIT_MODES) {
      for (const Dealing of DEALINGS) {
        for (const Personality of PERSONAS) await same("base", { seed, options: { Mode, Dealing, Personality } }, [reviewAll()]);
      }
    }
  }
});

test("kept, left-out and not-in-game leaders", async () => {
  const lists = {
    kept: ["LEADER_AMINA", "LEADER_PACHACUTI"],
    excluded: ["LEADER_XERXES", "LEADER_CONFUCIUS"],
    notInGame: ["LEADER_ISABELLA", "LEADER_TECUMSEH", "LEADER_REMILIA"]
  };
  for (const Mode of DEAL_MODES) {
    for (const seed of SAMPLE_SEEDS) await same("base", { seed, options: { Mode, KeepMine: "1" }, ...lists });
  }
});

test("other fixtures: DLC leader removed, a leader added, an extra modifier", async () => {
  for (const fixture of ["dlc-removed", "added-leader", "extra-modifier"]) {
    for (const Mode of MODES) {
      await same(fixture, { seed: 17, options: { Mode } });
      if (SPLIT_MODES.includes(Mode)) await same(fixture, { seed: 17, options: { Mode } }, [reviewAll()]);
    }
  }
});

test("custom combinations of the three parts: computeDeal vs SQL", async () => {
  for (const seed of SAMPLE_SEEDS) {
    for (const combo of CUSTOM_COMBOS) {
      for (const Dealing of DEALINGS) await same("base", { seed, options: { ...combo, Dealing } });
    }
  }
});
