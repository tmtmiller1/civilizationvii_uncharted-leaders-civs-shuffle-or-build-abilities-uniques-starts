// When the attribute deal can't fill a slot without a repeat (odd modded mixes, where several leaders hold five to
// seven attributes), the slot takes a leftover card anyway and the leader holds two of one kind. The second copy goes
// on TRAIT_LSHUF_EXTRA<n>_<trait> with copies of the trait's modifiers other than its diplomatic-action unlocks.
// Checked on the base fixture (compiled in Antiquity, where the point modifier is EFFECT_DO_NOTHING) with six leaders
// given all seven attribute traits, which is where repeats turn up.
import assert from "node:assert/strict";
import test from "node:test";

import { assertSameResult, fixtureForeignKeys, newForeignKeyRows, rows } from "./_harness.mjs";
import { checkAttributesConserved, label, runBoth } from "./_deal.mjs";
import { DEALING, extraModifierId, MODE, TRAIT } from "../shared/lshuf-constants.js";

const MANY = ["LEADER_AMINA", "LEADER_ASHOKA", "LEADER_AUGUSTUS", "LEADER_CONFUCIUS", "LEADER_HATSHEPSUT", "LEADER_XERXES"];

const allAttributes = {
  before: 20010,
  run: (db) => {
    const ins = db.prepare(
      "INSERT OR IGNORE INTO LeaderTraits (LeaderType, TraitType) SELECT ?, TraitType FROM LShufAttributeTraits"
    );
    for (const l of MANY) ins.run(l);
  }
};

const pointArgs = (db, modifierId) =>
  rows(db, "SELECT Name, Value FROM ModifierArguments WHERE ModifierId = ? ORDER BY Name", modifierId);

function checkExtraTraits(run, repeats, where) {
  for (const r of repeats) {
    const extra = TRAIT.extraAttribute(r.TraitType, r.Copy);
    const held = rows(run.db, "SELECT 1 FROM LeaderTraits WHERE LeaderType = ? AND TraitType = ?", r.LeaderType, extra);
    assert.equal(held.length, 1, `${where}: ${r.LeaderType} holds ${extra}`);
    const base = rows(
      run.db,
      `SELECT tm.ModifierId FROM TraitModifiers tm JOIN Modifiers m ON m.ModifierId = tm.ModifierId
       JOIN DynamicModifiers d ON d.ModifierType = m.ModifierType
       WHERE tm.TraitType = ? AND d.EffectType <> 'EFFECT_DIPLOMACY_GRANT_DIPLOMATIC_ACTION'`,
      r.TraitType
    ).map((x) => x.ModifierId);
    assert.ok(base.length > 0, `${where}: ${r.TraitType} has a point modifier`);
    const onExtra = rows(run.db, "SELECT ModifierId FROM TraitModifiers WHERE TraitType = ?", extra).map((x) => x.ModifierId);
    assert.deepEqual(onExtra.sort(), base.map((m) => extraModifierId(r.Copy, m)).sort(), `${where}: ${extra}'s modifiers`);
    for (const m of base) {
      assert.deepEqual(pointArgs(run.db, extraModifierId(r.Copy, m)), pointArgs(run.db, m), `${where}: ${m} copy arguments`);
    }
  }
}

test("a repeated attribute card goes on an extra trait, the same in JS and SQL", async () => {
  let repeated = 0;
  for (const Mode of [MODE.SplitMatched, MODE.SwapAbilities]) {
    for (const Dealing of [DEALING.Balanced, DEALING.Chance]) {
      for (const seed of [1, 2, 3, 5, 8, 13, 21, 34]) {
        const spec = { seed, options: { Mode, Dealing } };
        const where = label("base, six leaders with all seven attributes", spec);
        const r = await runBoth({ spec, hooks: [allAttributes] });
        try {
          assertSameResult(r.js, r.sql, `${where}: computeDeal vs SQL`);
          const res = r.objects("sql");
          const attrPool = res.leaders.filter((x) => String(x.Axes || "").includes("ATTRIBUTES")).map((x) => x.LeaderType);
          if (Mode !== MODE.SwapAbilities) checkAttributesConserved(res, { pre: r.run.pre, where, attrPool });
          const repeats = res.attributes.filter((a) => Number(a.Copy) > 0);
          repeated += repeats.length;
          checkExtraTraits(r.run, repeats, where);
          const fk = newForeignKeyRows(r.run.db, fixtureForeignKeys("base"));
          assert.deepEqual([fk.fresh, fk.newErrors], [[], []], `${where}: no new foreign-key rows`);
        } finally {
          r.run.close();
        }
      }
    }
  }
  assert.ok(repeated > 0, "at least one sampled deal repeats a kind, so the extra-trait path ran");
});
