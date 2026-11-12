// Great people the game grants (1.5.1): a civilization's great person can't be trained; modifiers on its ability
// grant it, some when a unique quarter or improvement is finished and some for other things (a suzerainty, a
// celebration, a science building). The game gives the unit only to a player who holds both the grant and the unit's
// own trait (lab 2026-11-11), so after any deal one civilization holds the unit family and every one of its grants,
// and when a grant names a quarter or unique constructible that civilization is the one holding it.
// docs/GREAT-PEOPLE.md charts all ten.
import assert from "node:assert/strict";
import test from "node:test";

import { rows } from "./_harness.mjs";
import { runBoth } from "./_deal.mjs";
import { CA_MODE, CC_MODE, CU_MODE, MODE } from "../shared/lshuf-constants.js";

const EXPECTED = {
  base: ["UNIT_LOGIOS", "UNIT_SHIJIN", "UNIT_SHI_DAFU", "UNIT_TJATY"],
  exploration: ["UNIT_ALIM", "UNIT_CONQUISTADOR", "UNIT_SAGA_HERO"],
  modern: ["UNIT_JACOBIN", "UNIT_REVOLUCIONARIO", "UNIT_UPARAT"]
};
const ANCHORED = {
  UNIT_LOGIOS: "BUILDING_ODEON", UNIT_TJATY: "BUILDING_MASTABA", UNIT_ALIM: null, UNIT_CONQUISTADOR: null,
  UNIT_SAGA_HERO: "IMPROVEMENT_THING", UNIT_JACOBIN: null, UNIT_REVOLUCIONARIO: null
};
const SETTINGS = [
  ["abilities swapped", { CivAbilities: CA_MODE.Swapped, CivUniques: CU_MODE.Normal, CivCivics: CC_MODE.Normal }],
  ["abilities split", { CivAbilities: CA_MODE.Split, CivUniques: CU_MODE.Normal, CivCivics: CC_MODE.Normal }],
  ["civics shuffled", { CivAbilities: CA_MODE.Normal, CivUniques: CU_MODE.Normal, CivCivics: CC_MODE.Shuffled }],
  ["civics split", { CivAbilities: CA_MODE.Normal, CivUniques: CU_MODE.Normal, CivCivics: CC_MODE.Split }],
  ["everything swapped", { CivAbilities: CA_MODE.Swapped, CivUniques: CU_MODE.Shuffled, CivCivics: CC_MODE.Shuffled }],
  ["everything split", { CivAbilities: CA_MODE.Split, CivUniques: CU_MODE.Split, CivCivics: CC_MODE.Split }],
  ["uniques off", { CivAbilities: CA_MODE.Swapped, CivUniques: CU_MODE.Off, CivCivics: CC_MODE.Normal }]
];
const holdersOf = (db, trait) => rows(db, "SELECT CivilizationType c FROM CivilizationTraits WHERE TraitType = ?", trait).map((x) => x.c).sort();

function check(db, what, units) {
  const grants = rows(db, "SELECT ModifierId, UnitType, Anchor FROM LShufWork_GpGrant");
  assert.deepEqual([...new Set(grants.map((g) => g.UnitType))].sort(), units, `${what}: every great person's grants were found`);

  for (const unit of units) {
    const mine = grants.filter((g) => g.UnitType === unit);
    const family = rows(db, "SELECT UnitType, TraitType FROM Units WHERE UnitType = ? OR UnitType LIKE ? ESCAPE '\\'", unit, `${unit}\\_%`);
    const traits = [...new Set(family.map((u) => u.TraitType))];
    assert.equal(traits.length, 1, `${what}: ${unit}'s family sits on one trait (${traits})`);
    const holder = holdersOf(db, traits[0]);
    assert.equal(holder.length, 1, `${what}: one civilization holds ${unit} (${traits[0]}: ${holder})`);
    for (const g of mine) {
      const on = rows(db, "SELECT tm.TraitType t FROM TraitModifiers tm WHERE tm.ModifierId = ? OR tm.ModifierId LIKE ? ESCAPE '\\'", g.ModifierId, `LSHUF\\_%\\_\\_${g.ModifierId}`)
        .flatMap((x) => holdersOf(db, x.t));
      assert.deepEqual([...new Set(on)], holder, `${what}: ${g.ModifierId} is held by ${unit}'s holder alone`);
    }
    const anchor = mine.map((g) => g.Anchor).find(Boolean);
    if (unit in ANCHORED) assert.ok(anchor, `${what}: ${unit} is tied to a quarter or improvement`);
    else assert.equal(anchor, undefined, `${what}: ${unit} isn't tied to a district`);
    if (ANCHORED[unit]) assert.equal(anchor, ANCHORED[unit], `${what}: ${unit}'s anchor`);
    if (anchor) {
      const at = rows(db, "SELECT TraitType t FROM Buildings WHERE ConstructibleType = ? UNION ALL SELECT TraitType FROM Improvements WHERE ConstructibleType = ?", anchor, anchor)[0].t;
      assert.deepEqual(holdersOf(db, at), holder, `${what}: ${unit}'s holder holds ${anchor}`);
    }
  }

}

for (const fixture of Object.keys(EXPECTED)) {
  test(`${fixture}: each granted great person and its grants land on one civilization, with its quarter when it has one`, async () => {
    for (const [name, civ] of SETTINGS) {
      for (const seed of [3, 21]) {
        const r = await runBoth({ fixture, spec: { seed, options: { Mode: MODE.None, ...civ } }, js: false });
        try {
          check(r.run.db, `${fixture} ${name} seed ${seed}`, EXPECTED[fixture]);
        } finally {
          r.run.close();
        }
      }
    }
  });
}

test("a game the civilization deal doesn't touch keeps the game's own rows", async () => {
  const r = await runBoth({ spec: { seed: 3, options: { Mode: MODE.None } }, js: false });
  try {
    const u = rows(r.run.db, "SELECT TraitType t FROM Units WHERE UnitType IN ('UNIT_LOGIOS', 'UNIT_SHI_DAFU', 'UNIT_SHIJIN', 'UNIT_TJATY') ORDER BY 1").map((x) => x.t);
    assert.deepEqual(u, ["TRAIT_EGYPT", "TRAIT_GREECE", "TRAIT_HAN", "TRAIT_HEIAN"]);
    const g = rows(r.run.db, "SELECT TraitType t FROM TraitModifiers WHERE ModifierId = 'TRAIT_MOD_GRANT_LOGIOS_SUZERAIN'").map((x) => x.t);
    assert.deepEqual(g, ["TRAIT_GREECE_ABILITY"]);
  } finally {
    r.run.close();
  }
});
