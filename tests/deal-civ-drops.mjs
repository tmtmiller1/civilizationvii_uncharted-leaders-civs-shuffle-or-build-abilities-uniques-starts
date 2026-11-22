// Own uniques taken out (CONTRACTS 35): a builder's CIVDROP_ card takes one of its civ's own uniques off it and deals
// it to another civ of the age, where a builder keeps its own uniques; the same in JS and SQL. On the base fixture
// (Antiquity): Amina building Rome.
import assert from "node:assert/strict";
import test from "node:test";

import { assertSameResult, rows } from "./_harness.mjs";
import { label, runBoth } from "./_deal.mjs";
import { BUILD, BUILD_WHY, CU_MODE, MODE } from "../shared/lshuf-constants.js";

const AMINA = "LEADER_AMINA";
const XERXES = "LEADER_XERXES";
const ROME = "CIVILIZATION_ROME";
const EGYPT = "CIVILIZATION_EGYPT";

const meta = (res, name) => (res.meta.find((r) => r.Name === name) || {}).Value;
const uniqueRows = (res) => res.civPieces.filter((p) => p.Kind === "unique");
const stripTags = (res) => ({ ...res, civPieces: res.civPieces.filter((p) => p.Kind !== "tags") });

async function both(spec, hooks = []) {
  const r = await runBoth({ spec, hooks });
  try {
    assertSameResult(r.js, r.sql, `${label("base", spec)}: computeDeal vs SQL`);
    return { res: stripTags(r.objects("sql")), run: r.run, close: () => r.run.close() };
  } catch (e) {
    r.run.close();
    throw e;
  }
}

// Rome's own unique units as the deal sees them (family bases, not civic-unlocked), from a run's work table.
async function romeUniques() {
  const r = await runBoth({ spec: { seed: 7, options: { Mode: MODE.SwapAbilities } } });
  try {
    return rows(r.run.db, "SELECT Type FROM LShufWork_CivUnique WHERE Civ = ? AND Kind = 'unit' ORDER BY Type", ROME)
      .map((x) => x.Type);
  } finally {
    r.run.close();
  }
}

const ageOf = (db, civ) => (rows(db, "SELECT COALESCE(Play, Age) AS A FROM LShufWork_CivInfo WHERE Civ = ?", civ)[0] || {}).A;

test("Base game: a dropped own unique goes to another civ of the age, and the build counts", async () => {
  const [unit] = await romeUniques();
  assert.ok(unit, "the fixture has a Roman unique unit");
  const spec = { seed: 7, options: { Mode: MODE.SwapAbilities },
    builder: { leader: AMINA, civ: ROME, pieces: [BUILD.civUniqueDrop(unit)] } };
  const r = await both(spec);
  try {
    assert.equal(meta(r.res, "CivBuilder"), "ok", "a drop-only build still built something");
    const moved = uniqueRows(r.res).filter((p) => p.PieceId === BUILD.civUnique(unit));
    assert.equal(moved.length, 1, "the unique goes to one civ");
    const [row] = moved;
    assert.equal(row.FromCivilization, ROME);
    assert.notEqual(row.CivilizationType, ROME);
    assert.equal(ageOf(r.run.db, row.CivilizationType), ageOf(r.run.db, ROME), "to a civ of Rome's age");
    assert.equal(Number(row.SortIndex), 1, "its only unique row");
    const trait = rows(r.run.db, "SELECT TraitType FROM Units WHERE UnitType = ?", unit)[0].TraitType;
    assert.equal(trait, `TRAIT_LSHUF_CIV_${row.CivilizationType}`, "the apply moved the unit off Rome");
  } finally {
    r.close();
  }
});

test("Shuffled: the drop goes after the receiver's shuffled set, and every unique moves once", async () => {
  const [unit] = await romeUniques();
  const spec = { seed: 7, options: { Mode: MODE.SwapAbilities, CivUniques: CU_MODE.Shuffled },
    builder: { leader: AMINA, civ: ROME, pieces: [BUILD.civUniqueDrop(unit)] } };
  const r = await both(spec);
  try {
    const all = uniqueRows(r.res);
    const ids = all.map((p) => `${p.CivilizationType}|${p.PieceId}`);
    assert.equal(new Set(all.map((p) => p.PieceId)).size, all.length, "each unique moves once");
    assert.equal(new Set(ids).size, ids.length);
    const [row] = all.filter((p) => p.PieceId === BUILD.civUnique(unit));
    assert.equal(row.FromCivilization, ROME);
    const others = all.filter((p) => p.CivilizationType === row.CivilizationType && p.PieceId !== row.PieceId);
    assert.ok(others.every((p) => Number(p.SortIndex) < Number(row.SortIndex)), "numbered after the shuffled set");
    assert.ok(!all.some((p) => p.FromCivilization === ROME && p.PieceId !== row.PieceId),
      "Rome's other unique stays with Rome");
  } finally {
    r.close();
  }
});

test("a drop of a unique another builder took, or of a unique the civ doesn't hold, is ignored", async () => {
  const [unit, second] = await romeUniques();
  const spec = { seed: 9, options: { Mode: MODE.SwapAbilities },
    builders: [
      { slot: 1, leader: AMINA, civ: EGYPT, pieces: [BUILD.civUnique(unit)] },
      { slot: 2, leader: XERXES, civ: ROME, pieces: [BUILD.civUniqueDrop(unit)] }
    ] };
  const r = await both(spec);
  try {
    const moved = uniqueRows(r.res).filter((p) => p.PieceId === BUILD.civUnique(unit));
    assert.deepEqual(moved.map((p) => p.CivilizationType), [EGYPT], "Egypt's take stands");
    assert.equal(meta(r.res, "CivBuilder2"), BUILD_WHY.NoPieces, "Rome's only card did nothing");
  } finally {
    r.close();
  }
  if (!second) return;
  const foreign = await both({ seed: 9, options: { Mode: MODE.SwapAbilities },
    builder: { leader: AMINA, civ: EGYPT, pieces: [BUILD.civUniqueDrop(second)] } });
  try {
    assert.deepEqual(uniqueRows(foreign.res), [], "Egypt can't drop Rome's unique");
  } finally {
    foreign.close();
  }
});

test("with no civ of the age left to take it, the unique stays", async () => {
  const [unit] = await romeUniques();
  // A builder plays in the game's age, so every other civ moves to an age of its own.
  const lonely = { before: 20010, run: (db) => db.exec(
    "UPDATE LegacyCivilizations SET Age = 'AGE_LSHUF_ELSEWHERE' WHERE CivilizationType <> 'CIVILIZATION_ROME'") };
  const spec = { seed: 11, options: { Mode: MODE.SwapAbilities },
    builder: { leader: AMINA, civ: ROME, pieces: [BUILD.civUniqueDrop(unit)] } };
  const r = await both(spec, [lonely]);
  try {
    assert.deepEqual(uniqueRows(r.res).filter((p) => p.PieceId === BUILD.civUnique(unit)), [], "no row for it");
  } finally {
    r.close();
  }
});

test("no drop, or a drop under Split up or Off entirely, deals exactly as without it", async () => {
  const [unit] = await romeUniques();
  for (const CivUniques of [CU_MODE.Normal, CU_MODE.Shuffled, CU_MODE.Split, CU_MODE.Off]) {
    const options = { Mode: MODE.SwapAbilities, CivUniques };
    const base = [BUILD.civAbility(EGYPT)];
    const plain = await both({ seed: 13, options, builder: { leader: AMINA, civ: ROME, pieces: base } });
    const withDrop = await both({ seed: 13, options,
      builder: { leader: AMINA, civ: ROME, pieces: [...base, BUILD.civUniqueDrop(unit)] } });
    try {
      const strip = (res) => res.civPieces.filter((p) => p.PieceId !== BUILD.civUnique(unit)
        || p.FromCivilization !== ROME || p.Kind !== "unique");
      if (CivUniques === CU_MODE.Split || CivUniques === CU_MODE.Off) {
        assert.deepEqual(withDrop.res.civPieces, plain.res.civPieces, `${CivUniques}: the drop does nothing`);
      } else {
        // The drop marks the unique taken, so only its own row may differ (and, under Shuffled, the receiver's).
        assert.ok(withDrop.res.civPieces.some((p) => p.PieceId === BUILD.civUnique(unit)), `${CivUniques}: dropped`);
        assert.deepEqual(strip(withDrop.res).filter((p) => p.Kind !== "unique"), strip(plain.res).filter((p) => p.Kind !== "unique"),
          `${CivUniques}: abilities and civics as before`);
      }
    } finally {
      plain.close();
      withDrop.close();
    }
  }
});
