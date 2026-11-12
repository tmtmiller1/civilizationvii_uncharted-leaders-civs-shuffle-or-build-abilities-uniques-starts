// The civ build screen's slot rules for civics (ui/setup/lshuf-build-cards.js, CONTRACTS 21): a whole-tree card
// fills every civics slot, single civic cards fill one each, the civics slot count follows the Whole toggle, and a
// single card names the whole card it would put back.
import assert from "node:assert/strict";
import test from "node:test";

// The module reads the shell only when asked for cards; the pure rules need the globals to exist, nothing more.
globalThis.Locale = { compose: (key) => key };
// The only table read is LShufSetup_CivRiders (CONTRACTS 23): Agoge brings Ekklesia along.
const AGOGE = "CIVNODE_NODE_CIVIC_AQ_GREECE_AGOGE";
const EKKLESIA = "CIVNODE_NODE_CIVIC_AQ_GREECE_EKKLESIA";
globalThis.Database = {
  query: (_db, sql) => (String(sql).includes("LShufSetup_CivRiders") ? [{ LeadId: AGOGE, RiderId: EKKLESIA }] : [])
};
globalThis.Controls = { define() {} };

const {
  cantTake, civicSlotCount, isWholeCard, markGoesWith, otherPagePicks, slotsUsed, wholePickInGroup
} = await import("../ui/setup/lshuf-build-cards.js");

const TREE = "CIVCIVC_CIVILIZATION_GREECE";
const NODE_A = "CIVNODE_NODE_CIVIC_AQ_GREECE_DEMOKRATIA";
const NODE_B = "CIVNODE_NODE_CIVIC_AQ_GREECE_ARETE";
const counts = {
  ability: 0, attributes: 0, behavior: 0, terrain: 0, civAbility: 1, civUniques: 2, civCivics: 3, civTerrain: 1
};
const card = (id, kind) => ({ id, kind, reviewed: true });

test("a whole tree is a whole card and fills every civics slot; civics fill one each", () => {
  assert.equal(isWholeCard("civcivics"), true);
  assert.equal(isWholeCard("civcivic"), false);
  assert.equal(slotsUsed([TREE], counts).civCivics, 3);
  assert.equal(slotsUsed([NODE_A, NODE_B], counts).civCivics, 2);
});

test("civics slots: one for whole trees, the civ's own civic count for single civics, at least one", () => {
  assert.equal(civicSlotCount(3, true), 1);
  assert.equal(civicSlotCount(3, false), 3);
  assert.equal(civicSlotCount(0, false), 1, "a civ with no tree of its own still takes civics");
  assert.equal(civicSlotCount(0, true), 1, "and whole trees");
});

test("cantTake: a civic goes in while slots are free, reads full once they are, taken once it's in", () => {
  assert.equal(cantTake(card(NODE_A, "civcivic"), [], counts), null);
  assert.equal(cantTake(card(NODE_A, "civcivic"), [NODE_A], counts), "taken");
  const full = { ...counts, civCivics: 1 };
  assert.equal(cantTake(card(NODE_B, "civcivic"), [NODE_A], full), "full");
  assert.equal(cantTake(card(TREE, "civcivics"), [NODE_A], counts), "full", "a tree needs an empty group");
  assert.equal(cantTake(card(TREE, "civcivics"), [], counts), null);
});

test("another age's civic can't be taken; the tooltip says so through otherage", () => {
  assert.equal(cantTake({ ...card(NODE_A, "civcivic"), ageOnly: true, otherAge: "Exploration" }, [], counts), "otherage");
});

test("wholePickInGroup: a civic names the tree in its group, nothing else", () => {
  assert.equal(wholePickInGroup(card(NODE_A, "civcivic"), [TREE, "CIVUNQ_UNIT_HOPLITE"]), TREE);
  assert.equal(wholePickInGroup(card(NODE_A, "civcivic"), ["CIVABIL_CIVILIZATION_ROME"]), null, "another group's whole");
  assert.equal(wholePickInGroup(card(NODE_A, "civcivic"), [NODE_B]), null);
  assert.equal(wholePickInGroup(card(TREE, "civcivics"), [NODE_A]), null, "a whole card never replaces a single one");
  assert.equal(wholePickInGroup(card("CIVILIZATION_ROME__B01", "civbullet"), ["CIVABIL_CIVILIZATION_ROME"]),
    "CIVABIL_CIVILIZATION_ROME", "the same rule serves bonuses against a whole ability");
});

test("a civic that brings another along uses a slot for each and needs room for both", () => {
  assert.equal(slotsUsed([AGOGE], counts).civCivics, 2);
  assert.equal(cantTake(card(AGOGE, "civcivic"), [], counts), null);
  assert.equal(cantTake(card(AGOGE, "civcivic"), [NODE_A, NODE_B], counts), "bundle", "one slot left, two needed");
  assert.equal(cantTake(card(NODE_A, "civcivic"), [AGOGE], counts), null, "a single civic fits the third slot");
  assert.equal(cantTake(card(NODE_B, "civcivic"), [AGOGE, NODE_A], counts), "full");
});

test("a bonus that goes with a civic riding on another card points at that card (Joseon's Ihak)", () => {
  const lead = { id: AGOGE, kind: "civcivic", name: "Agoge" };
  const bonus = { id: "CIVILIZATION_GREECE__B02", kind: "civbullet", goesWith: EKKLESIA, text: "" };
  const missing = { id: "CIVILIZATION_GREECE__B03", kind: "civbullet", goesWith: "CIVNODE_GONE", text: "" };
  markGoesWith([lead, bonus, missing]);
  assert.equal(bonus.goesWith, AGOGE, "the click takes the card the rider comes in on");
  assert.equal(bonus.goesWithName, "Agoge");
  assert.equal(bonus.blocked, undefined);
  assert.equal(missing.blocked, "goeswith");
  const listed = { id: "CIVILIZATION_GREECE__B04", kind: "civbullet", goesWith: AGOGE, text: "[BLIST][LI]Own text[/BLIST]" };
  markGoesWith([lead, listed]);
  assert.equal(listed.text.split("[LI]").length, 3, "one list: its own line and the goes-with line");
  assert.ok(!listed.text.includes("[LI][BLIST]"), "no list inside a list");
});

test("an attribute's second copy belongs to this page, so Clear and a third click take it out", () => {
  const attr = { id: "ATTR_TRAIT_LEADER_ATTRIBUTE_CULTURAL", kind: "attribute" };
  const byId = new Map([[attr.id, attr]]);
  const picks = [attr.id, "ATTR2_TRAIT_LEADER_ATTRIBUTE_CULTURAL", "CIVUNQ_UNIT_LEGION"];
  assert.deepEqual(otherPagePicks(picks, byId), ["CIVUNQ_UNIT_LEGION"]);
});
