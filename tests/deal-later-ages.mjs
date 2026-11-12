// The deal on the Exploration and Modern databases (fixtures "exploration" and "modern", from mods-off lab games
// started in those ages): the JS preview equals the game's SQL in every mode with the civilization rows on Split up,
// nothing falls back, and no foreign-key row is new.
import assert from "node:assert/strict";
import test from "node:test";

import { assertSameResult, fixtureForeignKeys, newForeignKeyRows, rows } from "./_harness.mjs";
import { DEAL_MODES, runBoth } from "./_deal.mjs";
import { CA_MODE, CC_MODE, CU_MODE, MODE } from "../shared/lshuf-constants.js";

for (const fixture of ["exploration", "modern"]) {
  test(`${fixture}: JS equals SQL in every mode, civilization rows on Split up`, async () => {
    for (const Mode of DEAL_MODES) {
      const options = { Mode, CivAbilities: CA_MODE.Split, CivUniques: CU_MODE.Split, CivCivics: CC_MODE.Split };
      const r = await runBoth({ fixture, spec: { seed: 5, options } });
      try {
        const where = `${fixture} ${Mode}`;
        assertSameResult(r.js, r.sql, where);
        const o = r.objects("sql");
        assert.equal(o.meta.filter((m) => String(m.Name).startsWith("Fallback_")).length, 0, `${where}: nothing fell back`);
        assert.ok(o.civPieces.some((p) => p.Kind === "bullet"), `${where}: civilization bonuses were dealt`);
        assert.ok(o.civPieces.some((p) => p.Kind === "civic"), `${where}: civics were dealt`);
        assert.ok(o.civPieces.some((p) => p.Kind === "unique"), `${where}: uniques were dealt`);
        const fk = newForeignKeyRows(r.run.db, fixtureForeignKeys(fixture));
        assert.deepEqual([fk.fresh, fk.newErrors], [[], []], `${where}: no new foreign-key rows`);
      } finally {
        r.run.close();
      }
    }
  });
}

// The traits some civilization holds that carry the modifier or a copy of it (a trait nobody holds does nothing).
const traitsOf = (db, id) => rows(db, `SELECT DISTINCT tm.TraitType FROM TraitModifiers tm
  WHERE (tm.ModifierId = ? OR tm.ModifierId LIKE ? ESCAPE '\\')
    AND tm.TraitType IN (SELECT TraitType FROM CivilizationTraits)`, id, `%\\_\\_${id}`).map((x) => x.TraitType).sort();
const one = (db, sql, ...args) => (rows(db, sql, ...args)[0] || {}).t;
const noNewKeys = (db, fixture, where) => {
  const fk = newForeignKeyRows(db, fixtureForeignKeys(fixture));
  assert.deepEqual([fk.fresh, fk.newErrors], [[], []], `${where}: no new foreign-key rows`);
};

// The Pirate Republic (CONTRACTS 29): "no Settlers" (B03) and the settle charge (B02) go wherever the Buccaneer goes.
const CHARGE = "MOD_CIV_PIRATE_REPUBLIC_FLEET_COMMANDER_LAND_CLAIM_CHARGE";
const NO_SETTLERS = ["MOD_CIV_PIRATE_REPUBLIC_DISABLE_SETTLERS", "MOD_CIV_PIRATE_REPUBLIC_CAPTURE_SETTLERS"];
const PIRATE_PIECES = "('CIVILIZATION_PIRATE_REPUBLIC__B02', 'CIVILIZATION_PIRATE_REPUBLIC__B03')";
const buccaneerTrait = (db) => one(db, "SELECT TraitType t FROM Units WHERE UnitType = 'UNIT_BUCCANEER'");

test("exploration: a game the civ deal doesn't touch leaves the Pirates' rules on their ability", async () => {
  const r = await runBoth({ fixture: "exploration", spec: { seed: 2, options: { Mode: MODE.None } } });
  try {
    for (const id of [CHARGE, ...NO_SETTLERS]) assert.deepEqual(traitsOf(r.run.db, id), ["TRAIT_PIRATE_REPUBLIC_ABILITY"], id);
    assert.equal(buccaneerTrait(r.run.db), "TRAIT_PIRATE_REPUBLIC");
  } finally {
    r.run.close();
  }
});

test("exploration: no Settlers and the settle charge sit only where the Buccaneer is", async () => {
  let moved = 0;
  for (const CivAbilities of [CA_MODE.Normal, CA_MODE.Swapped, CA_MODE.Split]) {
    for (const seed of [1, 2, 9, 40]) {
      const options = { Mode: MODE.None, CivAbilities, CivUniques: CU_MODE.Split };
      const r = await runBoth({ fixture: "exploration", spec: { seed, options } });
      try {
        const where = `${CivAbilities} seed ${seed}`;
        assertSameResult(r.js, r.sql, where);
        const trait = buccaneerTrait(r.run.db);
        if (trait !== "TRAIT_PIRATE_REPUBLIC") moved += 1;
        for (const id of [CHARGE, ...NO_SETTLERS]) {
          assert.deepEqual(traitsOf(r.run.db, id), [trait], `${where}: ${id} is only on the Buccaneer's trait`);
        }
        const dealt = rows(r.run.db, `SELECT PieceId FROM LShufResultCivPieces WHERE PieceId IN ${PIRATE_PIECES}`);
        assert.deepEqual(dealt, [], `${where}: neither bonus is dealt on its own`);
        noNewKeys(r.run.db, "exploration", where);
      } finally {
        r.run.close();
      }
    }
  }
  assert.ok(moved > 0, "the Buccaneer went to another civilization in at least one of these games");
});

test("exploration: a builder who takes the no-Settlers card alone holds it; the charge stays with the Buccaneer", async () => {
  const SPAIN = "CIVILIZATION_SPAIN";
  for (const pieces of [["CIVILIZATION_PIRATE_REPUBLIC__B03"], ["CIVILIZATION_PIRATE_REPUBLIC__B03", "CIVILIZATION_PIRATE_REPUBLIC__B02"]]) {
    const options = { Mode: MODE.None, CivAbilities: CA_MODE.Split };
    const builder = { leader: "LEADER_AMINA", civ: SPAIN, pieces };
    const r = await runBoth({ fixture: "exploration", spec: { seed: 2, options, builder } });
    try {
      const where = `${pieces.length} card(s)`;
      assertSameResult(r.js, r.sql, where);
      const held = rows(r.run.db, `SELECT PieceId FROM LShufResultCivPieces WHERE CivilizationType = ? AND PieceId IN ${PIRATE_PIECES} ORDER BY 1`, SPAIN);
      assert.deepEqual(held.map((x) => x.PieceId), [...pieces].sort(), `${where}: Spain holds what it took`);
      const own = `TRAIT_LSHUF_CIVA_${SPAIN}`;
      for (const id of NO_SETTLERS) assert.deepEqual(traitsOf(r.run.db, id), [own], `${where}: ${id} is on Spain's dealt ability alone`);
      const charge = pieces.length === 2 ? own : buccaneerTrait(r.run.db);
      assert.deepEqual(traitsOf(r.run.db, CHARGE), [charge], `${where}: where the settle charge is`);
      noNewKeys(r.run.db, "exploration", where);
    } finally {
      r.run.close();
    }
  }
});

// Modern: the Sherpa is the only unit that builds the Highland Power Station (R3), and both of Joseon's second
// bonus's modifiers act on the Seowon quarter (R4).
test("modern: the Sherpa and the Highland Power Station stay together, and Joseon's Seowon rule follows the Seowon", async () => {
  const SEOWON = ["MOD_JOSEON_NON_CAPITAL_SPECIALIST_LIMIT_NO_SEOWON_DECREASE", "MOD_JOSEON_NON_CAPITAL_SPECIALIST_LIMIT_SEOWON_INCREASE"];
  let moved = 0;
  for (const seed of [1, 2, 9, 40]) {
    const split = { CivAbilities: CA_MODE.Split, CivUniques: CU_MODE.Split, CivCivics: CC_MODE.Split };
    const r = await runBoth({ fixture: "modern", spec: { seed, options: { Mode: MODE.None, ...split } } });
    try {
      const where = `seed ${seed}`;
      assertSameResult(r.js, r.sql, where);
      const sherpa = one(r.run.db, "SELECT TraitType t FROM Units WHERE UnitType = 'UNIT_SHERPA'");
      const station = one(r.run.db, "SELECT TraitType t FROM Improvements WHERE ConstructibleType = 'IMPROVEMENT_HIGHLAND_POWER_STATION'");
      assert.equal(station, sherpa, `${where}: the power station is on the Sherpa's trait`);
      if (sherpa !== "TRAIT_NEPAL") moved += 1;
      const seowon = one(r.run.db, "SELECT TraitType t FROM UniqueQuarters WHERE UniqueQuarterType = 'QUARTER_SEOWON'");
      for (const id of SEOWON) assert.deepEqual(traitsOf(r.run.db, id), [seowon], `${where}: ${id} is only on the Seowon's trait`);
      noNewKeys(r.run.db, "modern", where);
    } finally {
      r.run.close();
    }
  }
  assert.ok(moved > 0, "the Sherpa went to another civilization in at least one of these games");
});

// Sengoku's Kinsei civic switches Man-at-Arms off and lets its holder train the tier 2 Samurai (LShufCivUnitLinks,
// CONTRACTS 23 R1): the Samurai family belongs to that civic, so whoever gets Kinsei holds the Samurai.
const samuraiTraits = (db) => rows(db, "SELECT DISTINCT TraitType t FROM Units WHERE UnitType LIKE 'UNIT_SAMURAI%'").map((x) => x.t);
const holderOf = (db, trait) => rows(db, "SELECT CivilizationType c FROM CivilizationTraits WHERE TraitType = ?", trait).map((x) => x.c);

test("exploration: the Samurai goes wherever the Kinsei civic goes", async () => {
  let moved = 0;
  for (const CivCivics of [CC_MODE.Split, CC_MODE.Swapped]) {
    for (const seed of [1, 2, 9, 40]) {
      const options = { Mode: MODE.None, CivUniques: CU_MODE.Split, CivCivics };
      const r = await runBoth({ fixture: "exploration", spec: { seed, options } });
      try {
        const where = `${CivCivics} seed ${seed}`;
        assertSameResult(r.js, r.sql, where);
        const cards = rows(r.run.db, "SELECT PieceId FROM LShufResultCivPieces WHERE PieceId LIKE 'CIVUNQ_UNIT_SAMURAI%'");
        assert.deepEqual(cards, [], `${where}: the Samurai isn't a unique card of its own`);
        const traits = samuraiTraits(r.run.db);
        assert.equal(traits.length, 1, `${where}: the three Samurai tiers sit on one trait (${traits})`);
        // Who holds Kinsei: the civ dealt the civic (or Sengoku's whole tree), else Sengoku.
        const got = rows(r.run.db, `SELECT CivilizationType c FROM LShufResultCivPieces
          WHERE PieceId = 'CIVNODE_NODE_CIVIC_EX_SENGOKU_KINSEI'
            OR (Kind = 'civics' AND FromCivilization = 'CIVILIZATION_SENGOKU')`).map((x) => x.c);
        const kinsei = got.length ? got : ["CIVILIZATION_SENGOKU"];
        const samurai = holderOf(r.run.db, traits[0]);
        assert.deepEqual(samurai, kinsei, `${where}: the Samurai's holder is Kinsei's holder`);
        assert.equal(samurai.length, 1, `${where}: one holder`);
        if (samurai[0] !== "CIVILIZATION_SENGOKU") moved += 1;
        noNewKeys(r.run.db, "exploration", where);
      } finally {
        r.run.close();
      }
    }
  }
  assert.ok(moved > 0, "Kinsei went to another civilization in at least one of these games");
});

test("exploration: with the civics left alone the Samurai stays with Sengoku, whatever the uniques do", async () => {
  const options = { Mode: MODE.None, CivUniques: CU_MODE.Split };
  const r = await runBoth({ fixture: "exploration", spec: { seed: 2, options } });
  try {
    assertSameResult(r.js, r.sql, "uniques Split");
    assert.deepEqual(samuraiTraits(r.run.db), ["TRAIT_SENGOKU"]);
    assert.deepEqual(holderOf(r.run.db, "TRAIT_SENGOKU"), ["CIVILIZATION_SENGOKU"]);
  } finally {
    r.run.close();
  }
});
