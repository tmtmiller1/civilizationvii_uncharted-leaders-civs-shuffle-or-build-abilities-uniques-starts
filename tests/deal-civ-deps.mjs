// Pieces that need each other travel together (CONTRACTS 23): civic bundles (a quarter's two civics, LShufCivLinks),
// unique bundles (an improvement only one unit builds), great people a quarter earns (R1) and bound modifiers (R4),
// the same in JS and SQL, in every civ setting, for the random deal and for builders. On the Antiquity base fixture;
// the unique bundle uses a synthetic builder row, since Nepal's Sherpa is Modern.
import assert from "node:assert/strict";
import test from "node:test";

import { assertSameResult, fixtureForeignKeys, newForeignKeyRows, rows } from "./_harness.mjs";
import { label, runBoth } from "./_deal.mjs";
import { BUILD, CA_MODE, CC_MODE, CU_MODE, MODE } from "../shared/lshuf-constants.js";

const AMINA = "LEADER_AMINA";
const ROME = "CIVILIZATION_ROME";
const GREECE = "CIVILIZATION_GREECE";
const AKSUM = "CIVILIZATION_AKSUM";
const AGOGE = "NODE_CIVIC_AQ_GREECE_AGOGE";
const EKKLESIA = "NODE_CIVIC_AQ_GREECE_EKKLESIA";

// Aksum's Hawelt made a main-tree improvement only the Tankwa builds: a unique bundle like Nepal's.
const hawelt = {
  before: 20010,
  run: (db) => {
    db.exec("DELETE FROM ProgressionTreeNodeUnlocks WHERE TargetType = 'IMPROVEMENT_HAWELT'");
    db.exec("INSERT INTO Unit_BuildConstructibles (UnitType, ConstructibleType) VALUES ('UNIT_TANKWA', 'IMPROVEMENT_HAWELT')");
  }
};

async function both(spec, hooks = []) {
  const r = await runBoth({ spec, hooks });
  try {
    assertSameResult(r.js, r.sql, `${label("base", spec)} ${JSON.stringify(spec.options)}: computeDeal vs SQL`);
    return { res: r.objects("sql"), db: r.run.db, run: r.run, close: () => r.run.close() };
  } catch (e) {
    r.run.close();
    throw e;
  }
}

const riderMap = (db) => new Map(rows(db, "SELECT Rider, Lead FROM LShufWork_CivRider").map((x) => [x.Rider, x.Lead]));

// No rider is held apart from its lead, and every lead row has its riders.
function ridersWithLeads(res, db, what) {
  const riders = riderMap(db);
  const held = res.civPieces;
  for (const p of held.filter((x) => riders.has(x.PieceId))) {
    const lead = held.find((x) => x.PieceId === riders.get(p.PieceId) && x.CivilizationType === p.CivilizationType);
    assert.ok(lead, `${what}: ${p.PieceId} held by ${p.CivilizationType} without ${riders.get(p.PieceId)}`);
  }
  for (const [rider, lead] of riders) {
    for (const l of held.filter((x) => x.PieceId === lead)) {
      assert.ok(held.find((x) => x.PieceId === rider && x.CivilizationType === l.CivilizationType), `${what}: ${lead} came without ${rider}`);
    }
  }
}

// Every great person a quarter earns sits on the trait its quarter's building sits on.
function greatPeopleWithQuarters(db, what) {
  const off = rows(db, `SELECT g.UnitType, u.TraitType unitTrait, COALESCE(
      (SELECT b.TraitType FROM Buildings b WHERE b.ConstructibleType = g.Anchor),
      (SELECT m.TraitType FROM Improvements m WHERE m.ConstructibleType = g.Anchor)) anchorTrait
    FROM LShufWork_CivicGP g JOIN Units u ON u.UnitType = g.UnitType`).filter((x) => x.unitTrait !== x.anchorTrait);
  assert.deepEqual(off, [], `${what}: a great person apart from its quarter`);
}

// Every bound modifier sits only on its anchor's trait, copies included.
function boundOnAnchors(db, what) {
  const bound = rows(db, "SELECT ModifierId, Trait FROM LShufWork_Bound");
  for (const b of bound) {
    const on = rows(db, "SELECT TraitType FROM TraitModifiers WHERE ModifierId = ? OR ModifierId LIKE ?", b.ModifierId, `LSHUF\\_%\\_\\_${b.ModifierId}`)
      .map((x) => x.TraitType);
    assert.deepEqual(on, [b.Trait], `${what}: ${b.ModifierId} sits on ${b.Trait} only`);
  }
  return bound.length;
}

function noNewKeys(db, what) {
  const fk = newForeignKeyRows(db, fixtureForeignKeys("base"));
  assert.deepEqual([fk.fresh, fk.newErrors], [[], []], `${what}: no new foreign-key rows`);
}

test("the Antiquity bundles: each quarter's two civics, the great people with them, the synthetic Hawelt with the Tankwa", async () => {
  const r = await both({ seed: 3, options: { Mode: MODE.None } }, [hawelt]);
  try {
    const riders = riderMap(r.db);
    assert.equal(riders.get(BUILD.civCivic(EKKLESIA)), BUILD.civCivic(AGOGE), "Ekklesia rides with Agoge");
    const civic = [...riders.keys()].filter((id) => id.startsWith("CIVNODE_"));
    assert.equal(civic.length, 8, `the eight Antiquity quarters split over two civics (${civic.join(", ")})`);
    assert.equal(riders.get(BUILD.civUnique("IMPROVEMENT_HAWELT")), BUILD.civUnique("UNIT_TANKWA"));
    const gp = rows(r.db, "SELECT DISTINCT Anchor FROM LShufWork_CivicGP ORDER BY 1").map((x) => x.Anchor);
    for (const b of ["BUILDING_MASTABA", "BUILDING_ODEON"]) assert.ok(gp.includes(b), `a great person tied to ${b}'s quarter (${gp})`);
    assert.ok(!r.res.civPieces.length, "Base game moves nothing");
  } finally {
    r.close();
  }
});

test("civics and uniques Split up over several seeds: riders stay with leads, great people with their quarters", async () => {
  for (const seed of [3, 21, 58]) {
    for (const CivAbilities of [CA_MODE.Normal, CA_MODE.Split]) {
      const options = { Mode: MODE.None, CivCivics: CC_MODE.Split, CivUniques: CU_MODE.Split, CivAbilities };
      const what = `seed ${seed} ${CivAbilities}`;
      const r = await both({ seed, options }, [hawelt]);
      try {
        ridersWithLeads(r.res, r.db, what);
        greatPeopleWithQuarters(r.db, what);
        const riders = riderMap(r.db);
        for (const kind of ["civic", "unique"]) {
          const cards = r.res.civPieces.filter((p) => p.Kind === kind && !riders.has(p.PieceId));
          const gave = new Map();
          const got = new Map();
          for (const p of cards) {
            gave.set(p.FromCivilization, (gave.get(p.FromCivilization) || 0) + 1);
            got.set(p.CivilizationType, (got.get(p.CivilizationType) || 0) + 1);
          }
          for (const [civ, n] of gave) assert.equal(got.get(civ), n, `${what}: ${civ} gets back ${n} ${kind} cards`);
        }
        const quarters = rows(r.db, `SELECT q.UniqueQuarterType, a.TraitType t1, b.TraitType t2 FROM UniqueQuarters q
          JOIN Buildings a ON a.ConstructibleType = q.BuildingType1 JOIN Buildings b ON b.ConstructibleType = q.BuildingType2`);
        assert.deepEqual(quarters.filter((q) => q.t1 !== q.t2), [], `${what}: no quarter's buildings split`);
        assert.ok(boundOnAnchors(r.db, what) >= 2, `${what}: the Antiquity bound modifiers are placed`);
        noNewKeys(r.db, what);
      } finally {
        r.close();
      }
    }
  }
});

test("JS equals SQL for every value of the three civ rows, the others on Split up", async () => {
  const cases = [
    ...Object.values(CA_MODE).map((v) => ({ CivAbilities: v, CivUniques: CU_MODE.Split, CivCivics: CC_MODE.Split })),
    ...Object.values(CU_MODE).map((v) => ({ CivAbilities: CA_MODE.Split, CivUniques: v, CivCivics: CC_MODE.Split })),
    ...Object.values(CC_MODE).map((v) => ({ CivAbilities: CA_MODE.Split, CivUniques: CU_MODE.Split, CivCivics: v }))
  ];
  for (const civ of cases) {
    const r = await both({ seed: 11, options: { Mode: MODE.SwapAbilities, ...civ } }, [hawelt]);
    try {
      const what = JSON.stringify(civ);
      ridersWithLeads(r.res, r.db, what);
      greatPeopleWithQuarters(r.db, what);
      boundOnAnchors(r.db, what);
      noNewKeys(r.db, what);
    } finally {
      r.close();
    }
  }
});

// A pick reaches the SQL only through its card's action group, and riders aren't cards, so only a civic rider (every
// node has a group) can be picked; a unique bundle is picked by its lead.
test("a builder's pick of a civic rider takes the whole bundle, and a unique lead brings its rider", async () => {
  const pieces = [BUILD.civCivic(EKKLESIA), BUILD.civUnique("UNIT_TANKWA")];
  const r = await both({ seed: 5, options: { Mode: MODE.None, CivUniques: CU_MODE.Split, CivCivics: CC_MODE.Split },
    builder: { leader: AMINA, civ: ROME, pieces } }, [hawelt]);
  try {
    const mine = r.res.civPieces.filter((p) => p.CivilizationType === ROME)
      .map((p) => [p.PieceId, p.FromCivilization, p.Kind]).sort();
    assert.deepEqual(mine, [
      [BUILD.civCivic(AGOGE), GREECE, "civic"],
      [BUILD.civCivic(EKKLESIA), GREECE, "civic"],
      [BUILD.civUnique("IMPROVEMENT_HAWELT"), AKSUM, "unique"],
      [BUILD.civUnique("UNIT_TANKWA"), AKSUM, "unique"]
    ]);
    const own = `TRAIT_LSHUF_CIV_${ROME}`;
    assert.deepEqual(rows(r.db, "SELECT DISTINCT TraitType FROM Units WHERE UnitType LIKE 'UNIT_TANKWA%'").map((x) => x.TraitType), [own]);
    assert.deepEqual(rows(r.db, "SELECT TraitType FROM Improvements WHERE ConstructibleType = 'IMPROVEMENT_HAWELT'").map((x) => x.TraitType), [own]);
    ridersWithLeads(r.res, r.db, "builder");
    greatPeopleWithQuarters(r.db, "builder");
    noNewKeys(r.db, "builder");
  } finally {
    r.close();
  }
});

test("bound modifiers: Carthage's Colonist rule follows the Colonist, and Base game leaves it with Carthage", async () => {
  const base = await both({ seed: 2, options: { Mode: MODE.None } });
  try {
    const on = rows(base.db, "SELECT DISTINCT TraitType FROM TraitModifiers WHERE ModifierId IN ('TRAIT_MOD_COLONIST_POP', 'MOD_CIV_DOUBLE_COLONISTS', 'MOD_CIV_DOUBLE_MERCHANTS')").map((x) => x.TraitType);
    assert.deepEqual(on, ["TRAIT_CARTHAGE_ABILITY"], "a game the civ deal doesn't touch keeps it where it ships");
  } finally {
    base.close();
  }
  // Rome takes the Colonist, and the whole "second Merchant or Colonist" bonus comes with it (LShufBoundPieces):
  // every one of its modifiers, copies included, sits only on the trait Rome's Colonist is on, whatever Carthage's
  // ability does.
  const BONUS = ["TRAIT_MOD_COLONIST_POP", "MOD_CIV_DOUBLE_COLONISTS", "MOD_CIV_DOUBLE_MERCHANTS"];
  for (const CivAbilities of [CA_MODE.Split, CA_MODE.Swapped, CA_MODE.Normal]) {
    const r = await both({ seed: 2, options: { Mode: MODE.None, CivAbilities },
      builder: { leader: AMINA, civ: ROME, pieces: [BUILD.civUnique("UNIT_COLONIST")] } });
    try {
      const own = `TRAIT_LSHUF_CIV_${ROME}`;
      assert.deepEqual(rows(r.db, "SELECT TraitType FROM Units WHERE UnitType = 'UNIT_COLONIST'").map((x) => x.TraitType), [own]);
      for (const id of BONUS) {
        const on = rows(r.db, "SELECT TraitType FROM TraitModifiers WHERE ModifierId = ? OR ModifierId LIKE ? ESCAPE '\\'",
          id, `%\\_\\_${id}`).map((x) => x.TraitType);
        assert.deepEqual(on, [own], `${CivAbilities}: ${id} is only on the trait Rome's Colonist is on`);
      }
      const dealt = rows(r.db, "SELECT CivilizationType FROM LShufResultCivPieces WHERE PieceId = 'CIVILIZATION_CARTHAGE__B02'");
      assert.deepEqual(dealt, [], `${CivAbilities}: the bonus isn't dealt on its own`);
      noNewKeys(r.db, `Colonist ${CivAbilities}`);
    } finally {
      r.close();
    }
  }
});

test("a builder who takes the bonus's own card holds it; the Colonist's holder doesn't get it as well", async () => {
  const DOUBLE = ["MOD_CIV_DOUBLE_COLONISTS", "MOD_CIV_DOUBLE_MERCHANTS"];
  // The traits some civilization holds that carry the modifier or a copy of it (a trait nobody holds does nothing).
  const traitsOf = (db, id) => rows(db, `SELECT DISTINCT tm.TraitType FROM TraitModifiers tm
    WHERE (tm.ModifierId = ? OR tm.ModifierId LIKE ? ESCAPE '\\')
      AND tm.TraitType IN (SELECT TraitType FROM CivilizationTraits)`, id, `%\\_\\_${id}`).map((x) => x.TraitType).sort();
  for (const withColonist of [false, true]) {
    const pieces = ["CIVILIZATION_CARTHAGE__B02", ...(withColonist ? [BUILD.civUnique("UNIT_COLONIST")] : [])];
    const r = await both({ seed: 2, options: { Mode: MODE.None, CivAbilities: CA_MODE.Split },
      builder: { leader: AMINA, civ: ROME, pieces } });
    try {
      const what = withColonist ? "bonus and Colonist" : "bonus alone";
      const held = rows(r.db, "SELECT CivilizationType FROM LShufResultCivPieces WHERE PieceId = 'CIVILIZATION_CARTHAGE__B02'");
      assert.deepEqual(held.map((x) => x.CivilizationType), [ROME], `${what}: Rome holds the bonus card`);
      for (const id of DOUBLE) {
        assert.deepEqual(traitsOf(r.db, id), [`TRAIT_LSHUF_CIVA_${ROME}`], `${what}: ${id} is on Rome's dealt ability alone`);
      }
      const colonist = rows(r.db, "SELECT TraitType FROM Units WHERE UnitType = 'UNIT_COLONIST'")[0].TraitType;
      assert.deepEqual(traitsOf(r.db, "TRAIT_MOD_COLONIST_POP"), [colonist], `${what}: the Colonist's own rule stays with the Colonist`);
      assert.equal(colonist === `TRAIT_LSHUF_CIV_${ROME}`, withColonist, `${what}: where the Colonist is`);
      noNewKeys(r.db, what);
    } finally {
      r.close();
    }
  }
});
