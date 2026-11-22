// A builder's civilization cards count whatever the AI players' rows say (CONTRACTS 36): a civilization bonus card
// outside Split up becomes the builder's ability as a copy (the civ it came from keeps its whole ability), and a
// civilization start terrain card counts with start terrain on Base game. The same in JS and SQL. Before 1.0.4 a bonus
// card under Swap whole left the build at no-pieces (seed 44, Amina building Rome with Spain's first bonus).
import assert from "node:assert/strict";
import test from "node:test";

import { assertSameResult, rows } from "./_harness.mjs";
import { label, runBoth } from "./_deal.mjs";
import { B_MODE, BUILD, CA_MODE, MODE } from "../shared/lshuf-constants.js";

const AMINA = "LEADER_AMINA";
const ROME = "CIVILIZATION_ROME";
const SPAIN = "CIVILIZATION_SPAIN";
const EGYPT = "CIVILIZATION_EGYPT";
const SPAIN_B1 = BUILD.civBullet(SPAIN, 1);

const meta = (res, name) => (res.meta.find((r) => r.Name === name) || {}).Value;
const held = (res, civ) => res.civPieces.filter((r) => r.CivilizationType === civ && r.Kind !== "tags")
  .map((r) => `${r.Kind}:${r.PieceId}<${r.FromCivilization}`).sort();

async function both(spec) {
  const r = await runBoth({ spec, hooks: [] });
  try {
    assertSameResult(r.js, r.sql, `${label("base", spec)}: computeDeal vs SQL`);
    return { res: r.objects("sql"), db: r.run.db, close: () => r.run.close() };
  } catch (e) {
    r.run.close();
    throw e;
  }
}

const spec = (CivAbilities, pieces, extra = {}) => ({
  seed: 44,
  options: { Mode: MODE.SwapAbilities, CivAbilities, ...extra },
  builder: { leader: AMINA, civ: ROME, pieces }
});

test("a civilization bonus card counts outside Split up, as a copy: Spain keeps its whole ability", async () => {
  for (const ca of [CA_MODE.Normal, CA_MODE.Swapped, CA_MODE.Off]) {
    for (const follows of ["1", "0"]) {
      const r = await both(spec(ca, [SPAIN_B1], { HumanFollows: follows }));
      try {
        const where = `${ca}, HumanFollows ${follows}`;
        assert.equal(meta(r.res, "CivBuilder"), "ok", where);
        assert.deepEqual(held(r.res, ROME), [`bullet:${SPAIN_B1}<${SPAIN}`], `${where}: Rome holds Spain's bonus`);
        assert.ok(!r.res.civPieces.some((p) => p.CivilizationType === SPAIN && (p.Kind === "bullet" || p.Kind === "remainder")),
          `${where}: Spain isn't in pieces`);
        const romeTraits = rows(r.db, "SELECT TraitType FROM CivilizationTraits WHERE CivilizationType = ?", ROME)
          .map((x) => x.TraitType);
        assert.ok(romeTraits.includes(`TRAIT_LSHUF_CIVA_${ROME}`), `${where}: Rome's ability is its dealt trait`);
        const copies = rows(r.db, "SELECT ModifierId FROM TraitModifiers WHERE TraitType = ?", `TRAIT_LSHUF_CIVA_${ROME}`);
        assert.ok(copies.length > 0, `${where}: the copy holds Spain's bonus modifiers`);
        for (const c of copies) {
          const source = c.ModifierId.replace(`LSHUF_${ROME}__`, "");
          const still = rows(r.db, "SELECT TraitType FROM TraitModifiers WHERE ModifierId = ?", source);
          assert.ok(still.length > 0, `${where}: ${source} still sits on Spain's ability trait`);
        }
      } finally {
        r.close();
      }
    }
  }
});

test("Split up is unchanged: the bonus is taken out of Spain's pieces", async () => {
  const r = await both(spec(CA_MODE.Split, [SPAIN_B1]));
  try {
    assert.equal(meta(r.res, "CivBuilder"), "ok");
    assert.deepEqual(held(r.res, ROME), [`bullet:${SPAIN_B1}<${SPAIN}`]);
    assert.ok(!r.res.civPieces.some((p) => p.PieceId === SPAIN_B1 && p.CivilizationType !== ROME), "nobody else holds it");
  } finally {
    r.close();
  }
});

test("a whole ability card still swaps under Swap whole, and a bonus card beside it is ignored", async () => {
  const r = await both(spec(CA_MODE.Swapped, [BUILD.civAbility(SPAIN), SPAIN_B1]));
  try {
    assert.equal(meta(r.res, "CivBuilder"), "ok");
    assert.deepEqual(held(r.res, ROME), [`ability:${BUILD.civAbility(SPAIN)}<${SPAIN}`]);
  } finally {
    r.close();
  }
});

test("a civilization start terrain card counts with start terrain on Base game; every other civ keeps its own", async () => {
  const civRows = (res, civ) => res.biases.filter((b) => b.LeaderType == null && b.CivilizationType === civ)
    .map((b) => `${b.TableName}|${b.TargetType}|${Number(b.Score)}`).sort();
  for (const follows of ["1", "0"]) {
    const extra = { Biases: B_MODE.Normal, HumanFollows: follows };
    const card = await both(spec(CA_MODE.Normal, [BUILD.civBias(EGYPT)], extra));
    const plain = await both(spec(CA_MODE.Normal, [SPAIN_B1], extra));
    try {
      const where = `HumanFollows ${follows}`;
      assert.ok(civRows(card.res, EGYPT).length > 0, "the fixture gives Egypt start terrain");
      assert.deepEqual(civRows(card.res, ROME), civRows(card.res, EGYPT), `${where}: Rome starts on Egypt's terrain`);
      assert.ok(card.res.biases.filter((b) => b.CivilizationType === ROME && b.LeaderType == null)
        .every((b) => b.Origin === "moved"), `${where}: Rome's rows are moved`);
      const others = (res) => res.biases.filter((b) => b.LeaderType == null && b.CivilizationType !== ROME)
        .map((b) => `${b.CivilizationType}|${b.TableName}|${b.TargetType}|${Number(b.Score)}|${b.Origin}`).sort();
      assert.deepEqual(others(card.res), others(plain.res), `${where}: every other civ's rows are as without the card`);
    } finally {
      card.close();
      plain.close();
    }
  }
});
