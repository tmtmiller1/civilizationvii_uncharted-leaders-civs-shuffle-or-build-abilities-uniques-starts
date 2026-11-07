// Build your own leader (CONTRACTS 13, SPEC 7b): the builder gets exactly the cards it ticked, the rest is dealt
// among the others, and the JS and SQL deals agree. On the base fixture with Amina building.
import assert from "node:assert/strict";
import test from "node:test";

import { assertSameResult, fixtureForeignKeys, newForeignKeyRows } from "./_harness.mjs";
import {
  checkAttributesConserved, DEAL_MODES, label, runBoth, shippedAttributes, SPLIT_MODES, WHOLE_MODES
} from "./_deal.mjs";
import { BUILD, BUILD_WHY, MODE, ONOFF, PERSONA, pieceId, REASON, STATUS, TRAIT } from "../shared/lshuf-constants.js";

const AMINA = "LEADER_AMINA";
const CULTURAL = "TRAIT_LEADER_ATTRIBUTE_CULTURAL";
const MILITARISTIC = "TRAIT_LEADER_ATTRIBUTE_MILITARISTIC";
const HAND = [
  pieceId.whole("LEADER_PACHACUTI"),
  BUILD.attribute(CULTURAL),
  BUILD.attribute(MILITARISTIC),
  BUILD.persona("LEADER_XERXES"),
  BUILD.bias("LEADER_PACHACUTI"),
  BUILD.civBias("CIVILIZATION_EGYPT")
];
const builder = (pieces, civ = "CIVILIZATION_ROME") => ({ leader: AMINA, civ, pieces });

const meta = (res, name) => (res.meta.find((r) => r.Name === name) || {}).Value;
const leader = (res, type) => res.leaders.find((r) => r.LeaderType === type);
const pieces = (res, type) =>
  res.pieces
    .filter((p) => p.LeaderType === type)
    .sort((a, b) => Number(a.SortIndex) - Number(b.SortIndex))
    .map((p) => p.PieceId);
const attrs = (res, type) => res.attributes.filter((a) => a.LeaderType === type).map((a) => a.TraitType).sort();
const biasKey = (b) => `${b.TableName}|${b.TargetType}|${b.Score}`;
const civRows = (res, civ) =>
  res.biases.filter((b) => b.LeaderType == null && b.CivilizationType === civ).map(biasKey).sort();
const leaderRows = (res, type) => res.biases.filter((b) => b.LeaderType === type);
// A leader's shipped bias rows in the fixture, as biasKey strings (biomes and terrains carry the two targets).
function shippedRows(pre, type) {
  const out = [];
  const read = (table, col) => pre.prepare(`SELECT ${col || "NULL"} AS X, Score FROM ${table} WHERE LeaderType = ?`).all(type);
  for (const r of read("StartBiasBiomes", "BiomeType")) out.push(`StartBiasBiomes|${r.X}|${r.Score}`);
  for (const r of read("StartBiasTerrains", "TerrainType")) out.push(`StartBiasTerrains|${r.X}|${r.Score}`);
  for (const r of read("StartBiasRivers")) out.push(`StartBiasRivers|null|${r.Score}`);
  return out.sort();
}

// Swap everything: the builder leaves the package cycle, so its own untaken cards go to nobody, and every other
// leader's card comes back exactly once, to the builder (taken) or to another leader.
function othersConserved(res, pre, attrPool, where) {
  const shipped = shippedAttributes(pre);
  const others = attrPool.filter((l) => l !== AMINA);
  const given = others.flatMap((l) => (shipped[l] || []).map((t) => `${l}|${t}`)).sort();
  const got = res.attributes
    .filter((a) => attrPool.includes(a.LeaderType) && a.FromLeaderType != null && a.FromLeaderType !== AMINA)
    .map((a) => `${a.FromLeaderType}|${a.TraitType}`)
    .sort();
  assert.deepEqual(got, given, `${where}: every other leader's card is dealt exactly once`);
}

async function both(spec, hooks = []) {
  const r = await runBoth({ spec, hooks });
  try {
    assertSameResult(r.js, r.sql, `${label("base", spec)}: computeDeal vs SQL`);
    return { res: r.objects("sql"), run: r.run, close: () => r.run.close() };
  } catch (e) {
    r.run.close();
    throw e;
  }
}

test("the builder gets its hand in every mode, and the others are dealt the rest", async () => {
  for (const Mode of DEAL_MODES) {
    for (const seed of [21, 200]) {
      const spec = { seed, options: { Mode }, builder: builder(HAND) };
      const where = label("base", spec);
      const { res, run, close } = await both(spec);
      try {
        assert.equal(meta(res, "Builder"), "ok", `${where}: Builder meta`);
        const row = leader(res, AMINA);
        assert.deepEqual([row.Status, row.Reason], [STATUS.Dealt, REASON.Built], `${where}: builder row`);
        assert.deepEqual([row.AbilityFrom, row.PersonaFrom, row.BiasFrom], ["LEADER_PACHACUTI", "LEADER_XERXES", "LEADER_PACHACUTI"], `${where}: from`);
        assert.deepEqual(pieces(res, AMINA), [pieceId.whole("LEADER_PACHACUTI")], `${where}: ability`);
        assert.deepEqual(attrs(res, AMINA), [CULTURAL, MILITARISTIC], `${where}: attributes`);
        const pach = res.biases.filter((b) => b.LeaderType === "LEADER_PACHACUTI" && b.Origin === "shipped");
        assert.equal(pach.length, 0, `${where}: Pachacuti's own bias rows are dealt`);
        const mine = leaderRows(res, AMINA);
        assert.ok(mine.length > 0 && mine.every((b) => b.Origin === "moved"), `${where}: builder's rows are moved`);
        const some = new Set(["StartBiasBiomes", "StartBiasTerrains", "StartBiasRivers"]);
        assert.deepEqual(
          mine.filter((b) => some.has(b.TableName)).map(biasKey).sort(),
          shippedRows(run.pre, "LEADER_PACHACUTI"),
          `${where}: builder starts like Pachacuti`
        );
        const egypt = run.pre
          .prepare("SELECT 'StartBiasBiomes' AS T, BiomeType AS X, Score FROM StartBiasBiomes WHERE CivilizationType = 'CIVILIZATION_EGYPT' AND LeaderType IS NULL")
          .all();
        if (egypt.length) {
          const rome = civRows(res, "CIVILIZATION_ROME").filter((s) => s.startsWith("StartBiasBiomes"));
          assert.deepEqual(rome, egypt.map((e) => `${e.T}|${e.X}|${e.Score}`).sort(), `${where}: Rome starts like Egypt`);
        }
        const attrPool = res.leaders.filter((r) => String(r.Axes || "").includes("ATTRIBUTES")).map((r) => r.LeaderType);
        if (Mode === MODE.SwapLeaders) othersConserved(res, run.pre, attrPool, where);
        else if (Mode !== MODE.SwapAbilities) checkAttributesConserved(res, { pre: run.pre, where, attrPool });
        const held = res.pieces.filter((p) => p.FromLeaderType === "LEADER_PACHACUTI");
        assert.deepEqual(held.map((p) => p.LeaderType), [AMINA], `${where}: nobody else holds Pachacuti's ability`);
        for (const r of res.leaders) {
          if (r.LeaderType === AMINA || r.Status !== STATUS.Dealt) continue;
          assert.ok(pieces(res, r.LeaderType).length >= 1, `${where}: ${r.LeaderType} still holds an ability`);
        }
        const fk = newForeignKeyRows(run.db, fixtureForeignKeys("base"));
        assert.deepEqual([fk.fresh, fk.newErrors], [[], []], `${where}: no new foreign-key rows`);
      } finally {
        close();
      }
    }
  }
});

const unreviewAll = { before: 20010, run: (db) => db.exec("UPDATE LShufMapping SET Reviewed = 0") };

test("bullet cards apply as shipped (every row reviewed), and are ignored if a row is set back to 0", async () => {
  const hand = [
    pieceId.bullet("LEADER_PACHACUTI", 1),
    pieceId.bullet("LEADER_XERXES", 2),
    pieceId.bullet(AMINA, 1),
    BUILD.attribute("TRAIT_LEADER_ATTRIBUTE_ECONOMIC")
  ];
  for (const Mode of SPLIT_MODES) {
    const spec = { seed: 22, options: { Mode }, builder: builder(hand) };
    const reviewed = await both(spec);
    try {
      assert.equal(meta(reviewed.res, "Builder"), "ok");
      assert.deepEqual(pieces(reviewed.res, AMINA), [pieceId.bullet(AMINA, 1), pieceId.bullet("LEADER_PACHACUTI", 1), pieceId.bullet("LEADER_XERXES", 2)]);
      assert.deepEqual(attrs(reviewed.res, AMINA), ["TRAIT_LEADER_ATTRIBUTE_ECONOMIC"]);
      assert.equal(leader(reviewed.res, AMINA).AbilityFrom, AMINA, "most pieces from itself: one each, lowest id wins");
      for (const id of hand.slice(0, 3)) {
        assert.deepEqual(reviewed.res.pieces.filter((p) => p.PieceId === id).map((p) => p.LeaderType), [AMINA], `${id} held once`);
      }
    } finally {
      reviewed.close();
    }
    const shipped = await both(spec, [unreviewAll]);
    try {
      assert.equal(meta(shipped.res, "Builder"), "ok");
      const held = pieces(shipped.res, AMINA);
      assert.ok(held.every((id) => id.endsWith("__WHOLE")), `unreviewed bullets ignored, builder dealt as usual: ${held}`);
      assert.deepEqual(attrs(shipped.res, AMINA), ["TRAIT_LEADER_ATTRIBUTE_ECONOMIC"], "the attribute card still applies");
    } finally {
      shipped.close();
    }
  }
});

test("Leader shuffle off, builder kept or not in game: the picks don't apply", async () => {
  const off = { seed: 21, options: { Mode: MODE.None }, builder: builder(HAND) };
  const a = await both(off);
  try {
    assert.equal(meta(a.res, "Builder"), BUILD_WHY.ModeOff);
    assert.equal(leader(a.res, AMINA).Status, STATUS.AsShipped);
    assert.deepEqual(pieces(a.res, AMINA), [pieceId.whole(AMINA)]);
  } finally {
    a.close();
  }
  const kept = { seed: 21, options: { Mode: MODE.SwapLeaders, KeepMine: "1" }, kept: [AMINA], builder: builder(HAND) };
  const b = await both(kept);
  try {
    assert.equal(meta(b.res, "Builder"), BUILD_WHY.NotInGame);
    assert.equal(leader(b.res, AMINA).Reason, REASON.Kept);
  } finally {
    b.close();
  }
  const away = { seed: 21, options: { Mode: MODE.SwapLeaders }, notInGame: [AMINA], builder: builder(HAND) };
  const c = await both(away);
  try {
    assert.equal(meta(c.res, "Builder"), BUILD_WHY.NotInGame);
  } finally {
    c.close();
  }
  const none = { seed: 21, options: { Mode: MODE.SwapLeaders }, builder: builder([]) };
  const d = await both(none);
  try {
    assert.equal(meta(d.res, "Builder"), BUILD_WHY.NoPieces);
    assert.notEqual(leader(d.res, AMINA).Reason, REASON.Built);
  } finally {
    d.close();
  }
});

test("a civilization card without a hand-picked civ is ignored; a behavior pick takes the copy path", async () => {
  const withCiv = { seed: 23, options: { Mode: MODE.SwapLeaders }, builder: builder(HAND) };
  const noCiv = { seed: 23, options: { Mode: MODE.SwapLeaders }, builder: builder(HAND, null) };
  const noCard = HAND.filter((id) => !id.startsWith("CIVBIAS_"));
  const plain = { seed: 23, options: { Mode: MODE.SwapLeaders }, builder: builder(noCard, null) };
  const x = await both(noCiv);
  const y = await both(plain);
  try {
    assert.deepEqual(x.res.biases, y.res.biases, "no civ: the civilization card changes nothing");
  } finally {
    x.close();
    y.close();
  }
  const z = await both(withCiv);
  try {
    const unlocks = z.res.unlocks.filter((u) => u.ToLeaderType === AMINA);
    assert.ok(unlocks.length > 0, "Pachacuti's legend nodes move to the builder");
    assert.ok(unlocks.every((u) => u.ToTraitType === TRAIT.dealt(AMINA)), "on the builder's own dealt trait (copy path)");
  } finally {
    z.close();
  }
  for (const Mode of WHOLE_MODES) {
    const noPersona = { seed: 23, options: { Mode, Personality: PERSONA.Follows }, builder: builder(HAND.filter((id) => !id.startsWith("PERSONA_"))) };
    const w = await both(noPersona);
    try {
      const row = leader(w.res, AMINA);
      assert.equal(row.PersonaFrom, "LEADER_PACHACUTI", `${Mode}: behavior follows the taken ability`);
      const unlocks = w.res.unlocks.filter((u) => u.ToLeaderType === AMINA);
      assert.ok(unlocks.every((u) => u.ToTraitType === "TRAIT_LEADER_PACHACUTI_ABILITY"), `${Mode}: trait path without a behavior pick`);
    } finally {
      w.close();
    }
  }
  const options = { Mode: MODE.SwapAbilities, Attributes: ONOFF.Off };
  const attributesOff = { seed: 23, options, builder: builder(HAND) };
  const v = await both(attributesOff);
  try {
    assert.deepEqual(attrs(v.res, AMINA), [TRAIT.EqualActions], "attributes off for everyone: the attribute cards don't apply");
    assert.deepEqual(pieces(v.res, AMINA), [pieceId.whole("LEADER_PACHACUTI")]);
  } finally {
    v.close();
  }
});

// Builder slots (CONTRACTS 13): the host and an AI leader build at once; a card both ticked goes to the lower slot;
// the others still get every card once; the JS and SQL deals agree.
test("two builders: the host and an AI leader, a shared card goes to slot 1", async () => {
  const XERXES = "LEADER_XERXES";
  // Xerxes gave two attributes, so it ticks two: the card totals stay even and every card is still dealt once.
  const SCIENTIFIC = "TRAIT_LEADER_ATTRIBUTE_SCIENTIFIC";
  const POLITICAL = "TRAIT_LEADER_ATTRIBUTE_POLITICAL";
  const aiHand = [pieceId.whole("LEADER_PACHACUTI"), pieceId.whole("LEADER_CONFUCIUS"), BUILD.attribute(SCIENTIFIC),
    BUILD.attribute(POLITICAL), BUILD.persona("LEADER_AMINA"), BUILD.bias("LEADER_AMINA")];
  for (const Mode of DEAL_MODES) {
    const spec = {
      seed: 25,
      options: { Mode },
      builders: [builder(HAND), { slot: 2, leader: XERXES, civ: "CIVILIZATION_PERSIA", pieces: aiHand }]
    };
    const where = `${label("base", spec)} two builders`;
    const { res, run, close } = await both(spec);
    try {
      assert.equal(meta(res, "Builder"), "ok", `${where}: slot 1`);
      assert.equal(meta(res, "Builder2"), "ok", `${where}: slot 2`);
      assert.equal(leader(res, XERXES).Reason, REASON.Built, `${where}: the AI leader is built`);
      assert.deepEqual(pieces(res, AMINA), [pieceId.whole("LEADER_PACHACUTI")], `${where}: Pachacuti's whole goes to slot 1`);
      assert.deepEqual(pieces(res, XERXES), [pieceId.whole("LEADER_CONFUCIUS")], `${where}: slot 2 keeps its other card`);
      assert.deepEqual(attrs(res, XERXES), [POLITICAL, SCIENTIFIC], `${where}: slot 2's attributes`);
      assert.equal(leader(res, XERXES).PersonaFrom, AMINA, `${where}: slot 2's behavior`);
      const attrPool = res.leaders.filter((r) => String(r.Axes || "").includes("ATTRIBUTES")).map((r) => r.LeaderType);
      if (Mode !== MODE.SwapLeaders && Mode !== MODE.SwapAbilities) {
        checkAttributesConserved(res, { pre: run.pre, where, attrPool });
      }
      const fk = newForeignKeyRows(run.db, fixtureForeignKeys("base"));
      assert.deepEqual([fk.fresh, fk.newErrors], [[], []], `${where}: no new foreign-key rows`);
    } finally {
      close();
    }
  }
  const dup = {
    seed: 25,
    options: { Mode: MODE.SwapLeaders },
    builders: [builder(HAND), { slot: 2, leader: AMINA, pieces: aiHand }]
  };
  const d = await both(dup);
  try {
    assert.equal(meta(d.res, "Builder2"), BUILD_WHY.NotInGame, "a second slot on the host's leader doesn't apply");
  } finally {
    d.close();
  }
});

// --- owner asks of 2026-11-06 night: a second copy of an attribute, generic start terrain, bullets in the whole modes

test("an attribute taken twice: the second copy lands as Copy 1 on the builder, the same in JS and SQL", async () => {
  const hand = [BUILD.attribute(CULTURAL), BUILD.attribute(CULTURAL, 2), pieceId.whole("LEADER_PACHACUTI")];
  for (const Mode of [MODE.SplitMatched, MODE.SwapAbilities, MODE.SwapLeaders]) {
    const spec = { seed: 9, options: { Mode }, builder: builder(hand) };
    const r = await both(spec);
    try {
      assert.equal(meta(r.res, "Builder"), "ok", Mode);
      const mine = r.res.attributes.filter((a) => a.LeaderType === AMINA && a.TraitType === CULTURAL);
      assert.deepEqual(mine.map((a) => Number(a.Copy)).sort(), [0, 1], `${Mode}: two Cultural cards, copies 0 and 1`);
      assert.equal(new Set(mine.map((a) => a.FromLeaderType)).size, 2, `${Mode}: two different cards`);
    } finally {
      r.close();
    }
  }
});

test("a generic start terrain card gives the builder that terrain and nothing else, from nobody", async () => {
  const hand = [BUILD.genericBias("TERRAIN_MOUNTAIN"), pieceId.whole("LEADER_PACHACUTI")];
  for (const Mode of [MODE.SplitMatched, MODE.SwapAbilities, MODE.SwapLeaders]) {
    const spec = { seed: 11, options: { Mode }, builder: builder(hand) };
    const r = await both(spec);
    try {
      assert.equal(meta(r.res, "Builder"), "ok", Mode);
      const mine = r.res.biases.filter((b) => b.LeaderType === AMINA);
      assert.deepEqual(mine.map((b) => [b.TableName, b.TargetType, Number(b.Score), b.Origin]),
        [["StartBiasTerrains", "TERRAIN_MOUNTAIN", 40, "moved"]], `${Mode}: one mountain row`);
      assert.equal(leader(r.res, AMINA).BiasFrom, null, `${Mode}: from nobody`);
    } finally {
      r.close();
    }
  }
});

test("whole modes: a builder with bullet cards gets exactly those bullets and leaves the cycle", async () => {
  const hand = [pieceId.bullet("LEADER_PACHACUTI", 1), pieceId.bullet("LEADER_XERXES", 2), pieceId.bullet("LEADER_XERXES", 1)];
  for (const Mode of WHOLE_MODES) {
    const spec = { seed: 17, options: { Mode }, builder: builder(hand) };
    const r = await both(spec);
    try {
      assert.equal(meta(r.res, "Builder"), "ok", Mode);
      assert.deepEqual(pieces(r.res, AMINA), hand.slice().sort(), `${Mode}: the three bullets, in id order`);
      assert.equal(leader(r.res, AMINA).AbilityFrom, "LEADER_XERXES", `${Mode}: most bullets from Xerxes`);
      const holders = r.res.pieces.filter((p) => p.PieceId === pieceId.whole(AMINA)).map((p) => p.LeaderType);
      assert.deepEqual(holders, [], `${Mode}: the builder's own ability goes to nobody`);
      const wholes = r.res.pieces.filter((p) => p.Kind === "whole" && p.LeaderType !== AMINA);
      assert.equal(new Set(wholes.map((p) => p.PieceId)).size, wholes.length, `${Mode}: no whole ability held twice`);
    } finally {
      r.close();
    }
  }
});
