// Civilization builds (CONTRACTS 14): a builder's civ swaps abilities with the civ whose ability card it took and
// takes the uniques it ticked (unit families and improvements; buildings and quarters move with the civics tree,
// CONTRACTS 18), the same in JS and SQL, and the apply moves the rows and the tree unlocks. Abilities and their
// bonuses come from any age (Every age); uniques and civics only from the builder's own. On the base fixture: Amina
// with Rome building from Greece (Antiquity) and Spain (Exploration).
import assert from "node:assert/strict";
import test from "node:test";

import { assertSameResult, fixtureForeignKeys, newForeignKeyRows, rows } from "./_harness.mjs";
import { label, runBoth } from "./_deal.mjs";
import { BUILD, BUILD_WHY, MODE, STATUS } from "../shared/lshuf-constants.js";

const AMINA = "LEADER_AMINA";
const ROME = "CIVILIZATION_ROME";
const GREECE = "CIVILIZATION_GREECE";
const EGYPT = "CIVILIZATION_EGYPT";
const SPAIN = "CIVILIZATION_SPAIN";
const MISSISSIPPIAN = "CIVILIZATION_MISSISSIPPIAN";

const meta = (res, name) => (res.meta.find((r) => r.Name === name) || {}).Value;
const civRows = (res, civ) => res.civPieces.filter((r) => r.CivilizationType === civ)
  .sort((a, b) => Number(a.SortIndex) - Number(b.SortIndex))
  .map((r) => [r.PieceId, r.FromCivilization, r.Kind, Number(r.SortIndex)]);
const traitsOf = (db, civ) => rows(db, "SELECT TraitType FROM CivilizationTraits WHERE CivilizationType = ? ORDER BY 1", civ)
  .map((r) => r.TraitType);

async function both(spec, hooks = []) {
  const r = await runBoth({ spec, hooks });
  try {
    assertSameResult(r.js, r.sql, `${label("base", spec)}: computeDeal vs SQL`);
    // Attribute tag rows follow every ability row (CONTRACTS 30); tests/deal-civ-tags.mjs covers them, so the
    // counts here leave them out.
    const res = r.objects("sql");
    res.civPieces = res.civPieces.filter((p) => p.Kind !== "tags");
    return { res, run: r.run, close: () => r.run.close() };
  } catch (e) {
    r.run.close();
    throw e;
  }
}

// The fixture's Greek unique unit family base, read from the pre-deal copy.
function sources(pre) {
  const unit = rows(pre, "SELECT UnitType FROM Units WHERE TraitType = 'TRAIT_GREECE' ORDER BY 1")[0].UnitType;
  assert.ok(unit, "the fixture has a Greek unique unit");
  return { unit };
}

test("an ability swap and a unique move, the same in JS and SQL and applied, with the tree unlocks", async () => {
  for (const Mode of [MODE.SwapAbilities, MODE.SplitMatched]) {
    const probe = await runBoth({ spec: { seed: 3, options: { Mode } } });
    const { unit } = sources(probe.run.pre);
    probe.run.close();
    const hand = [BUILD.civAbility(GREECE), BUILD.civUnique(unit), BUILD.civAbility(SPAIN)];
    const spec = { seed: 3, options: { Mode }, builder: { leader: AMINA, civ: ROME, pieces: hand } };
    const r = await both(spec);
    try {
      assert.equal(meta(r.res, "CivBuilder"), "ok", Mode);
      assert.deepEqual(civRows(r.res, ROME), [
        [BUILD.civAbility(GREECE), GREECE, "ability", 0],
        [BUILD.civUnique(unit), GREECE, "unique", 1]
      ], `${Mode}: Rome's rows`);
      assert.deepEqual(civRows(r.res, GREECE), [[BUILD.civAbility(ROME), ROME, "ability", 0]], `${Mode}: Greece gets Rome's ability`);
      assert.deepEqual(civRows(r.res, SPAIN), [], `${Mode}: only the first ability card swaps`);
      const db = r.run.db;
      const romeTraits = traitsOf(db, ROME);
      assert.ok(romeTraits.includes("TRAIT_GREECE_ABILITY") && !romeTraits.includes("TRAIT_ROME_ABILITY"), `${Mode}: Rome holds Greece's ability`);
      const greekTraits = traitsOf(db, GREECE);
      assert.ok(greekTraits.includes("TRAIT_ROME_ABILITY") && !greekTraits.includes("TRAIT_GREECE_ABILITY"), `${Mode}: Greece holds Rome's`);
      const own = `TRAIT_LSHUF_CIV_${ROME}`;
      assert.ok(romeTraits.includes(own), `${Mode}: Rome holds its unique trait`);
      assert.equal(rows(db, "SELECT TraitType FROM Units WHERE UnitType = ?", unit)[0].TraitType, own, `${Mode}: the unit moved`);
      const unlocks = rows(db, "SELECT RequiredTraitType FROM ProgressionTreeNodeUnlocks WHERE TargetType = ? OR TargetType LIKE ?",
        unit, `${unit}_%`).map((x) => x.RequiredTraitType);
      assert.ok(unlocks.length > 0 && unlocks.every((x) => x === own), `${Mode}: the family's tree unlocks ask for Rome's trait`);
      const fk = newForeignKeyRows(db, fixtureForeignKeys("base"));
      assert.deepEqual([fk.fresh, fk.newErrors], [[], []], `${Mode}: no new foreign-key rows`);
    } finally {
      r.close();
    }
  }
});

test("taking Legion as Egypt: Bronze Working and Iron Working unlock UNIT_LEGION and UNIT_LEGION_2 for Egypt", async () => {
  const builder = { leader: AMINA, civ: EGYPT, pieces: [BUILD.civUnique("UNIT_LEGION")] };
  const r = await both({ seed: 35, options: { Mode: MODE.SwapAbilities }, builder });
  try {
    assert.deepEqual(civRows(r.res, EGYPT), [[BUILD.civUnique("UNIT_LEGION"), ROME, "unique", 1]]);
    const own = `TRAIT_LSHUF_CIV_${EGYPT}`;
    const unlocks = rows(r.run.db, "SELECT ProgressionTreeNodeType, TargetType, RequiredTraitType FROM ProgressionTreeNodeUnlocks "
      + "WHERE TargetType IN ('UNIT_LEGION', 'UNIT_LEGION_2') ORDER BY 2");
    assert.deepEqual(unlocks.map((u) => [u.ProgressionTreeNodeType, u.TargetType, u.RequiredTraitType]), [
      ["NODE_TECH_AQ_BRONZE_WORKING", "UNIT_LEGION", own],
      ["NODE_TECH_AQ_IRON_WORKING", "UNIT_LEGION_2", own]
    ]);
    const legatus = rows(r.run.db, "SELECT RequiredTraitType FROM ProgressionTreeNodeUnlocks WHERE TargetType = 'UNIT_LEGATUS'");
    assert.deepEqual(legatus.map((u) => u.RequiredTraitType), ["TRAIT_ROME"], "the other family's unlock stays Rome's");
  } finally {
    r.close();
  }
});

test("two builders: the second can't swap with the first's civ, and a card the first took is gone", async () => {
  const probe = await runBoth({ spec: { seed: 5, options: { Mode: MODE.SwapAbilities } } });
  const { unit } = sources(probe.run.pre);
  probe.run.close();
  const spec = {
    seed: 5,
    options: { Mode: MODE.SwapAbilities },
    builders: [
      { slot: 1, leader: AMINA, civ: ROME, pieces: [BUILD.civAbility(GREECE), BUILD.civUnique(unit)] },
      { slot: 2, leader: "LEADER_XERXES", civ: EGYPT, pieces: [BUILD.civAbility(ROME), BUILD.civUnique(unit)] }
    ]
  };
  const r = await both(spec);
  try {
    assert.equal(meta(r.res, "CivBuilder"), "ok");
    assert.equal(meta(r.res, "CivBuilder2"), BUILD_WHY.NoPieces, "Rome is built by slot 1 and the unit is taken");
    assert.deepEqual(civRows(r.res, EGYPT), []);
    assert.equal(civRows(r.res, ROME).length, 2);
  } finally {
    r.close();
  }
});

test("Leader shuffle on Base game: civ cards still build, the leader cards on the same builder don't", async () => {
  const probe = await runBoth({ spec: { seed: 3, options: { Mode: MODE.None } } });
  const { unit } = sources(probe.run.pre);
  probe.run.close();
  const hand = [BUILD.civAbility(GREECE), BUILD.civUnique(unit), `${AMINA}__WHOLE`];
  const r = await both({ seed: 3, options: { Mode: MODE.None }, builder: { leader: AMINA, civ: ROME, pieces: hand } });
  try {
    assert.equal(meta(r.res, "CivBuilder"), "ok");
    assert.equal(civRows(r.res, ROME).length, 2, "Rome takes Greece's ability and the unit");
    assert.ok(r.res.leaders.every((l) => l.Status === STATUS.AsShipped), "no leader is dealt");
  } finally {
    r.close();
  }
  const leaderOnly = await both({ seed: 3, options: { Mode: MODE.None }, builder: { leader: AMINA, civ: ROME, pieces: [`${AMINA}__WHOLE`] } });
  try {
    assert.equal(meta(leaderOnly.res, "Builder"), BUILD_WHY.ModeOff);
    assert.deepEqual(civRows(leaderOnly.res, ROME), []);
  } finally {
    leaderOnly.close();
  }
});

test("Human players keep their own leader: the kept leader's civ cards still build, unless Keep my built civilization is off", async () => {
  const probe = await runBoth({ spec: { seed: 3, options: { Mode: MODE.SplitMatched } } });
  const { unit } = sources(probe.run.pre);
  probe.run.close();
  const hand = [BUILD.civAbility(GREECE), BUILD.civUnique(unit), `${AMINA}__WHOLE`];
  const spec = (keep) => ({ seed: 3, options: { Mode: MODE.SplitMatched, KeepMine: "1", KeepBuiltCiv: keep },
    kept: [AMINA], builder: { leader: AMINA, civ: ROME, pieces: hand } });
  const on = await both(spec("1"));
  try {
    assert.equal(meta(on.res, "Builder"), "ok");
    assert.equal(civRows(on.res, ROME).length, 2, "Rome takes Greece's ability and the unit");
    const amina = on.res.leaders.find((l) => l.LeaderType === AMINA);
    assert.equal(amina.Status, STATUS.AsShipped, "Amina keeps her own leader");
    const aminaPieces = on.res.pieces.filter((p) => p.LeaderType === AMINA);
    assert.deepEqual(aminaPieces.map((p) => p.FromLeaderType), aminaPieces.map(() => AMINA), "her ability is her own");
  } finally {
    on.close();
  }
  const off = await both(spec("0"));
  try {
    assert.equal(meta(off.res, "Builder"), BUILD_WHY.NotInGame);
    assert.deepEqual(civRows(off.res, ROME), [], "Rome plays as normal");
  } finally {
    off.close();
  }
});

test("no civ, or a civ the data doesn't know: the civ build says so and writes nothing", async () => {
  const builder = { leader: AMINA, civ: null, pieces: [BUILD.civAbility(GREECE)] };
  const spec = { seed: 7, options: { Mode: MODE.SplitMatched }, builder };
  const r = await both(spec);
  try {
    assert.equal(meta(r.res, "CivBuilder"), BUILD_WHY.NotInGame);
    assert.deepEqual(r.res.civPieces, []);
  } finally {
    r.close();
  }
});

// --- CONTRACTS 16: the shuffle over the civs no builder built

import { CA_MODE, CIV_OWN_AGE_PIECES, CU_MODE } from "../shared/lshuf-constants.js";

const ageOf = (pre) => {
  const map = new Map();
  for (const r of rows(pre, "SELECT CivilizationType, MIN(Age) AS Age FROM LegacyCivilizations GROUP BY CivilizationType")) {
    map.set(r.CivilizationType, r.Age);
  }
  return map;
};
const civsWithAbility = (pre) => rows(pre,
  "SELECT DISTINCT CivilizationType FROM CivilizationTraits WHERE TraitType LIKE 'TRAIT\\_%\\_ABILITY' ESCAPE '\\' "
  + "AND CivilizationType IN (SELECT CivilizationType FROM Civilizations)").map((r) => r.CivilizationType);

test("civ shuffle: JS equals SQL for every value of the two rows, over two presets", async () => {
  const values = [
    [CA_MODE.Swapped, CU_MODE.Normal], [CA_MODE.Swapped, CU_MODE.Paired], [CA_MODE.Normal, CU_MODE.Shuffled],
    [CA_MODE.Swapped, CU_MODE.Shuffled], [CA_MODE.Off, CU_MODE.Off], [CA_MODE.Normal, CU_MODE.Paired],
    [CA_MODE.Normal, CU_MODE.Normal], [CA_MODE.Split, CU_MODE.Split], [CA_MODE.Swapped, CU_MODE.Split]
  ];
  for (const Mode of [MODE.SwapAbilities, MODE.SplitMatched, MODE.None]) {
    for (const [CivAbilities, CivUniques] of values) {
      const r = await both({ seed: 31, options: { Mode, CivAbilities, CivUniques, CivCivics: CivUniques.replace("_CU_", "_CC_") } });
      r.close();
    }
  }
});

test("civ shuffle Swapped: every ability of an age is held exactly once, and Normal writes nothing", async () => {
  const r = await both({ seed: 31, options: { Mode: MODE.SwapAbilities, CivAbilities: CA_MODE.Swapped } });
  try {
    const ages = ageOf(r.run.pre);
    const civs = civsWithAbility(r.run.pre);
    const rowsOf = r.res.civPieces.filter((p) => p.Kind === "ability");
    assert.ok(rowsOf.length > 0, "abilities moved");
    for (const civ of civs) {
      const holders = rowsOf.filter((p) => p.FromCivilization === civ);
      assert.ok(holders.length <= 1, `${civ}'s ability held at most once`);
      const taken = rowsOf.filter((p) => p.CivilizationType === civ);
      assert.ok(taken.length <= 1, `${civ} takes at most one ability`);
      for (const p of [...holders, ...taken]) assert.equal(ages.get(p.CivilizationType), ages.get(p.FromCivilization), "same age");
    }
    // Every civ in an age with two or more civs both gives and takes (a cycle).
    const byAge = new Map();
    for (const civ of civs) byAge.set(ages.get(civ), (byAge.get(ages.get(civ)) || 0) + 1);
    for (const civ of civs) {
      if (byAge.get(ages.get(civ)) < 2) continue;
      assert.equal(rowsOf.filter((p) => p.CivilizationType === civ).length, 1, `${civ} takes one`);
      assert.equal(rowsOf.filter((p) => p.FromCivilization === civ).length, 1, `${civ} gives one`);
    }
    assert.deepEqual(r.res.civPieces.filter((p) => p.Kind === "unique"), [], "uniques Normal: none move");
  } finally {
    r.close();
  }
  const none = await both({ seed: 31, options: { Mode: MODE.SwapAbilities } });
  try {
    assert.deepEqual(none.res.civPieces, [], "both rows Normal: nothing");
  } finally {
    none.close();
  }
});

test("civ shuffle uniques: Shuffled moves whole sets once each, Paired follows the ability donor", async () => {
  const shuffled = await both({ seed: 31, options: { Mode: MODE.SwapAbilities, CivUniques: CU_MODE.Shuffled } });
  try {
    const ages = ageOf(shuffled.run.pre);
    const uniques = shuffled.res.civPieces.filter((p) => p.Kind === "unique");
    assert.ok(uniques.length > 0, "uniques moved");
    const ids = uniques.map((p) => p.PieceId);
    assert.equal(new Set(ids).size, ids.length, "each unique moves once");
    const donorOf = new Map();
    for (const p of uniques) {
      assert.equal(ages.get(p.CivilizationType), ages.get(p.FromCivilization), "same age");
      if (donorOf.has(p.CivilizationType)) assert.equal(donorOf.get(p.CivilizationType), p.FromCivilization, "one donor per civ");
      donorOf.set(p.CivilizationType, p.FromCivilization);
    }
    assert.deepEqual(shuffled.res.civPieces.filter((p) => p.Kind === "ability"), [], "abilities Normal");
  } finally {
    shuffled.close();
  }
  const paired = await both({
    seed: 31, options: { Mode: MODE.SwapAbilities, CivAbilities: CA_MODE.Swapped, CivUniques: CU_MODE.Paired }
  });
  try {
    const abilityDonor = new Map(paired.res.civPieces.filter((p) => p.Kind === "ability")
      .map((p) => [p.CivilizationType, p.FromCivilization]));
    const uniques = paired.res.civPieces.filter((p) => p.Kind === "unique");
    assert.ok(uniques.length > 0, "uniques followed");
    for (const p of uniques) assert.equal(abilityDonor.get(p.CivilizationType), p.FromCivilization, `${p.CivilizationType}: with the ability`);
  } finally {
    paired.close();
  }
  const pairedAlone = await both({ seed: 31, options: { Mode: MODE.SwapAbilities, CivUniques: CU_MODE.Paired } });
  try {
    assert.deepEqual(pairedAlone.res.civPieces, [], "With the ability under Normal abilities reads as Normal");
  } finally {
    pairedAlone.close();
  }
});

test("civ shuffle leaves a builder's rows alone and skips its civ and the ability it took", async () => {
  const probe = await runBoth({ spec: { seed: 32, options: { Mode: MODE.SwapAbilities } } });
  const { unit } = sources(probe.run.pre);
  probe.run.close();
  const builder = { leader: AMINA, civ: ROME, pieces: [BUILD.civAbility(GREECE), BUILD.civUnique(unit)] };
  const alone = await both({ seed: 32, options: { Mode: MODE.SwapAbilities }, builder });
  const withShuffle = await both({
    seed: 32, builder,
    options: { Mode: MODE.SwapAbilities, CivAbilities: CA_MODE.Swapped, CivUniques: CU_MODE.Shuffled }
  });
  try {
    assert.deepEqual(civRows(withShuffle.res, ROME), civRows(alone.res, ROME), "Rome's rows as built");
    assert.deepEqual(civRows(withShuffle.res, GREECE).filter((r) => r[2] === "ability"), civRows(alone.res, GREECE), "Greece keeps the swap");
    const taken = withShuffle.res.civPieces.filter((p) => p.PieceId === BUILD.civUnique(unit));
    assert.deepEqual(taken.map((p) => p.CivilizationType), [ROME], "the taken unit moves once, to Rome");
    const abilityRows = withShuffle.res.civPieces.filter((p) => p.Kind === "ability");
    assert.ok(!abilityRows.some((p) => p.CivilizationType === ROME && p.FromCivilization !== GREECE), "Rome isn't in the cycle");
    assert.ok(!abilityRows.some((p) => p.FromCivilization === GREECE && p.CivilizationType !== ROME), "Greece's ability isn't dealt again");
  } finally {
    alone.close();
    withShuffle.close();
  }
});

test("civ shuffle Off for everyone: the flags are set and the apply clears abilities and uniques, builders excepted", async () => {
  const probe = await runBoth({ spec: { seed: 33, options: { Mode: MODE.SwapAbilities } } });
  const { unit } = sources(probe.run.pre);
  probe.run.close();
  const builder = { leader: AMINA, civ: ROME, pieces: [BUILD.civAbility(GREECE), BUILD.civUnique(unit)] };
  const r = await both({
    seed: 33, options: { Mode: MODE.SwapAbilities, CivAbilities: CA_MODE.Off, CivUniques: CU_MODE.Off }, builder
  });
  try {
    assert.equal(meta(r.res, "CivAbilitiesOff"), "1");
    assert.equal(meta(r.res, "CivUniquesOff"), "1");
    const db = r.run.db;
    const abilityHolders = rows(db, "SELECT CivilizationType FROM CivilizationTraits WHERE TraitType LIKE 'TRAIT\\_%\\_ABILITY' ESCAPE '\\' "
      + "AND CivilizationType IN (SELECT CivilizationType FROM Civilizations) ORDER BY 1").map((x) => x.CivilizationType);
    assert.deepEqual(abilityHolders, [GREECE, ROME], "only the swapped pair keeps an ability");
    const unitTraits = rows(db, "SELECT UnitType, TraitType FROM Units WHERE TraitType LIKE 'TRAIT\\_%' ESCAPE '\\' "
      + "AND TraitType NOT LIKE 'TRAIT_LSHUF_%' AND TraitType IN (SELECT TraitType FROM CivilizationTraits)");
    // The civics families stay: the Watonathi (CONTRACTS 18) and the great people a quarter earns (CONTRACTS 23 R1).
    const civicUnits = new Set(rows(db, "SELECT UnitType FROM LShufWork_CivicUnit").map((x) => x.UnitType));
    assert.ok(unitTraits.some((u) => u.UnitType === "UNIT_WATONATHI"), "the Watonathi stays with Mississippi's civics");
    assert.ok(unitTraits.some((u) => u.UnitType === "UNIT_LOGIOS"), "the Logios stays with Greece's civics");
    assert.deepEqual(unitTraits.filter((u) => !civicUnits.has(u.UnitType)), [],
      "no civ-held unique unit is left on a civ trait, except the ones that belong to its civics");
    assert.equal(rows(db, "SELECT TraitType FROM Units WHERE UnitType = ?", unit)[0].TraitType, `TRAIT_LSHUF_CIV_${ROME}`, "the taken unit stays Rome's");
    assert.ok(rows(db, "SELECT COUNT(*) AS n FROM Units WHERE TraitType = 'TRAIT_LSHUF_NONE'")[0].n > 0, "the rest went to the trait nobody holds");
    const fk = newForeignKeyRows(db, fixtureForeignKeys("base"));
    assert.deepEqual([fk.fresh, fk.newErrors], [[], []], "no new foreign-key rows");
  } finally {
    r.close();
  }
});

test("unit families: Greece's cards are its base units, and taking the Hoplite moves every UNIT_HOPLITE_ row", async () => {
  const probe = await runBoth({ spec: { seed: 34, options: { Mode: MODE.SwapAbilities } } });
  const pre = probe.run.pre;
  const greek = rows(pre, "SELECT UnitType FROM Units WHERE TraitType = 'TRAIT_GREECE' ORDER BY 1").map((r) => r.UnitType);
  probe.run.close();
  const { KNOWN_CIV_ITEMS } = await import("../shared/lshuf-known-civ-items.js");
  const cards = KNOWN_CIV_ITEMS.filter((i) => i.civ === GREECE && i.kind === "unit").map((i) => i.type).sort();
  // The Logios is a great person only a city with the Acropolis earns, so it goes with the civics (CONTRACTS 23 R1).
  assert.deepEqual(cards, ["UNIT_HOPLITE"], "one card per family, the Logios with the civics");
  assert.ok(greek.some((u) => u.startsWith("UNIT_HOPLITE_")), "the fixture has more than one Hoplite");
  const builder = { leader: AMINA, civ: ROME, pieces: [BUILD.civUnique("UNIT_HOPLITE"), BUILD.civUnique("UNIT_LOGIOS")] };
  const r = await both({ seed: 34, options: { Mode: MODE.SwapAbilities }, builder });
  try {
    assert.deepEqual(civRows(r.res, ROME), [[BUILD.civUnique("UNIT_HOPLITE"), GREECE, "unique", 1]], "the Logios pick does nothing");
    const own = `TRAIT_LSHUF_CIV_${ROME}`;
    const moved = rows(r.run.db, "SELECT UnitType FROM Units WHERE TraitType = ? ORDER BY 1", own).map((x) => x.UnitType);
    assert.deepEqual(moved, greek.filter((u) => u === "UNIT_HOPLITE" || u.startsWith("UNIT_HOPLITE_")), "the whole family moved");
    const logios = rows(r.run.db, "SELECT DISTINCT TraitType FROM Units WHERE UnitType LIKE 'UNIT_LOGIOS%'").map((x) => x.TraitType);
    assert.deepEqual(logios, ["TRAIT_GREECE"], "the Logios stayed with Greece's civics");
  } finally {
    r.close();
  }
});

// --- CONTRACTS 18: unique civics as a part of their own

import { CC_MODE } from "../shared/lshuf-constants.js";

const civicsRows = (res) => res.civPieces.filter((p) => p.Kind === "civics");
const revealTrait = (db, civ) => rows(db, "SELECT ra.Value FROM RequirementArguments ra JOIN Requirements r ON r.RequirementId = ra.RequirementId "
  + "WHERE r.RequirementType = 'REQUIREMENT_PLAYER_HAS_CIVILIZATION_OR_LEADER_TRAIT' AND ra.Name = 'TraitType' "
  + "AND ra.RequirementId IN (SELECT rsr.RequirementId FROM Modifiers m JOIN RequirementSetRequirements rsr ON rsr.RequirementSetId = m.SubjectRequirementSetId "
  + "JOIN ModifierArguments ma ON ma.ModifierId = m.ModifierId AND ma.Name = 'ProgressionTreeType' WHERE ma.Value = ?)",
`TREE_CIVICS_AQ_${civ.replace("CIVILIZATION_", "")}`).map((x) => x.Value);
const traitOf = (db, table, col, type) => rows(db, `SELECT TraitType FROM ${table} WHERE ${col} = ?`, type).map((x) => x.TraitType);

test("civics cards: one per civ with a civics tree in every age, and nothing the civ's own civics unlock is a card", async () => {
  const { KNOWN_CIV_ITEMS } = await import("../shared/lshuf-known-civ-items.js");
  const kinds = new Set(KNOWN_CIV_ITEMS.map((i) => i.kind));
  // Nepal's Highland Power Station, the one main-tree improvement, rides with the Sherpa (CONTRACTS 23 R3).
  assert.deepEqual([...kinds].sort(), ["ability", "civics", "unit"], "the kinds on the cards");
  const civics = KNOWN_CIV_ITEMS.filter((i) => i.kind === "civics");
  assert.deepEqual(civics.filter((i) => i.civ === ROME).map((i) => i.type), ["TREE_CIVICS_AQ_ROME"]);
  assert.deepEqual(civics.filter((i) => i.civ === SPAIN).map((i) => i.type), ["TREE_CIVICS_EX_SPAIN"], "Exploration civs have theirs");
  assert.equal(civics.length, 50, `every civ has a civics card (${civics.length})`);
  const types = new Set(KNOWN_CIV_ITEMS.map((i) => i.type));
  for (const t of ["UNIT_WATONATHI", "BUILDING_BASILICA", "QUARTER_FORUM", "UNIT_LOGIOS", "UNIT_CONQUISTADOR"]) {
    assert.ok(!types.has(t), `${t} rides with the civics`);
  }
  assert.ok(!types.has("IMPROVEMENT_HIGHLAND_POWER_STATION"), "the Highland Power Station rides with the Sherpa");
  assert.ok(types.has("UNIT_VAISHYA"), "a unit the main tree also unlocks is still a card");
});

test("the Watonathi, which only Mississippian civics unlock, comes with those civics and is read the same in JS", async () => {
  const builder = { leader: AMINA, civ: ROME, pieces: [BUILD.civCivics(MISSISSIPPIAN)] };
  const r = await both({ seed: 36, options: { Mode: MODE.SwapAbilities }, builder });
  try {
    assert.equal(meta(r.res, "CivBuilder"), "ok");
    const db = r.run.db;
    assert.ok(traitsOf(db, ROME).includes("TRAIT_MISSISSIPPIAN"), "Rome holds the Mississippian base trait");
    assert.deepEqual(traitOf(db, "Units", "UnitType", "UNIT_WATONATHI"), ["TRAIT_MISSISSIPPIAN"], "the Watonathi stayed on it");
    assert.deepEqual(rows(db, "SELECT DISTINCT TraitType FROM Units WHERE UnitType LIKE 'UNIT_BURNING_ARROW%'").map((x) => x.TraitType),
      [`TRAIT_LSHUF_CIV_${MISSISSIPPIAN}`], "the Burning Arrow, a main-tree unit, went onto Mississippi's own trait");
    const unitCards = r.res.civPieces.filter((p) => p.Kind === "unique").map((p) => p.PieceId);
    assert.ok(!unitCards.includes(BUILD.civUnique("UNIT_WATONATHI")), "no unique row for it");
    const fk = newForeignKeyRows(db, fixtureForeignKeys("base"));
    assert.deepEqual([fk.fresh, fk.newErrors], [[], []], "no new foreign-key rows");
  } finally {
    r.close();
  }
});

test("a civics swap, the same in JS and SQL and applied: the base trait changes hands, the units stay behind", async () => {
  const builder = { leader: AMINA, civ: ROME, pieces: [BUILD.civCivics(GREECE)] };
  const r = await both({ seed: 36, options: { Mode: MODE.SwapAbilities }, builder });
  try {
    assert.equal(meta(r.res, "CivBuilder"), "ok");
    assert.deepEqual(civRows(r.res, ROME), [[BUILD.civCivics(GREECE), GREECE, "civics", 0]]);
    assert.deepEqual(civRows(r.res, GREECE), [[BUILD.civCivics(ROME), ROME, "civics", 0]]);
    const db = r.run.db;
    const rome = `TRAIT_LSHUF_CIV_${ROME}`;
    const greece = `TRAIT_LSHUF_CIV_${GREECE}`;
    const romeTraits = traitsOf(db, ROME);
    const greekTraits = traitsOf(db, GREECE);
    assert.ok(romeTraits.includes("TRAIT_GREECE") && !romeTraits.includes("TRAIT_ROME") && romeTraits.includes(rome), `Rome: ${romeTraits}`);
    assert.ok(greekTraits.includes("TRAIT_ROME") && !greekTraits.includes("TRAIT_GREECE") && greekTraits.includes(greece), `Greece: ${greekTraits}`);
    assert.deepEqual(revealTrait(db, GREECE), ["TRAIT_GREECE"], "the tree's reveal still asks for the base trait, which Rome now holds");
    assert.deepEqual(traitOf(db, "Traditions", "TraditionType", "TRADITION_AUXILIA_I"), ["TRAIT_ROME"], "traditions stay on the base trait");
    assert.deepEqual(traitOf(db, "Buildings", "ConstructibleType", "BUILDING_BASILICA"), ["TRAIT_ROME"], "so do the tree's buildings");
    assert.deepEqual(traitOf(db, "UniqueQuarters", "UniqueQuarterType", "QUARTER_FORUM"), ["TRAIT_ROME"]);
    assert.deepEqual(rows(db, "SELECT DISTINCT TraitType FROM Units WHERE UnitType LIKE 'UNIT_HOPLITE%'").map((x) => x.TraitType),
      [greece], "Greece's units went onto its own trait");
    assert.deepEqual(rows(db, "SELECT DISTINCT TraitType FROM Units WHERE UnitType LIKE 'UNIT_LEGION%'").map((x) => x.TraitType),
      [rome], "Rome's units went onto its own trait");
    const unlocks = rows(db, "SELECT DISTINCT RequiredTraitType FROM ProgressionTreeNodeUnlocks WHERE TargetType LIKE 'UNIT_HOPLITE%'")
      .map((x) => x.RequiredTraitType);
    assert.deepEqual(unlocks, [greece], "and their unlocks ask for it");
    assert.deepEqual(rows(db, "SELECT ra.Value FROM RequirementArguments ra WHERE ra.RequirementId = 'MOD_CIV_WONDER_PRODUCTION_ROME_SUBJECT_REQUIREMENTS_1'")
      .map((x) => x.Value), ["TRAIT_ROME_ABILITY"], "the ability's own guard asks for the ability trait");
    const fk = newForeignKeyRows(db, fixtureForeignKeys("base"));
    assert.deepEqual([fk.fresh, fk.newErrors], [[], []], "no new foreign-key rows");
  } finally {
    r.close();
  }
});
test("civics shuffle: JS equals SQL for every value, Shuffled moves each tree once in a cycle, Paired follows the ability", async () => {
  for (const Mode of [MODE.SwapAbilities, MODE.None]) {
    for (const CivCivics of [CC_MODE.Paired, CC_MODE.Shuffled, CC_MODE.Off]) {
      const r = await both({ seed: 37, options: { Mode, CivAbilities: CA_MODE.Swapped, CivCivics } });
      r.close();
    }
  }
  const shuffled = await both({ seed: 37, options: { Mode: MODE.SwapAbilities, CivCivics: CC_MODE.Shuffled } });
  try {
    const ages = ageOf(shuffled.run.pre);
    const moved = civicsRows(shuffled.res);
    assert.ok(moved.length >= 17, `every tree moved (${moved.length})`);
    const ids = moved.map((p) => p.PieceId);
    assert.equal(new Set(ids).size, ids.length, "each tree moves once");
    for (const p of moved) {
      assert.equal(ages.get(p.CivilizationType), ages.get(p.FromCivilization), "same age");
      assert.equal(moved.filter((o) => o.FromCivilization === p.CivilizationType).length, 1, `${p.CivilizationType} gives one`);
    }
    assert.deepEqual(shuffled.res.civPieces.filter((p) => p.Kind !== "civics"), [], "only the civics moved");
  } finally {
    shuffled.close();
  }
  const paired = await both({
    seed: 37, options: { Mode: MODE.SwapAbilities, CivAbilities: CA_MODE.Swapped, CivCivics: CC_MODE.Paired }
  });
  try {
    const abilityDonor = new Map(paired.res.civPieces.filter((p) => p.Kind === "ability").map((p) => [p.CivilizationType, p.FromCivilization]));
    const moved = civicsRows(paired.res);
    assert.ok(moved.length > 0, "civics followed");
    for (const p of moved) assert.equal(abilityDonor.get(p.CivilizationType), p.FromCivilization, `${p.CivilizationType}: with the ability`);
  } finally {
    paired.close();
  }
  const pairedAlone = await both({ seed: 37, options: { Mode: MODE.SwapAbilities, CivCivics: CC_MODE.Paired } });
  try {
    assert.deepEqual(pairedAlone.res.civPieces, [], "With the ability under Normal abilities reads as Normal");
  } finally {
    pairedAlone.close();
  }
});

test("civics Off for everyone: no civ holds a base trait (tree, traditions, unlocks), except a builder's swap", async () => {
  const builder = { leader: AMINA, civ: ROME, pieces: [BUILD.civCivics(GREECE)] };
  const r = await both({ seed: 38, options: { Mode: MODE.SwapAbilities, CivCivics: CC_MODE.Off }, builder });
  try {
    assert.equal(meta(r.res, "CivCivicsOff"), "1");
    const db = r.run.db;
    // The base traits whose civics tree the data knows (the reveal modifiers' trait requirements).
    const held = rows(db, "SELECT DISTINCT TraitType FROM CivilizationTraits WHERE TraitType IN (SELECT ra.Value FROM RequirementArguments ra "
      + "WHERE ra.Name = 'TraitType' AND ra.RequirementId IN (SELECT rsr.RequirementId FROM Modifiers m "
      + "JOIN RequirementSetRequirements rsr ON rsr.RequirementSetId = m.SubjectRequirementSetId "
      + "JOIN ModifierArguments ma ON ma.ModifierId = m.ModifierId AND ma.Name = 'ProgressionTreeType')) "
      + "AND TraitType || '_ABILITY' IN (SELECT TraitType FROM Traits) ORDER BY 1").map((x) => x.TraitType);
    assert.deepEqual(held, ["TRAIT_GREECE", "TRAIT_ROME"], "only the swapped pair's base traits are held");
    assert.ok(traitsOf(db, GREECE).includes("TRAIT_ROME") && traitsOf(db, ROME).includes("TRAIT_GREECE"), "the swap still stands");
    assert.ok(!traitsOf(db, EGYPT).includes("TRAIT_EGYPT"), "Egypt lost its civics");
    const egyptUnits = rows(db, "SELECT UnitType FROM Units WHERE TraitType = 'TRAIT_EGYPT' AND UnitType NOT IN (SELECT UnitType FROM LShufWork_CivicUnit)");
    assert.deepEqual(egyptUnits, [], "Egypt's units went onto its own trait first, all but the Tjaty, which goes with the civics");
    assert.ok(traitsOf(db, EGYPT).includes(`TRAIT_LSHUF_CIV_${EGYPT}`), "which Egypt holds");
    const fk = newForeignKeyRows(db, fixtureForeignKeys("base"));
    assert.deepEqual([fk.fresh, fk.newErrors], [[], []], "no new foreign-key rows");
  } finally {
    r.close();
  }
});

// --- CONTRACTS 19: Civilization abilities = Split, the pieces dealt like leader bullets

const GREECE_B = (n) => BUILD.civBullet(GREECE, n);
const CIVA = (civ) => `TRAIT_LSHUF_CIVA_${civ}`;
const pieceRows = (res) => res.civPieces.filter((p) => p.Kind === "bullet" || p.Kind === "remainder");

// The pieces in play on the deal database: the mapping's movable bullets of each civ's own age, for the civs with
// an ability in the game (lshuf-deal-civ.js civPieces).
function piecesInPlay(run) {
  const civs = civsWithAbility(run.pre);
  const ages = ageOf(run.pre);
  return rows(run.db, "SELECT PieceId, CivilizationType, Age FROM LShufCivMapping WHERE Kind = 'bullet' AND Movable = 1 "
    // A bound piece goes with its unique and isn't dealt (CONTRACTS 29); nor is one the game's age drops
    // (LShufCivPieceDead: another age's civ here, Test of Time).
    + "AND PieceId NOT IN (SELECT PieceId FROM LShufBoundPieces) "
    + "AND PieceId NOT IN (SELECT PieceId FROM LShufCivPieceDead WHERE Age = (SELECT Value FROM LShufOptions WHERE Name = 'Age')) ORDER BY 1")
    .filter((m) => civs.includes(m.CivilizationType) && ages.get(m.CivilizationType) === m.Age);
}

test("civ Split: JS equals SQL over three presets, with and without a builder", async () => {
  const builder = { leader: AMINA, civ: ROME, pieces: [GREECE_B(1), GREECE_B(2)] };
  for (const Mode of [MODE.SwapAbilities, MODE.SplitMatched, MODE.None]) {
    for (const b of [null, builder]) {
      const spec = { seed: 41, options: { Mode, CivAbilities: CA_MODE.Split }, builder: b };
      const r = await both(spec);
      try {
        assert.equal(meta(r.res, "CivPiecesActive"), "1", `${Mode}: Split is on`);
        assert.ok(pieceRows(r.res).length > 0, `${Mode}: pieces dealt`);
      } finally {
        r.close();
      }
    }
  }
});

test("civ Split conservation: every piece in play is held once, within its age, each civ gets back as many as it gave", async () => {
  const r = await both({ seed: 43, options: { Mode: MODE.SwapAbilities, CivAbilities: CA_MODE.Split } });
  try {
    const ages = ageOf(r.run.pre);
    const inPlay = piecesInPlay(r.run);
    const bullets = r.res.civPieces.filter((p) => p.Kind === "bullet");
    assert.deepEqual(bullets.map((p) => p.PieceId).sort(), inPlay.map((p) => p.PieceId), "every piece in play held exactly once");
    const gave = new Map();
    const got = new Map();
    for (const p of inPlay) gave.set(p.CivilizationType, (gave.get(p.CivilizationType) || 0) + 1);
    for (const p of bullets) {
      got.set(p.CivilizationType, (got.get(p.CivilizationType) || 0) + 1);
      assert.equal(ages.get(p.CivilizationType), ages.get(p.FromCivilization), `${p.PieceId}: same age`);
      const giver = inPlay.find((x) => x.PieceId === p.PieceId);
      assert.equal(giver.CivilizationType, p.FromCivilization, `${p.PieceId}: FromCivilization is the mapping's civ`);
    }
    for (const [civ, n] of gave) {
      assert.equal(got.get(civ), n, `${civ} gets back as many as it gave`);
      assert.deepEqual(r.res.civPieces.filter((p) => p.CivilizationType === civ && p.Kind === "remainder")
        .map((p) => [p.PieceId, p.FromCivilization]), [[`${civ}__REST`, civ]], `${civ} keeps a remainder`);
      const held = civRows(r.res, civ);
      assert.equal(held[held.length - 1][2], "remainder", `${civ}: the remainder comes last`);
      assert.deepEqual(held.map((h) => h[3]), held.map((_, i) => i), `${civ}: SortIndex runs 0..n`);
    }
    assert.deepEqual(r.res.civPieces.filter((p) => p.Kind === "ability"), [], "no whole ability moved");
  } finally {
    r.close();
  }
});

test("civ Split builder: bonus cards give exactly those pieces and no remainder; the giver can't swap whole", async () => {
  const split = { Mode: MODE.SwapAbilities, CivAbilities: CA_MODE.Split };
  const builder = {
    leader: AMINA, civ: ROME, pieces: [GREECE_B(1), GREECE_B(3), GREECE_B(4), BUILD.civAbility(EGYPT)]
  };
  const r = await both({ seed: 44, options: split, builder });
  try {
    assert.equal(meta(r.res, "CivBuilder"), "ok");
    assert.deepEqual(civRows(r.res, ROME), [
      [BUILD.civAbility(EGYPT), EGYPT, "ability", 0]
    ], "a whole card and bonus cards together: the whole card wins (its ability is no longer in pieces)");
  } finally {
    r.close();
  }
  const bonusOnly = { leader: AMINA, civ: ROME, pieces: [GREECE_B(1), GREECE_B(3), GREECE_B(4)] };
  const b = await both({ seed: 44, options: split, builder: bonusOnly });
  try {
    assert.equal(meta(b.res, "CivBuilder"), "ok");
    assert.deepEqual(civRows(b.res, ROME), [
      [GREECE_B(1), GREECE, "bullet", 0],
      [GREECE_B(3), GREECE, "bullet", 1],
      [GREECE_B(4), GREECE, "bullet", 2]
    ], "Rome holds exactly its three picks, Greece's wonder bonus among them (CONTRACTS 31)");
    const inPlay = piecesInPlay(b.run);
    const bullets = b.res.civPieces.filter((p) => p.Kind === "bullet");
    assert.deepEqual(bullets.map((p) => p.PieceId).sort(), inPlay.map((p) => p.PieceId), "still every piece held once");
    assert.ok(bullets.some((p) => p.FromCivilization === ROME && p.CivilizationType !== ROME), "Rome's own pieces went to others");
  } finally {
    b.close();
  }
  // A second builder can't take Greece's ability whole once slot 1 took a bonus from it.
  const two = await both({
    seed: 44, options: split,
    builders: [bonusOnly, { slot: 2, leader: "LEADER_XERXES", civ: EGYPT, pieces: [BUILD.civAbility(GREECE)] }]
  });
  try {
    assert.equal(meta(two.res, "CivBuilder2"), BUILD_WHY.NoPieces, "Greece is in pieces");
  } finally {
    two.close();
  }
});

test("civ Split apply: held pieces' modifiers copied onto TRAIT_LSHUF_CIVA_<C>, ability row replaced, keys clean", async () => {
  const builder = { leader: AMINA, civ: ROME, pieces: [GREECE_B(1), GREECE_B(2)] };
  const r = await both({ seed: 45, options: { Mode: MODE.SwapAbilities, CivAbilities: CA_MODE.Split }, builder });
  try {
    const db = r.run.db;
    const greekMods = rows(db, "SELECT ModifierId FROM LShufCivMappingModifiers WHERE PieceId IN (?, ?) AND Role IN ('effect', 'hidden') "
      + "AND ModifierId IN (SELECT ModifierId FROM TraitModifiers WHERE TraitType = 'TRAIT_GREECE_ABILITY') ORDER BY 1",
    GREECE_B(1), GREECE_B(2)).map((m) => m.ModifierId);
    assert.ok(greekMods.length >= 2, "the two Greek bonuses have modifiers");
    const onRome = rows(db, "SELECT ModifierId FROM TraitModifiers WHERE TraitType = ? ORDER BY 1", CIVA(ROME)).map((m) => m.ModifierId);
    assert.deepEqual(onRome, greekMods.map((m) => `LSHUF_${ROME}__${m}`), "Rome's new trait carries copies of exactly those");
    for (const m of greekMods) {
      const copy = rows(db, "SELECT ModifierType, SubjectRequirementSetId FROM Modifiers WHERE ModifierId = ?", `LSHUF_${ROME}__${m}`);
      const orig = rows(db, "SELECT ModifierType, SubjectRequirementSetId FROM Modifiers WHERE ModifierId = ?", m);
      assert.deepEqual(copy, orig, `${m}: the copy keeps its type and requirement set`);
      assert.equal(rows(db, "SELECT count(*) AS n FROM ModifierArguments WHERE ModifierId = ?", `LSHUF_${ROME}__${m}`)[0].n,
        rows(db, "SELECT count(*) AS n FROM ModifierArguments WHERE ModifierId = ?", m)[0].n, `${m}: arguments copied`);
    }
    assert.ok(!traitsOf(db, ROME).includes("TRAIT_ROME_ABILITY") && traitsOf(db, ROME).includes(CIVA(ROME)), "Rome's ability row is replaced");
    assert.deepEqual(rows(db, "SELECT Name, Description FROM Traits WHERE TraitType = ?", CIVA(ROME)),
      [{ Name: "LOC_TRAIT_ROME_ABILITY_NAME", Description: "LOC_LSHUF_TRAIT_CIV_DEALT_DESCRIPTION" }]);
    // A receiver: its remainder brings the unlisted modifiers along with the dealt pieces. Greece's wonder bonus is
    // dealt like any other (CONTRACTS 31): whoever holds it carries the named-wonder modifier, never the game's own.
    const greekHeld = civRows(r.res, GREECE);
    assert.equal(greekHeld[greekHeld.length - 1][2], "remainder");
    const onGreece = rows(db, "SELECT ModifierId FROM TraitModifiers WHERE TraitType = ? ORDER BY 1", CIVA(GREECE)).map((m) => m.ModifierId);
    const wonderHolder = rows(db, "SELECT CivilizationType c FROM LShufResultCivPieces WHERE PieceId = ?", GREECE_B(4)).map((x) => x.c);
    assert.equal(wonderHolder.length, 1, "Greece's wonder bonus is dealt to one civ");
    const holderTraits = traitsOf(db, wonderHolder[0]);
    const withWonder = rows(db, "SELECT TraitType FROM TraitModifiers WHERE ModifierId = ?", `LSHUF_WONDER__${GREECE}`).map((x) => x.TraitType);
    assert.ok(withWonder.some((t) => holderTraits.includes(t)), `${wonderHolder[0]} carries Greece's named-wonder bonus`);
    assert.ok(!onGreece.some((m) => m.endsWith("__MOD_CIV_WONDER_PRODUCTION_GREECE")), "nobody keeps the game's own copy");
    for (const m of greekMods) assert.ok(!onGreece.includes(`LSHUF_${GREECE}__${m}`), `${m}: a dealt-away bonus isn't in the remainder`);
    // A requirement that asked for the ability trait asks for the new one.
    const asks = rows(db, "SELECT DISTINCT Value FROM RequirementArguments WHERE Name = 'TraitType' AND Value IN (?, ?)",
      "TRAIT_GREECE_ABILITY", CIVA(GREECE)).map((x) => x.Value);
    assert.ok(!asks.includes("TRAIT_GREECE_ABILITY"), "no requirement still asks for the old ability trait");
    const fk = newForeignKeyRows(db, fixtureForeignKeys("base"));
    assert.deepEqual([fk.fresh, fk.newErrors], [[], []], "no new foreign-key rows");
  } finally {
    r.close();
  }
});

test("Every age: an ability swaps with another age's civ, and its uniques stay put", async () => {
  const pieces = [BUILD.civAbility(SPAIN), BUILD.civUnique("UNIT_CONQUISTADOR")];
  const builder = { leader: AMINA, civ: ROME, pieces };
  const r = await both({ seed: 3, options: { Mode: MODE.SwapAbilities }, builder });
  try {
    assert.equal(meta(r.res, "CivBuilder"), "ok");
    assert.deepEqual(civRows(r.res, ROME), [[BUILD.civAbility(SPAIN), SPAIN, "ability", 0]], "Spain's ability only");
    assert.deepEqual(civRows(r.res, SPAIN), [[BUILD.civAbility(ROME), ROME, "ability", 0]], "Spain gets Rome's");
    const romeTraits = traitsOf(r.run.db, ROME);
    assert.ok(romeTraits.includes("TRAIT_SPAIN_ABILITY") && !romeTraits.includes("TRAIT_ROME_ABILITY"), "Rome holds Spain's ability");
    const fk = newForeignKeyRows(r.run.db, fixtureForeignKeys("base"));
    assert.deepEqual([fk.fresh, fk.newErrors], [[], []], "no new foreign-key rows");
  } finally {
    r.close();
  }
});

// Spain's second bonus (cheaper town conversion) isn't on Spain's ability in Antiquity, so it's out of an Antiquity
// game (LShufCivPieceDead); tests/deal-civ-age-variants.mjs covers what the first one carries there.
test("Every age, Split: another age's bonuses can be taken, the own-age ones and the ones this age drops can't", async () => {
  const split = { Mode: MODE.SwapAbilities, CivAbilities: CA_MODE.Split };
  const spainB = (n) => BUILD.civBullet(SPAIN, n);
  const liberte = "CIVILIZATION_FRENCH_EMPIRE__B01";
  assert.ok(CIV_OWN_AGE_PIECES.includes(liberte));
  const builder = { leader: AMINA, civ: ROME, pieces: [spainB(1), spainB(2), liberte] };
  const r = await both({ seed: 44, options: split, builder });
  try {
    assert.equal(meta(r.res, "CivBuilder"), "ok");
    assert.deepEqual(civRows(r.res, ROME), [
      [spainB(1), SPAIN, "bullet", 0]
    ], "Rome holds Spain's coastal bonus, and not the town conversion (dropped in Antiquity) or Liberté");
    assert.ok(!r.res.civPieces.some((p) => p.PieceId === liberte && p.CivilizationType === ROME), "Liberté stays");
  } finally {
    r.close();
  }
});

test("Iceland's Missionaries bonus does nothing in Antiquity: neither the player nor an AI builder takes it there", async () => {
  const split = { Mode: MODE.SwapAbilities, CivAbilities: CA_MODE.Split };
  const missionaries = "CIVILIZATION_ICELAND__B04";
  const spain1 = BUILD.civBullet(SPAIN, 1);
  const r = await both({
    seed: 44,
    options: split,
    builders: [
      { slot: 1, leader: AMINA, civ: ROME, pieces: [missionaries] },
      { slot: 2, leader: "LEADER_XERXES", civ: EGYPT, pieces: [missionaries, spain1] }
    ]
  });
  try {
    const held = (civ) => r.res.civPieces.filter((p) => p.CivilizationType === civ).map((p) => p.PieceId);
    assert.ok(!held(ROME).includes(missionaries), "the player's Rome can't take a bonus Antiquity drops");
    const ai = await both({
      seed: 44,
      options: split,
      builders: [{ slot: 2, leader: "LEADER_XERXES", civ: EGYPT, pieces: [missionaries, spain1] }]
    });
    try {
      const egypt = ai.res.civPieces.filter((p) => p.CivilizationType === EGYPT).map((p) => p.PieceId);
      assert.ok(!egypt.includes(missionaries), `the AI's Egypt skips it: ${egypt}`);
      assert.ok(egypt.includes(spain1), "the AI's Egypt still takes Spain's coast bonus");
    } finally {
      ai.close();
    }
  } finally {
    r.close();
  }
});

test("Test of Time: Spain started in Antiquity builds as an Antiquity civ and takes Greece's unique", async () => {
  const probe = await runBoth({ spec: { seed: 3, options: { Mode: MODE.None } } });
  const { unit } = sources(probe.run.pre);
  probe.run.close();
  const builder = { leader: AMINA, civ: SPAIN, pieces: [BUILD.civUnique(unit)] };
  const tot = await both({ seed: 3, options: { Mode: MODE.None }, builder, age: "AGE_ANTIQUITY" });
  try {
    assert.deepEqual(civRows(tot.res, SPAIN), [[BUILD.civUnique(unit), GREECE, "unique", 1]], "Spain takes the unit");
  } finally {
    tot.close();
  }
  const unknown = await both({ seed: 3, options: { Mode: MODE.None }, builder, age: "" });
  try {
    assert.deepEqual(civRows(unknown.res, SPAIN), [], "with no age known Spain stays an Exploration civ");
  } finally {
    unknown.close();
  }
});

// --- CONTRACTS 21: civics in pieces


const AGOGE = "NODE_CIVIC_AQ_GREECE_AGOGE";
const nodeTree = (db, node) => rows(db, "SELECT ProgressionTree FROM ProgressionTreeNodes WHERE ProgressionTreeNodeType = ?", node)[0].ProgressionTree;

test("a civic card: Agoge moves into Rome's tree with Ekklesia, the whole Acropolis and the Logios, the same in JS and SQL", async () => {
  const builder = { leader: AMINA, civ: ROME, pieces: [BUILD.civCivic(AGOGE)] };
  const r = await both({ seed: 36, options: { Mode: MODE.SwapAbilities }, builder });
  try {
    assert.equal(meta(r.res, "CivBuilder"), "ok");
    const EKKLESIA = "NODE_CIVIC_AQ_GREECE_EKKLESIA";
    assert.deepEqual(civRows(r.res, ROME), [[BUILD.civCivic(AGOGE), GREECE, "civic", 1], [BUILD.civCivic(EKKLESIA), GREECE, "civic", 1]],
      "the Acropolis's other civic comes along");
    const db = r.run.db;
    assert.equal(nodeTree(db, AGOGE), "TREE_CIVICS_AQ_ROME", "the node sits in Rome's tree");
    assert.equal(nodeTree(db, EKKLESIA), "TREE_CIVICS_AQ_ROME", "and its partner");
    assert.deepEqual(rows(db, "SELECT Node FROM ProgressionTreePrereqs WHERE PrereqNode = ?", AGOGE), [], "Symmachia no longer needs it");
    const own = `TRAIT_LSHUF_CIV_${ROME}`;
    assert.deepEqual(traitOf(db, "Buildings", "ConstructibleType", "BUILDING_PARTHENON"), [own], "the Parthenon is Rome's");
    assert.deepEqual(traitOf(db, "Buildings", "ConstructibleType", "BUILDING_ODEON"), [own], "and the Odeon");
    assert.deepEqual(traitOf(db, "UniqueQuarters", "UniqueQuarterType", "QUARTER_ACROPOLIS"), [own], "so the Acropolis is Rome's");
    assert.deepEqual(rows(db, "SELECT DISTINCT TraitType FROM Units WHERE UnitType LIKE 'UNIT_LOGIOS%'").map((x) => x.TraitType), [own],
      "the Logios, earned only with an Acropolis, went with it");
    assert.ok(traitsOf(db, ROME).includes(`TRAIT_LSHUF_CIV_${ROME}`), "Rome holds its own trait");
    const fk = newForeignKeyRows(db, fixtureForeignKeys("base"));
    assert.deepEqual([fk.fresh, fk.newErrors], [[], []], "no new foreign-key rows");
  } finally {
    r.close();
  }
});

test("civics Split up: JS equals SQL, every civic of the age is held once and each civ gets back as many as it had", async () => {
  for (const seed of [7, 44]) {
    const r = await both({ seed, options: { Mode: MODE.SwapAbilities, CivCivics: CC_MODE.Split } });
    try {
      const all = r.res.civPieces.filter((p) => p.Kind === "civic");
      const riders = new Map(rows(r.run.db, "SELECT Rider, Lead FROM LShufWork_CivRider WHERE Kind = 'civic'").map((x) => [x.Rider, x.Lead]));
      assert.ok(riders.size >= 8, `seed ${seed}: the quarter civics ride together (${riders.size})`);
      for (const p of all.filter((x) => riders.has(x.PieceId))) {
        const lead = all.find((x) => x.PieceId === riders.get(p.PieceId));
        assert.equal(lead && lead.CivilizationType, p.CivilizationType, `seed ${seed}: ${p.PieceId} is held with ${riders.get(p.PieceId)}`);
      }
      // Conservation counts bundles: a lead and its riders are one card.
      const civic = all.filter((p) => !riders.has(p.PieceId));
      assert.ok(civic.length > 30, `seed ${seed}: ${civic.length} civics dealt`);
      const ids = civic.map((p) => p.PieceId);
      assert.equal(new Set(ids).size, ids.length, "each civic held once");
      const pre = r.run.pre;
      const nodes = rows(pre, `SELECT n.ProgressionTreeNodeType node, n.ProgressionTree tree FROM ProgressionTreeNodes n
        WHERE n.ProgressionTree LIKE 'TREE\\_CIVICS\\_AQ\\_%' ESCAPE '\\' AND n.ProgressionTree NOT IN ('TREE_CIVICS_AQ_MAIN', 'TREE_CIVICS_AQ_TEST_OF_TIME')`);
      assert.equal(all.length, nodes.length, `seed ${seed}: every civic in the pool is dealt`);
      const gave = new Map();
      const got = new Map();
      for (const p of civic) {
        gave.set(p.FromCivilization, (gave.get(p.FromCivilization) || 0) + 1);
        got.set(p.CivilizationType, (got.get(p.CivilizationType) || 0) + 1);
      }
      for (const [civ, n] of gave) assert.equal(got.get(civ), n, `seed ${seed}: ${civ} gets back ${n}`);
      const db = r.run.db;
      for (const p of all) {
        const tree = nodeTree(db, p.PieceId.slice("CIVNODE_".length));
        const own = rows(db, "SELECT Tree FROM LShufWork_CivFinalTree WHERE Civ = ?", p.CivilizationType)[0];
        assert.equal(tree, own.Tree, `${p.PieceId} sits in ${p.CivilizationType}'s tree`);
      }
      const cross = rows(db, `SELECT count(*) n FROM ProgressionTreePrereqs p JOIN ProgressionTreeNodes a ON a.ProgressionTreeNodeType = p.Node
        JOIN ProgressionTreeNodes b ON b.ProgressionTreeNodeType = p.PrereqNode WHERE a.ProgressionTree <> b.ProgressionTree`)[0].n;
      assert.equal(cross, 0, "no prerequisite crosses trees");
    } finally {
      r.close();
    }
  }
});

test("uniques Split up: JS equals SQL, every unique held once, each civ gets back as many as it had, a builder's take stays", async () => {
  const probe = await runBoth({ spec: { seed: 9, options: { Mode: MODE.None } } });
  const { unit } = sources(probe.run.pre);
  probe.run.close();
  const builder = { leader: AMINA, civ: ROME, pieces: [BUILD.civUnique(unit)] };
  const r = await both({ seed: 9, options: { Mode: MODE.None, CivUniques: CU_MODE.Split }, builder });
  try {
    const uniq = r.res.civPieces.filter((p) => p.Kind === "unique");
    const ids = uniq.map((p) => p.PieceId);
    assert.equal(new Set(ids).size, ids.length, "each unique held once");
    assert.ok(uniq.find((p) => p.PieceId === BUILD.civUnique(unit) && p.CivilizationType === ROME), "Rome keeps its take");
    assert.equal(uniq.filter((p) => p.CivilizationType === ROME).length, 1, "a taker gets nothing from the pool");
    const gave = new Map();
    const got = new Map();
    for (const p of uniq) {
      if (p.CivilizationType === ROME) continue;
      gave.set(p.FromCivilization, (gave.get(p.FromCivilization) || 0) + 1);
      got.set(p.CivilizationType, (got.get(p.CivilizationType) || 0) + 1);
    }
    for (const [civ, n] of got) assert.ok(n >= 1, `${civ} got ${n}`);
    assert.equal(traitOf(r.run.db, "Units", "UnitType", unit)[0], `TRAIT_LSHUF_CIV_${ROME}`, "the taken unit moved");
  } finally {
    r.close();
  }
});

test("Test of Time: America started in Antiquity takes Agoge into the age's Test of Time tree, gated on its own trait", async () => {
  const AMERICA = "CIVILIZATION_AMERICA";
  const builder = { leader: AMINA, civ: AMERICA, pieces: [BUILD.civCivic(AGOGE)] };
  const r = await both({ seed: 36, options: { Mode: MODE.None }, builder, age: "AGE_ANTIQUITY" });
  try {
    assert.deepEqual(civRows(r.res, AMERICA), [[BUILD.civCivic(AGOGE), GREECE, "civic", 1],
      [BUILD.civCivic("NODE_CIVIC_AQ_GREECE_EKKLESIA"), GREECE, "civic", 1]]);
    const db = r.run.db;
    assert.equal(nodeTree(db, AGOGE), "TREE_CIVICS_AQ_TEST_OF_TIME");
    const own = `TRAIT_LSHUF_CIV_${AMERICA}`;
    assert.deepEqual(rows(db, "SELECT RequiredTraitType t FROM ProgressionTreeNodeTraits WHERE ProgressionTreeNodeType = ?", AGOGE).map((x) => x.t), [own]);
    assert.ok(traitsOf(db, AMERICA).includes(own), "America holds its own trait");
    assert.deepEqual(traitOf(db, "Buildings", "ConstructibleType", "BUILDING_PARTHENON"), [own], "the Parthenon is America's");
    const fk = newForeignKeyRows(db, fixtureForeignKeys("base"));
    assert.deepEqual([fk.fresh, fk.newErrors], [[], []], "no new foreign-key rows");
  } finally {
    r.close();
  }
});
