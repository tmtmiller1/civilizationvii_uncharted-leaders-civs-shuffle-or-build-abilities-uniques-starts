// CONTRACTS 33, the deal side. You on your own (HumanFollows "0"): the host builder sits out the AI players' deal,
// the AI players deal among themselves exactly as if the host kept its leader, and the host's cards go on top as
// copies. Agendas without abilities: the two agenda presets shuffle agendas with every ability left where it is.
// JS equals SQL throughout, on the Antiquity, Exploration and Modern fixtures.
import assert from "node:assert/strict";
import test from "node:test";

import { assertSameResult } from "./_harness.mjs";
import { checkAttributesConserved, label, runBoth } from "./_deal.mjs";
import { GENERIC_BIASES, MODE, REASON, STATUS, TRAIT } from "../shared/lshuf-constants.js";

const HOST = "LEADER_AMINA";
const LEADER_PRESETS = Object.values(MODE);
const TAG = GENERIC_BIASES[0][0];
// Per fixture: the host's civilization and a civilization card from that age.
const CIVS = {
  base: { civ: "CIVILIZATION_ROME", card: "CIVABIL_CIVILIZATION_GREECE", bias: "CIVBIAS_CIVILIZATION_EGYPT" },
  exploration: { civ: "CIVILIZATION_SPAIN", card: "CIVABIL_CIVILIZATION_ABBASID", bias: "CIVBIAS_CIVILIZATION_MING" },
  modern: { civ: "CIVILIZATION_AMERICA", card: "CIVABIL_CIVILIZATION_MEXICO", bias: "CIVBIAS_CIVILIZATION_PRUSSIA" }
};
// A sample of builds: bullets, a whole, attributes (a repeat too), agendas, start terrain, civilization cards.
const PICKS = (f) => [
  ["bullets", ["LEADER_AUGUSTUS__B01", "LEADER_PACHACUTI__B02"]],
  ["whole and agendas", ["LEADER_CONFUCIUS__WHOLE", "PERSONA_LEADER_HATSHEPSUT"]],
  ["attributes", ["ATTR_TRAIT_LEADER_ATTRIBUTE_CULTURAL", "ATTR2_TRAIT_LEADER_ATTRIBUTE_CULTURAL", "ATTR_TRAIT_LEADER_ATTRIBUTE_SCIENTIFIC"]],
  ["start terrain", ["BIAS_LEADER_HATSHEPSUT", CIVS[f].bias]],
  ["generic terrain and a civ card", [`GBIAS_${TAG}`, CIVS[f].card]],
  ["nothing", []]
];

const own = (f, pieces) => ({ leader: HOST, civ: CIVS[f].civ, pieces });

async function both(fixture, spec) {
  const r = await runBoth({ fixture, spec });
  try {
    assertSameResult(r.js, r.sql, `${label(fixture, spec)} ${JSON.stringify(spec.options)}: computeDeal vs SQL`);
    return { res: r.objects("sql"), pre: r.run.pre, close: () => r.run.close() };
  } catch (e) {
    r.run.close();
    throw e;
  }
}

const notHost = (rows) => rows.filter((x) => x.LeaderType !== HOST).map((x) => JSON.stringify(x)).sort();

for (const fixture of ["base", "exploration", "modern"]) {
  test(`${fixture}: on your own, JS equals SQL for every leader preset and a sample of builds`, async () => {
    for (const Mode of LEADER_PRESETS) {
      for (const [name, pieces] of PICKS(fixture)) {
        const options = { Mode, HumanFollows: "0", CivAbilities: "LSHUF_CA_SWAPPED" };
        const r = await both(fixture, { seed: 7, options, builder: own(fixture, pieces) });
        try {
          const host = r.res.leaders.find((x) => x.LeaderType === HOST);
          assert.equal(host.Reason, REASON.Built, `${fixture} ${Mode} ${name}: the host reads built`);
          const meta = r.res.meta.find((x) => x.Name === "Builder");
          assert.equal(meta && meta.Value, "ok", `${fixture} ${Mode} ${name}: the build applies`);
        } finally {
          r.close();
        }
      }
    }
  });

  test(`${fixture}: on your own, the AI players deal as if the host kept its leader`, async () => {
    for (const Mode of [MODE.SwapLeaders, MODE.SplitMatched, MODE.AgendasAttributes]) {
      const picks = ["LEADER_AUGUSTUS__WHOLE", "ATTR_TRAIT_LEADER_ATTRIBUTE_CULTURAL", "PERSONA_LEADER_CONFUCIUS"];
      const mine = await both(fixture, { seed: 11, options: { Mode, HumanFollows: "0" }, builder: own(fixture, picks) });
      const kept = await both(fixture, { seed: 11, options: { Mode, KeepMine: "1" }, kept: [HOST] });
      try {
        for (const part of ["leaders", "pieces", "attributes"]) {
          assert.deepEqual(notHost(mine.res[part]), notHost(kept.res[part]), `${fixture} ${Mode}: ${part} of the AI players`);
        }
        const pieces = mine.res.pieces.filter((x) => x.LeaderType === HOST).map((x) => x.PieceId);
        assert.deepEqual(pieces, ["LEADER_AUGUSTUS__WHOLE"], `${fixture} ${Mode}: the host holds its card`);
        const augustus = kept.res.pieces.filter((x) => x.FromLeaderType === "LEADER_AUGUSTUS" && x.LeaderType !== HOST);
        assert.ok(augustus.length > 0, `${fixture} ${Mode}: Augustus's ability is still dealt among the AI players`);
        const host = mine.res.leaders.find((x) => x.LeaderType === HOST);
        assert.equal(host.PersonaFrom, "LEADER_CONFUCIUS");
        assert.equal(host.AbilityFrom, "LEADER_AUGUSTUS");
      } finally {
        mine.close();
        kept.close();
      }
    }
  });
}

test("on your own with the AI players on No shuffle: only the host changes, and a part with no card stays its own", async () => {
  const picks = ["LEADER_AUGUSTUS__B01", "ATTR_TRAIT_LEADER_ATTRIBUTE_CULTURAL"];
  const r = await both("base", { seed: 3, options: { Mode: MODE.None, HumanFollows: "0" }, builder: own("base", picks) });
  try {
    for (const l of r.res.leaders.filter((x) => x.LeaderType !== HOST)) {
      assert.equal(l.Status, STATUS.AsShipped, `${l.LeaderType} as shipped`);
    }
    const host = r.res.leaders.find((x) => x.LeaderType === HOST);
    assert.equal(host.Axes, "|ABILITY|ATTRIBUTES|");
    assert.equal(host.BiasFrom, HOST, "no start terrain card: its own");
    const attrs = r.res.attributes.filter((x) => x.LeaderType === HOST).map((x) => x.TraitType);
    assert.deepEqual(attrs, ["TRAIT_LEADER_ATTRIBUTE_CULTURAL"]);
    const own = r.res.unlocks.filter((u) => u.ToLeaderType === HOST);
    assert.ok(own.length > 0 && own.every((u) => u.ToTraitType === TRAIT.dealt(HOST)), "its legend nodes on its dealt trait");
  } finally {
    r.close();
  }
});

test("HumanFollows 1 leaves the build as today's", async () => {
  const picks = ["LEADER_AUGUSTUS__B01"];
  const a = await both("base", { seed: 5, options: { Mode: MODE.SplitMatched }, builder: own("base", picks) });
  const b = await both("base", { seed: 5, options: { Mode: MODE.SplitMatched, HumanFollows: "1" }, builder: own("base", picks) });
  try {
    for (const part of ["leaders", "pieces", "attributes", "biases", "unlocks", "civPieces"]) {
      assert.deepEqual(a.res[part], b.res[part], part);
    }
    assert.notEqual(a.res.leaders.find((x) => x.LeaderType === HOST).Reason, undefined);
  } finally {
    a.close();
    b.close();
  }
});

for (const fixture of ["base", "exploration", "modern"]) {
  test(`${fixture}: Agendas only and Agendas and attributes shuffle the agendas and leave every ability`, async () => {
    for (const Mode of [MODE.AgendasOnly, MODE.AgendasAttributes]) {
      for (const seed of [1, 9]) {
        const r = await both(fixture, { seed, options: { Mode } });
        try {
          const meta = r.res.meta.find((x) => x.Name === "Mode");
          assert.equal(meta.Value, Mode, `${fixture} ${Mode}: the preset reads back`);
          const moved = r.res.leaders.filter((x) => x.PersonaFrom !== x.LeaderType);
          assert.ok(moved.length >= 2, `${fixture} ${Mode} seed ${seed}: agendas moved (${moved.length})`);
          for (const l of r.res.leaders) assert.equal(l.AbilityFrom, l.LeaderType, `${l.LeaderType} keeps its ability`);
          for (const p of r.res.pieces) assert.equal(p.FromLeaderType, p.LeaderType, `${p.LeaderType} holds its own`);
          const attrsMoved = r.res.attributes.some((x) => x.FromLeaderType !== x.LeaderType);
          assert.equal(attrsMoved, Mode === MODE.AgendasAttributes, `${fixture} ${Mode}: attributes`);
          if (Mode === MODE.AgendasAttributes) {
            const attrPool = r.res.leaders.filter((x) => String(x.Axes || "").includes("ATTRIBUTES")).map((x) => x.LeaderType);
            checkAttributesConserved(r.res, { pre: r.pre, where: `${fixture} ${Mode} seed ${seed}`, attrPool });
          }
          for (const u of r.res.unlocks) {
            const l = moved.find((x) => x.LeaderType === u.ToLeaderType);
            if (l) assert.equal(u.ToTraitType, TRAIT.dealt(l.LeaderType), `${u.ProgressionTreeNodeType} on the dealt trait`);
          }
        } finally {
          r.close();
        }
      }
    }
  });
}
