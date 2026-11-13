// Your share from your own mode (CONTRACTS 33): humanPicks reads what the host's leader and civilization get under
// the human Leader mode and Civilization mode, as build card ids; mergePicks lets a hand-built card of a part replace
// the generated cards of that part. Run on the three age fixtures.
import assert from "node:assert/strict";
import test from "node:test";

import { dealConfig, readTableFrom } from "./_harness.mjs";
import { loadForJs } from "./_deal.mjs";
import { buildDealInput } from "../shared/deal/lshuf-deal.js";
import { humanOptions, humanPicks, mergePicks, pickPart } from "../shared/deal/lshuf-human-picks.js";
import {
  BUILD_KIND, CIV_PRESETS, MODE, PERSONA, PRESETS, PRESET_PERSONA, T_MODE, buildKindOf
} from "../shared/lshuf-constants.js";

const HUMAN_MODES = Object.keys(PRESETS);
const CIV_MODES = Object.keys(CIV_PRESETS);
const HOSTS = {
  base: { leader: "LEADER_AMINA", civ: "CIVILIZATION_ROME" },
  exploration: { leader: "LEADER_AMINA", civ: "CIVILIZATION_SPAIN" },
  modern: { leader: "LEADER_AMINA", civ: "CIVILIZATION_AMERICA" }
};
const LEADER_PARTS = new Set(["abilities", "attributes", "agendas", "terrain"]);
const CIV_PARTS = new Set(["civability", "uniques", "civics"]);

test("humanOptions sets the rows from the two presets and leaves the rest", () => {
  const base = { Abilities: "x", Attributes: "y", Biases: "z", Personality: PERSONA.Follows, KeepMine: "1", Reveal: "r" };
  const o = humanOptions(base, MODE.AgendasAttributes, "LSHUF_CM_SPLIT");
  assert.deepEqual([o.Abilities, o.Attributes, o.Biases], PRESETS[MODE.AgendasAttributes]);
  assert.equal(o.Personality, PRESET_PERSONA[MODE.AgendasAttributes]);
  assert.deepEqual([o.CivAbilities, o.CivUniques, o.CivCivics], CIV_PRESETS.LSHUF_CM_SPLIT);
  assert.equal(o.KeepMine, "1");
  assert.equal(o.Reveal, "r");
  assert.equal(o.HumanFollows, "1");
  const s = humanOptions(base, MODE.SwapLeaders, "LSHUF_CM_NORMAL");
  assert.equal(s.Personality, PERSONA.Follows, "a preset without an agendas value leaves the row");
});

test("mergePicks: a hand-built card of a part replaces the generated ones of that part", () => {
  const generated = ["LEADER_BOLIVAR__WHOLE", "ATTR_TRAIT_LEADER_ATTRIBUTE_ECONOMIC", "PERSONA_LEADER_BOLIVAR", "GBIAS_COAST",
    "CIVUNQ_UNIT_TAMKARU"];
  const hand = ["LEADER_PACHACUTI__B03", "BIAS_LEADER_XERXES"];
  const merged = mergePicks(hand, generated);
  assert.deepEqual(merged, ["LEADER_PACHACUTI__B03", "BIAS_LEADER_XERXES", "ATTR_TRAIT_LEADER_ATTRIBUTE_ECONOMIC",
    "PERSONA_LEADER_BOLIVAR", "CIVUNQ_UNIT_TAMKARU"]);
  assert.deepEqual(mergePicks([], generated), generated);
  assert.equal(pickPart("CIVNODE_NODE_CIVIC_AQ_GREECE_AGOGE"), "civics");
  assert.equal(pickPart("CIVILIZATION_ROME__B01"), "civability");
});

for (const fixture of Object.keys(HOSTS)) {
  test(`${fixture}: every human mode gives cards only for the parts it shuffles, the same each time`, async () => {
    const spec = { seed: 7, options: {} };
    const run = await loadForJs({ fixture, spec });
    try {
      const input = buildDealInput(readTableFrom(run.pre), dealConfig({ ...spec, age: undefined }));
      const host = HOSTS[fixture];
      assert.ok(input.leaders.some((l) => l.type === host.leader), `${host.leader} is in the ${fixture} input`);
      assert.deepEqual(humanPicks(input, null, MODE.None, "LSHUF_CM_NORMAL", host), [], "No shuffle twice gives nothing");
      for (const mode of HUMAN_MODES) {
        for (const civMode of CIV_MODES) {
          const ids = humanPicks(input, null, mode, civMode, host);
          const what = `${fixture} ${mode} ${civMode}`;
          assert.deepEqual(humanPicks(input, null, mode, civMode, host), ids, `${what}: same picks again`);
          const parts = new Set(ids.map(pickPart));
          const [a, t] = PRESETS[mode];
          if (a === "LSHUF_A_NORMAL") assert.ok(!parts.has("abilities"), `${what}: no ability cards`);
          if (t === T_MODE.Normal) assert.ok(!parts.has("attributes"), `${what}: no attribute cards`);
          if (civMode === "LSHUF_CM_NORMAL") {
            assert.ok(![...parts].some((p) => CIV_PARTS.has(p)), `${what}: no civilization cards`);
          }
          if (mode === MODE.None) assert.ok(![...parts].some((p) => LEADER_PARTS.has(p)), `${what}: no leader cards`);
          for (const id of ids) {
            assert.notEqual(buildKindOf(id), BUILD_KIND.CivBias, `${what}: ${id} isn't a civ start terrain card`);
            assert.ok(!id.endsWith("__REST"), `${what}: ${id} isn't a remainder`);
            assert.ok(!id.startsWith(`${host.leader}__`), `${what}: ${id} isn't the host's own ability`);
          }
        }
      }
      const whole = humanPicks(input, null, MODE.SwapLeaders, "LSHUF_CM_NORMAL", host);
      assert.ok(whole.some((id) => id.endsWith("__WHOLE")), `${fixture}: Swap whole hands over a whole ability`);
    } finally {
      run.close();
    }
  });
}

test("a host that isn't a leader in the input gets nothing", async () => {
  const run = await loadForJs({ fixture: "base", spec: { seed: 1, options: {} } });
  try {
    const input = buildDealInput(readTableFrom(run.pre), dealConfig({ seed: 1, options: {} }));
    assert.deepEqual(humanPicks(input, null, MODE.SwapLeaders, "LSHUF_CM_SPLIT", { leader: "LEADER_NOBODY", civ: null }), []);
    assert.deepEqual(humanPicks(input, null, MODE.SwapLeaders, "LSHUF_CM_SPLIT", null), []);
  } finally {
    run.close();
  }
});
