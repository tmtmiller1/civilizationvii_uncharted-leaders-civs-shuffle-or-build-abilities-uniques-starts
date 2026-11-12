// Civilization attribute tags (CONTRACTS 30): the TRAIT_ATTRIBUTE_* rows (Cultural, Economic..., and the Test of
// Time ones) that the game's attribute quests and Test of Time traditions read. A whole ability brings its civ's
// tags; with abilities in pieces the tag sets go round a cycle of their own per age; Base game moves none. JS equals
// SQL, and after the apply every civ holds exactly its giver's shipped tags.
import assert from "node:assert/strict";
import test from "node:test";

import { assertSameResult, fixtureForeignKeys, newForeignKeyRows, rows } from "./_harness.mjs";
import { runBoth } from "./_deal.mjs";
import { BUILD, CA_MODE, MODE } from "../shared/lshuf-constants.js";

const tagSets = (db) => {
  const out = new Map();
  for (const r of rows(db, `SELECT CivilizationType c, TraitType t FROM CivilizationTraits
      WHERE TraitType LIKE 'TRAIT\\_ATTRIBUTE\\_%' ESCAPE '\\' ORDER BY 1, 2`)) {
    if (!out.has(r.c)) out.set(r.c, []);
    out.get(r.c).push(r.t);
  }
  return out;
};

const isTot = (t) => t.includes("_TOT_");
const KINDS = ["CULTURAL", "ECONOMIC", "EXPANSIONIST", "MILITARISTIC", "POLITICAL", "SCIENTIFIC"];
const kindsOf = (list) => KINDS.filter((k) => list.includes(`TRAIT_ATTRIBUTE_${k}`));
// "AQ" from TRAIT_ATTRIBUTE_CULTURAL_TOT_AQ, the Test of Time ages a civ's tags cover.
const totAges = (list) => [...new Set(list.filter(isTot).map((t) => t.split("_TOT_")[1].slice(0, 2)))].sort();

// Every civ with a tags row holds its giver's plain tags, and Test of Time tags for its own ages in the giver's
// kinds; every other civ keeps its own.
function checkApplied(r, where) {
  const before = tagSets(r.run.pre);
  const after = tagSets(r.run.db);
  const tags = r.objects("sql").civPieces.filter((p) => p.Kind === "tags");
  const from = new Map(tags.map((p) => [p.CivilizationType, p.FromCivilization]));
  const civs = rows(r.run.db, "SELECT CivilizationType c FROM Civilizations").map((x) => x.c);
  for (const c of civs) {
    const giver = from.get(c) || c;
    const own = before.get(c) || [];
    const got = after.get(c) || [];
    const given = before.get(giver) || [];
    assert.deepEqual(got.filter((t) => !isTot(t)), given.filter((t) => !isTot(t)), `${where}: ${c} holds ${giver}'s tags`);
    assert.deepEqual(totAges(got), totAges(own), `${where}: ${c} keeps its Test of Time ages`);
    for (const age of totAges(own)) {
      const kinds = KINDS.filter((k) => got.includes(`TRAIT_ATTRIBUTE_${k}_TOT_${age}`));
      assert.deepEqual(kinds, kindsOf(given), `${where}: ${c}'s Test of Time tags in ${age} are ${giver}'s kinds`);
    }
  }
  const fk = newForeignKeyRows(r.run.db, fixtureForeignKeys(r.fixture));
  assert.deepEqual([fk.fresh, fk.newErrors], [[], []], `${where}: no new foreign-key rows`);
  return tags;
}

async function run(fixture, spec) {
  const r = await runBoth({ fixture, spec });
  r.fixture = fixture;
  return r;
}

test("Base game moves no tags", async () => {
  const r = await run("base", { seed: 3, options: { Mode: MODE.None } });
  try {
    assertSameResult(r.js, r.sql, "base");
    assert.equal(checkApplied(r, "base").length, 0);
  } finally {
    r.run.close();
  }
});

test("Swap whole: each civ's tags come from the civ whose ability it got", async () => {
  for (const seed of [1, 7, 40]) {
    const r = await run("base", { seed, options: { Mode: MODE.None, CivAbilities: CA_MODE.Swapped } });
    try {
      const where = `swapped seed ${seed}`;
      assertSameResult(r.js, r.sql, where);
      const pieces = r.objects("sql").civPieces;
      const ability = pieces.filter((p) => p.Kind === "ability").map((p) => [p.CivilizationType, p.FromCivilization]).sort();
      const tags = checkApplied(r, where).map((p) => [p.CivilizationType, p.FromCivilization]).sort();
      assert.ok(ability.length > 0, `${where}: abilities moved`);
      assert.deepEqual(tags, ability, `${where}: the tags follow the abilities`);
    } finally {
      r.run.close();
    }
  }
});

for (const fixture of ["base", "exploration"]) {
  test(`${fixture}: Split up deals the tag sets round a cycle, each civ giving one and taking one`, async () => {
    for (const seed of [2, 9, 128]) {
      const r = await run(fixture, { seed, options: { Mode: MODE.None, CivAbilities: CA_MODE.Split } });
      try {
        const where = `${fixture} split seed ${seed}`;
        assertSameResult(r.js, r.sql, where);
        const tags = checkApplied(r, where);
        assert.ok(tags.length >= 2, `${where}: tags moved`);
        const takers = tags.map((p) => p.CivilizationType).sort();
        const givers = tags.map((p) => p.FromCivilization).sort();
        assert.deepEqual(givers, takers, `${where}: the same civs give and take`);
        assert.equal(new Set(takers).size, takers.length, `${where}: one tag set each`);
        for (const p of tags) assert.notEqual(p.CivilizationType, p.FromCivilization, `${where}: nobody keeps its own`);
      } finally {
        r.run.close();
      }
    }
  });
}

test("a builder who swaps abilities whole swaps tags with the source civ", async () => {
  const ROME = "CIVILIZATION_ROME";
  const GREECE = "CIVILIZATION_GREECE";
  for (const CivAbilities of [CA_MODE.Normal, CA_MODE.Split]) {
    const builder = { leader: "LEADER_AMINA", civ: ROME, pieces: [BUILD.civAbility(GREECE)] };
    const r = await run("base", { seed: 4, options: { Mode: MODE.None, CivAbilities }, builder });
    try {
      const where = `builder ${CivAbilities}`;
      assertSameResult(r.js, r.sql, where);
      const tags = checkApplied(r, where);
      const of = new Map(tags.map((p) => [p.CivilizationType, p.FromCivilization]));
      assert.equal(of.get(ROME), GREECE, `${where}: Rome takes Greece's tags`);
      assert.equal(of.get(GREECE), ROME, `${where}: Greece takes Rome's`);
      const after = tagSets(r.run.db);
      assert.ok(after.get(ROME).includes("TRAIT_ATTRIBUTE_POLITICAL"), `${where}: Rome is Political now`);
      assert.ok(!after.get(ROME).includes("TRAIT_ATTRIBUTE_MILITARISTIC"), `${where}: and not Militaristic`);
    } finally {
      r.run.close();
    }
  }
});

test("a civ playing out of its age keeps its Test of Time tags, in the kinds of the ability it took", async () => {
  // Buganda (Modern) plays in Antiquity and takes Greece's ability. Greece is native to Antiquity, so it has no
  // Antiquity Test of Time tags; Buganda gets Cultural and Political ones for Antiquity (Greece's kinds, Greece's
  // Influence variant) and loses its Expansionist ones.
  const BUGANDA = "CIVILIZATION_BUGANDA";
  const GREECE = "CIVILIZATION_GREECE";
  const builder = { leader: "LEADER_AMINA", civ: BUGANDA, pieces: [BUILD.civAbility(GREECE)] };
  const r = await run("base", { seed: 4, options: { Mode: MODE.None }, builder });
  try {
    assertSameResult(r.js, r.sql, "Buganda takes Greece");
    checkApplied(r, "Buganda takes Greece");
    const got = tagSets(r.run.db).get(BUGANDA).filter((t) => t.includes("_TOT_AQ"));
    assert.deepEqual(got, ["TRAIT_ATTRIBUTE_CULTURAL_TOT_AQ", "TRAIT_ATTRIBUTE_POLITICAL_TOT_AQ",
      "TRAIT_ATTRIBUTE_POLITICAL_TOT_AQ_INFLUENCE"]);
    const greece = tagSets(r.run.db).get(GREECE);
    assert.ok(!greece.some((t) => t.includes("_TOT_AQ")), "Greece, native here, gets no Antiquity Test of Time tags");
    assert.ok(greece.includes("TRAIT_ATTRIBUTE_EXPANSIONIST_TOT_EX_TALL"), "Greece gets Buganda's kinds for its own ages");
  } finally {
    r.run.close();
  }
});
