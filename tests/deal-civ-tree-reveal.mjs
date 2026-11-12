// The civics tree opens for whoever holds a civ's civics (CONTRACTS 18). In Exploration and Modern the game reveals
// each civ's tree with a modifier on its ability that asks for its base trait; the civ deal moves it onto the base
// trait, so a builder holding only other civs' bonus cards, or a civ whose ability went elsewhere, still sees the tree
// of the civics it holds. Watched 2026-11-10: Spain built from Pirate Republic cards had no tree of its own.
import assert from "node:assert/strict";
import test from "node:test";

import { rows } from "./_harness.mjs";
import { runBoth } from "./_deal.mjs";
import { CA_MODE, CC_MODE, MODE } from "../shared/lshuf-constants.js";

const REVEALS = `SELECT m.ModifierId id, a.Value tree, ra.Value need FROM Modifiers m
  JOIN DynamicModifiers d ON d.ModifierType = m.ModifierType AND d.EffectType = 'EFFECT_PLAYER_REVEAL_CULTURE_TREE'
  JOIN ModifierArguments a ON a.ModifierId = m.ModifierId AND a.Name = 'ProgressionTreeType'
  JOIN RequirementSetRequirements rsr ON rsr.RequirementSetId = m.SubjectRequirementSetId
  JOIN RequirementArguments ra ON ra.RequirementId = rsr.RequirementId AND ra.Name = 'TraitType'`;

// The tree each base trait opens, from the game as shipped.
function treeOfBase(pre) {
  const out = new Map();
  for (const r of rows(pre, REVEALS)) if (!r.need.endsWith("_ABILITY")) out.set(r.need, r.tree);
  return out;
}

// civ -> the trees it sees: a reveal attached to a trait it holds, whose requirement it meets.
function seen(db) {
  const held = new Map();
  for (const r of rows(db, "SELECT CivilizationType c, TraitType t FROM CivilizationTraits")) {
    if (!held.has(r.c)) held.set(r.c, new Set());
    held.get(r.c).add(r.t);
  }
  const attached = rows(db, `SELECT tm.TraitType t, x.tree, x.need FROM TraitModifiers tm JOIN (${REVEALS}) x ON x.id = tm.ModifierId`);
  const out = new Map();
  for (const [c, traits] of held) {
    out.set(c, new Set(attached.filter((a) => traits.has(a.t) && traits.has(a.need)).map((a) => a.tree)));
  }
  return { held, out };
}

function check(r, where) {
  const trees = treeOfBase(r.run.pre);
  assert.ok(trees.size >= 10, `${where}: the shipped game reveals civ trees (${trees.size})`);
  const { held, out } = seen(r.run.db);
  let checked = 0;
  for (const [c, traits] of held) {
    const want = new Set([...traits].filter((t) => trees.has(t)).map((t) => trees.get(t)));
    if (!want.size) continue;
    checked += 1;
    for (const tree of want) assert.ok(out.get(c).has(tree), `${where}: ${c} holds the civics of ${tree} and sees it`);
  }
  assert.ok(checked >= 5, `${where}: civs checked (${checked})`);
}

const SPAIN_BUILD = {
  leader: "LEADER_AMINA", civ: "CIVILIZATION_SPAIN",
  pieces: ["CIVUNQ_UNIT_BUCCANEER", "CIVILIZATION_PIRATE_REPUBLIC__B02", "CIVILIZATION_PIRATE_REPUBLIC__B03",
    "CIVNODE_NODE_CIVIC_EX_SENGOKU_KINSEI"]
};

test("a builder holding only other civs' bonus cards still sees its own civics tree", async () => {
  const r = await runBoth({ fixture: "exploration",
    spec: { seed: 128, options: { Mode: MODE.SplitMatched, CivAbilities: CA_MODE.Split, CivUniques: "LSHUF_CU_SPLIT",
      CivCivics: CC_MODE.Split }, builder: SPAIN_BUILD } });
  try {
    check(r, "exploration builder");
    assert.ok(seen(r.run.db).out.get("CIVILIZATION_SPAIN").has("TREE_CIVICS_EX_SPAIN"), "Spain sees the tree Kinsei is in");
  } finally {
    r.run.close();
  }
});

for (const [fixture, CivAbilities, CivCivics] of [["exploration", CA_MODE.Swapped, CC_MODE.Normal],
  ["exploration", CA_MODE.Normal, CC_MODE.Paired], ["exploration", CA_MODE.Off, CC_MODE.Normal],
  ["modern", CA_MODE.Split, CC_MODE.Shuffled], ["exploration", CA_MODE.Normal, CC_MODE.Normal]]) {
  test(`${fixture} abilities ${CivAbilities}, civics ${CivCivics}: each civ sees the tree of the civics it holds`,
    async () => {
      for (const seed of [2, 9]) {
        const r = await runBoth({ fixture, spec: { seed, options: { Mode: MODE.None, CivAbilities, CivCivics } } });
        try {
          check(r, `${fixture} ${CivAbilities}/${CivCivics} seed ${seed}`);
        } finally {
          r.run.close();
        }
      }
    });
}
