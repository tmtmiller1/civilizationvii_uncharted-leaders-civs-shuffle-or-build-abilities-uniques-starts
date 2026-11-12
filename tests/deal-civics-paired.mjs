// Civilization civics on Follows ability: the civics follow the ability cycle over the civs with a free tree, so
// nobody ends up with two trees and nobody is left without one, with or without a builder who swapped civics.
import assert from "node:assert/strict";
import test from "node:test";

import { assertSameResult } from "./_harness.mjs";
import { runBoth } from "./_deal.mjs";
import { followCycle } from "../shared/deal/lshuf-deal-civ.js";
import { BUILD, CA_MODE, CC_MODE, MODE } from "../shared/lshuf-constants.js";

test("followCycle steps over civs without a free tree", () => {
  const donors = { A: "B", B: "C", C: "D", D: "A" };
  assert.deepEqual(followCycle(donors, new Set(["A", "C", "D"])), { A: "C", C: "D", D: "A" });
  assert.deepEqual(followCycle(donors, new Set(["A"])), {});
  assert.deepEqual(followCycle({}, new Set(["A", "B"])), {});
});

const builder = { leader: "LEADER_AMINA", civ: "CIVILIZATION_ROME", pieces: [BUILD.civCivics("CIVILIZATION_GREECE")] };

for (const withBuilder of [false, true]) {
  test(`civics Follows ability gives each civ at most one tree${withBuilder ? " (builder swapped civics)" : ""}`, async () => {
    for (const seed of [1, 36, 37, 90]) {
      const spec = {
        seed, options: { Mode: MODE.SwapAbilities, CivAbilities: CA_MODE.Swapped, CivCivics: CC_MODE.Paired },
        ...(withBuilder ? { builder } : {})
      };
      const r = await runBoth({ spec });
      try {
        assertSameResult(r.js, r.sql, `seed ${seed}`);
        const civics = r.objects("sql").civPieces.filter((p) => p.Kind === "civics");
        const got = new Map();
        const gave = new Map();
        for (const p of civics) {
          got.set(p.CivilizationType, (got.get(p.CivilizationType) || 0) + 1);
          gave.set(p.FromCivilization, (gave.get(p.FromCivilization) || 0) + 1);
        }
        for (const [civ, n] of got) assert.equal(n, 1, `seed ${seed}: ${civ} takes ${n} civics trees`);
        for (const [civ, n] of gave) assert.equal(n, 1, `seed ${seed}: ${civ} gives ${n} civics trees`);
        // Every civ that gave its tree took one, so nobody is left without.
        for (const civ of gave.keys()) assert.ok(got.has(civ), `seed ${seed}: ${civ} gave its tree and got none`);
      } finally {
        r.run.close();
      }
    }
  });
}
