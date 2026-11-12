// Build your own leader with a card from a leader nobody is playing (CONTRACTS 24): the builder gets that bonus or
// whole ability, copied from the absent leader's ability, in the split and whole modes; nobody in the game loses
// anything; its legend-node unlocks follow the piece they belong to. JS equals SQL throughout.
import assert from "node:assert/strict";
import test from "node:test";

import { assertSameResult, fixtureForeignKeys, newForeignKeyRows, rows } from "./_harness.mjs";
import { runBoth } from "./_deal.mjs";
import { MODE, TRAIT } from "../shared/lshuf-constants.js";
import { KNOWN_LEADERS } from "../shared/lshuf-known-leaders.js";

const BUILDER = "LEADER_CONFUCIUS";
const PLAYING = [BUILDER, "LEADER_AMINA", "LEADER_AUGUSTUS", "LEADER_HATSHEPSUT", "LEADER_BENJAMIN_FRANKLIN"];
const notInGame = KNOWN_LEADERS.filter((l) => !PLAYING.includes(l));

async function deal(Mode, pieces, seed = 7) {
  const r = await runBoth({ spec: { seed, options: { Mode }, notInGame, builder: { leader: BUILDER, pieces } } });
  assertSameResult(r.js, r.sql, `${Mode} ${pieces.join(",")}`);
  return r;
}

const held = (r, leader) => r.objects("sql").pieces.filter((p) => p.LeaderType === leader);

function noNewKeys(db, what) {
  const fk = newForeignKeyRows(db, fixtureForeignKeys("base"));
  assert.deepEqual([fk.fresh, fk.newErrors], [[], []], `${what}: no new foreign-key rows`);
}

// Every leader in the game other than the builder holds as many dealt pieces as it put in: its movable bonuses.
function inGameConservation(r) {
  const pieces = r.objects("sql").pieces.filter((p) => p.Kind !== "remainder");
  for (const leader of PLAYING.filter((l) => l !== BUILDER)) {
    const own = rows(r.run.db, "SELECT COUNT(*) AS n FROM LShufMapping WHERE LeaderType = ? AND Kind = 'bullet' AND COALESCE(Movable, 1) = 1",
      leader)[0].n;
    const got = pieces.filter((p) => p.LeaderType === leader).length;
    assert.equal(got, own, `${leader} gets back as many as it put in`);
  }
}

test("Split: a bonus card from an absent leader is the builder's, copied onto its trait", async () => {
  const r = await deal(MODE.SplitRandom, ["LEADER_PACHACUTI__B01"]);
  try {
    assert.deepEqual(held(r, BUILDER).map((p) => [p.PieceId, p.FromLeaderType]), [["LEADER_PACHACUTI__B01", "LEADER_PACHACUTI"]]);
    inGameConservation(r);
    const mods = rows(r.run.db, "SELECT ModifierId FROM LShufMappingModifiers WHERE PieceId = 'LEADER_PACHACUTI__B01'")
      .map((m) => `LSHUF_${BUILDER}__${m.ModifierId}`);
    assert.ok(mods.length > 0, "the piece lists modifiers");
    const onTrait = new Set(rows(r.run.db, "SELECT ModifierId FROM TraitModifiers WHERE TraitType = ?", TRAIT.dealt(BUILDER))
      .map((m) => m.ModifierId));
    for (const id of mods) assert.ok(onTrait.has(id), `${id} copied onto ${TRAIT.dealt(BUILDER)}`);
    noNewKeys(r.run.db, "split bonus");
  } finally {
    r.run.close();
  }
});

test("Split: a whole card from an absent leader, and its bonus card in the same build, give one whole piece", async () => {
  const r = await deal(MODE.SplitMatched, ["LEADER_PACHACUTI__B02", "LEADER_PACHACUTI__WHOLE"]);
  try {
    assert.deepEqual(held(r, BUILDER).map((p) => p.PieceId), ["LEADER_PACHACUTI__WHOLE"]);
    inGameConservation(r);
    noNewKeys(r.run.db, "split whole");
  } finally {
    r.run.close();
  }
});

test("Whole modes: a whole card from an absent leader is the builder's, and nobody else's draw changes", async () => {
  for (const Mode of [MODE.SwapAbilities, MODE.SwapLeaders]) {
    const base = await runBoth({ spec: { seed: 7, options: { Mode }, notInGame } });
    const r = await deal(Mode, ["LEADER_PACHACUTI__WHOLE"]);
    try {
      assert.deepEqual(held(r, BUILDER).map((p) => p.PieceId), ["LEADER_PACHACUTI__WHOLE"], Mode);
      const others = (x) => x.objects("sql").pieces.filter((p) => p.LeaderType !== BUILDER)
        .map((p) => `${p.LeaderType}|${p.PieceId}`).sort();
      assert.deepEqual(others(r), others(base), `${Mode}: the other leaders keep their draw`);
      noNewKeys(r.run.db, Mode);
    } finally {
      r.run.close();
      base.run.close();
    }
  }
});

test("an absent leader's unlock pinned to a piece goes to whoever took that piece, else nobody", async () => {
  const unlock = (r) => r.objects("sql").unlocks
    .find((u) => u.ProgressionTreeNodeType === "NODE_CIVIC_AQ_MAIN_DISCIPLINE" && u.TargetType === "UNIT_FLEET_COMMANDER");
  const fleet = (r) => rows(r.run.db, "SELECT LeaderType FROM LeaderTraits WHERE TraitType = 'TRAIT_UNLOCK_FLEET_COMMANDER'")
    .map((x) => x.LeaderType);
  const took = await deal(MODE.SplitRandom, ["LEADER_YI_SUN_SIN__B01"]);
  try {
    assert.equal(unlock(took).ToLeaderType, BUILDER, "the builder took the Fleet Commander piece");
    assert.deepEqual(fleet(took), [BUILDER], "and can build Fleet Commanders");
    noNewKeys(took.run.db, "Yi B01");
  } finally {
    took.run.close();
  }
  const other = await deal(MODE.SplitRandom, ["LEADER_YI_SUN_SIN__B02"]);
  try {
    assert.equal(unlock(other).ToLeaderType, "LEADER_YI_SUN_SIN", "the pinned piece wasn't taken: it stays with Yi");
    assert.ok(!fleet(other).includes(BUILDER), "the builder can't build Fleet Commanders");
  } finally {
    other.run.close();
  }
});

test("two builders: a lower slot's card from an absent leader is gone for a higher slot", async () => {
  const builders = [
    { slot: 1, leader: BUILDER, pieces: ["LEADER_PACHACUTI__B01"] },
    { slot: 2, leader: "LEADER_AMINA", pieces: ["LEADER_PACHACUTI__B01", "LEADER_PACHACUTI__WHOLE"] }
  ];
  const r = await runBoth({ spec: { seed: 11, options: { Mode: MODE.SplitRandom }, notInGame, builders } });
  try {
    assertSameResult(r.js, r.sql, "two builders");
    assert.deepEqual(held(r, BUILDER).map((p) => p.PieceId), ["LEADER_PACHACUTI__B01"]);
    const amina = held(r, "LEADER_AMINA").map((p) => p.PieceId);
    assert.ok(!amina.includes("LEADER_PACHACUTI__B01") && !amina.includes("LEADER_PACHACUTI__WHOLE"), amina.join(","));
  } finally {
    r.run.close();
  }
});
