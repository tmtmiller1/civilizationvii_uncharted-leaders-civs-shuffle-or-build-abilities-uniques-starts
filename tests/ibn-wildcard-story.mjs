// Ibn Battuta's Wildcard points come from the base game's narrative event ATTRIBUTE_79A, gated on his leader type.
// When his ability is dealt, the event asks for TRAIT_LSHUF_IBN_WILDCARD instead, held by whoever has his Wildcard
// bonus (sql-apply.mjs storyFollows). Lab 2026-11-09: a copied bonus alone gave Amina nothing.
import assert from "node:assert/strict";
import test from "node:test";

import { fixtureForeignKeys, newForeignKeyRows, rows } from "./_harness.mjs";
import { runBoth } from "./_deal.mjs";
import { MODE } from "../shared/lshuf-constants.js";
import { KNOWN_LEADERS } from "../shared/lshuf-known-leaders.js";

const SETS = "('REQSET_ATTRIBUTE_79A_NARRATIVE', 'REQSET_ATTRIBUTE_79A_NARRATIVE_REQUISITE')";
const setReqs = (db) => rows(db, `SELECT RequirementSetId, RequirementId FROM RequirementSetRequirements
  WHERE RequirementSetId IN ${SETS} AND RequirementId IN ('REQ_STORY_LEADER_IBN_BATTUTA', 'REQ_LSHUF_IBN_WILDCARD') ORDER BY 1`);
const holders = (db) => rows(db, "SELECT LeaderType FROM LeaderTraits WHERE TraitType = 'TRAIT_LSHUF_IBN_WILDCARD'")
  .map((r) => r.LeaderType);

test("the fixture has Ibn Battuta's Wildcard event on his leader type", async () => {
  const r = await runBoth({ spec: { seed: 7, options: { Mode: MODE.None } }, js: false });
  try {
    const reqs = setReqs(r.run.pre);
    assert.equal(reqs.length, 2, "both 79A sets ask for his leader type");
    assert.ok(reqs.every((x) => x.RequirementId === "REQ_STORY_LEADER_IBN_BATTUTA"));
  } finally {
    r.run.close();
  }
});

test("a builder holding his Wildcard bonus gets the event; Ibn Battuta, absent, has nothing to lose", async () => {
  const playing = ["LEADER_AMINA", "LEADER_AUGUSTUS", "LEADER_HATSHEPSUT", "LEADER_CONFUCIUS"];
  const notInGame = KNOWN_LEADERS.filter((l) => !playing.includes(l));
  const r = await runBoth({
    spec: { seed: 7, options: { Mode: MODE.SplitRandom }, notInGame, builder: { leader: "LEADER_AMINA", pieces: ["LEADER_IBN_BATTUTA__B01"] } },
    js: false
  });
  try {
    assert.deepEqual(setReqs(r.run.db).map((x) => x.RequirementId), ["REQ_LSHUF_IBN_WILDCARD", "REQ_LSHUF_IBN_WILDCARD"]);
    assert.deepEqual(holders(r.run.db), ["LEADER_AMINA"]);
    const arg = rows(r.run.db, "SELECT Value FROM RequirementArguments WHERE RequirementId = 'REQ_LSHUF_IBN_WILDCARD' AND Name = 'TraitType'");
    assert.deepEqual(arg.map((a) => a.Value), ["TRAIT_LSHUF_IBN_WILDCARD"]);
    const fk = newForeignKeyRows(r.run.db, fixtureForeignKeys("base"));
    assert.deepEqual([fk.fresh, fk.newErrors], [[], []]);
  } finally {
    r.run.close();
  }
});

test("whoever the split deal gives his Wildcard bonus holds the trait, and only that leader", async () => {
  for (const seed of [3, 41, 200]) {
    const r = await runBoth({ spec: { seed, options: { Mode: MODE.SplitRandom } }, js: false });
    try {
      const piece = r.objects("sql").pieces.find((p) => p.PieceId === "LEADER_IBN_BATTUTA__B01");
      const got = holders(r.run.db);
      if (piece && piece.LeaderType === "LEADER_IBN_BATTUTA") assert.deepEqual(got, [], `seed ${seed}: kept, as shipped`);
      else if (piece) assert.deepEqual(got, [piece.LeaderType], `seed ${seed}`);
      else assert.ok(got.length <= 1, `seed ${seed}: one holder at most`);
    } finally {
      r.run.close();
    }
  }
});
