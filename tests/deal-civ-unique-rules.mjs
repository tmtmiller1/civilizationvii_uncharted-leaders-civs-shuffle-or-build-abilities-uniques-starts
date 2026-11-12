// Every civilization bonus moves (CONTRACTS 31). The favored-wonder bonuses are dealt and, once the civ deal runs,
// held as a modifier of the mod's own that names the giver's wonder; Assyria's "Codices are not awarded from
// Technologies" follows whoever holds it; a game the civ deal doesn't touch stays as shipped. JS equals SQL.
import assert from "node:assert/strict";
import test from "node:test";

import { assertSameResult, fixtureForeignKeys, newForeignKeyRows, rows } from "./_harness.mjs";
import { runBoth } from "./_deal.mjs";
import { BUILD, CA_MODE, CIV_OWN_AGE_PIECES, MODE } from "../shared/lshuf-constants.js";
import { CIV_WONDER_PIECES } from "../shared/lshuf-civ-wonder-pieces.js";

const ASSYRIA = "CIVILIZATION_ASSYRIA";
const RULE = "CIVILIZATION_ASSYRIA__B02";
const MARKER = `TRAIT_LSHUF_RULE_${RULE}`;
const CODEX = "('MOD_AQ_CODEX_REDUX', 'MOD_AQ_MATHEMATICS_CODEX_REDUX')";

const noNewKeys = (r, where) => {
  const fk = newForeignKeyRows(r.run.db, fixtureForeignKeys(r.fixture || "base"));
  assert.deepEqual([fk.fresh, fk.newErrors], [[], []], `${where}: no new foreign-key rows`);
};
const favored = (db) => rows(db, `SELECT tm.TraitType, tm.ModifierId FROM TraitModifiers tm JOIN Modifiers m ON m.ModifierId = tm.ModifierId
  JOIN DynamicModifiers d ON d.ModifierType = m.ModifierType WHERE d.EffectType = 'EFFECT_CITY_ADJUST_FAVORED_WONDER_PRODUCTION'
  AND tm.TraitType IN (SELECT TraitType FROM CivilizationTraits)`);
const named = (db) => rows(db, `SELECT ct.CivilizationType civ, tm.ModifierId id,
    (SELECT Value FROM ModifierArguments a WHERE a.ModifierId = tm.ModifierId AND a.Name = 'ConstructibleType') wonder,
    (SELECT Value FROM ModifierArguments a WHERE a.ModifierId = tm.ModifierId AND a.Name = 'Percent') pct
  FROM TraitModifiers tm JOIN CivilizationTraits ct ON ct.TraitType = tm.TraitType
  WHERE tm.ModifierId LIKE 'LSHUF\\_WONDER\\_\\_%' ESCAPE '\\'`);
const codexExceptions = (db) => rows(db, `SELECT DISTINCT NotTraitType t FROM ProgressionTreeNodeUnlocks WHERE TargetType IN ${CODEX}`)
  .map((x) => x.t);
const holdersOf = (db, trait) => rows(db, "SELECT CivilizationType c FROM CivilizationTraits WHERE TraitType = ?", trait).map((x) => x.c);

async function run(spec, fixture = "base") {
  const r = await runBoth({ fixture, spec });
  r.fixture = fixture;
  return r;
}

test("the mapping deals every civilization bonus but the three that go with a civic or a unique", async () => {
  const r = await run({ seed: 1, options: { Mode: MODE.None } });
  try {
    const stay = rows(r.run.db, "SELECT PieceId FROM LShufCivMapping WHERE Movable = 0 ORDER BY 1").map((x) => x.PieceId);
    assert.deepEqual(stay, ["CIVILIZATION_INCA__B03", "CIVILIZATION_JOSEON__B02", "CIVILIZATION_SONGHAI__B03"]);
    const goes = rows(r.run.db, "SELECT PieceId FROM LShufCivGoesWith ORDER BY 1").map((x) => x.PieceId);
    assert.deepEqual(goes, stay, "each piece that stays says what it goes with");
    assert.equal(CIV_WONDER_PIECES.length, 50, "a favored-wonder piece per civilization");
    for (const id of CIV_WONDER_PIECES) assert.ok(CIV_OWN_AGE_PIECES.includes(id), `${id} stays in its own age`);
  } finally {
    r.run.close();
  }
});

test("Base game leaves the wonder bonuses and Assyria's codex rule as shipped", async () => {
  const r = await run({ seed: 1, options: { Mode: MODE.None } });
  try {
    assertSameResult(r.js, r.sql, "base");
    assert.ok(favored(r.run.db).length > 0, "the game's own favored-wonder modifiers are held");
    assert.deepEqual(named(r.run.db), []);
    assert.deepEqual(codexExceptions(r.run.db), ["TRAIT_ASSYRIA"]);
  } finally {
    r.run.close();
  }
});

for (const [fixture, CivAbilities] of [["base", CA_MODE.Split], ["base", CA_MODE.Swapped], ["exploration", CA_MODE.Split],
  ["modern", CA_MODE.Split]]) {
  test(`${fixture} ${CivAbilities}: each wonder bonus names its giver's wonder for whoever holds it`, async () => {
    for (const seed of [2, 9, 40]) {
      const r = await run({ seed, options: { Mode: MODE.None, CivAbilities } }, fixture);
      try {
        const where = `${fixture} ${CivAbilities} seed ${seed}`;
        assertSameResult(r.js, r.sql, where);
        assert.deepEqual(favored(r.run.db), [], `${where}: nobody holds a favored-wonder modifier any more`);
        const got = named(r.run.db);
        const wonderOf = new Map(rows(r.run.db, "SELECT CivilizationType c, FavoredWonderType w FROM CivilizationFavoredWonders")
          .map((x) => [x.c, x.w]));
        assert.ok(got.length >= 10, `${where}: the Antiquity civs' wonder bonuses are held (${got.length})`);
        for (const g of got) {
          const giver = g.id.slice("LSHUF_WONDER__".length);
          assert.equal(g.wonder, wonderOf.get(giver), `${where}: ${g.civ}'s bonus names ${giver}'s wonder`);
          assert.equal(g.pct, "30");
        }
        // Somebody holds another civ's wonder bonus.
        assert.ok(got.some((g) => g.id !== `LSHUF_WONDER__${g.civ}`), `${where}: a wonder bonus moved`);
        noNewKeys(r, where);
      } finally {
        r.run.close();
      }
    }
  });
}

test("Assyria's codex rule follows whoever holds it, and nobody holds it with abilities off", async () => {
  // Rome's builder takes the rule card: Rome stops getting codices from techs, Assyria starts.
  const builder = { leader: "LEADER_AMINA", civ: "CIVILIZATION_ROME", pieces: [RULE] };
  const r = await run({ seed: 4, options: { Mode: MODE.None, CivAbilities: CA_MODE.Split }, builder });
  try {
    assertSameResult(r.js, r.sql, "builder");
    assert.deepEqual(codexExceptions(r.run.db), [MARKER]);
    assert.deepEqual(holdersOf(r.run.db, MARKER), ["CIVILIZATION_ROME"]);
    const reqs = rows(r.run.db, `SELECT DISTINCT ra.Value v FROM Modifiers m JOIN RequirementSetRequirements rsr
      ON rsr.RequirementSetId IN (m.SubjectRequirementSetId, m.OwnerRequirementSetId)
      JOIN RequirementArguments ra ON ra.RequirementId = rsr.RequirementId AND ra.Name = 'TraitType'
      WHERE m.ModifierId IN ${CODEX}`).map((x) => x.v);
    assert.deepEqual(reqs, [MARKER], "the codex modifiers' own requirement names the marker");
    noNewKeys(r, "builder");
  } finally {
    r.run.close();
  }
  for (const seed of [2, 9]) {
    const s = await run({ seed, options: { Mode: MODE.None, CivAbilities: CA_MODE.Split } });
    try {
      assertSameResult(s.js, s.sql, `split ${seed}`);
      const dealt = rows(s.run.db, "SELECT CivilizationType c FROM LShufResultCivPieces WHERE PieceId = ?", RULE).map((x) => x.c);
      assert.equal(dealt.length, 1, `split ${seed}: the rule is dealt`);
      assert.deepEqual(holdersOf(s.run.db, MARKER), dealt, `split ${seed}: its holder carries the marker`);
    } finally {
      s.run.close();
    }
  }
  const off = await run({ seed: 2, options: { Mode: MODE.None, CivAbilities: CA_MODE.Off } });
  try {
    assert.deepEqual(holdersOf(off.run.db, MARKER), [], "abilities off: nobody loses codices from techs");
    assert.deepEqual(codexExceptions(off.run.db), [MARKER]);
  } finally {
    off.run.close();
  }
  const swap = await run({ seed: 4, options: { Mode: MODE.None },
    builder: { leader: "LEADER_AMINA", civ: "CIVILIZATION_ROME", pieces: [BUILD.civAbility(ASSYRIA)] } });
  try {
    assert.deepEqual(holdersOf(swap.run.db, MARKER), ["CIVILIZATION_ROME"], "Assyria's whole ability brings the rule");
  } finally {
    swap.run.close();
  }
});
