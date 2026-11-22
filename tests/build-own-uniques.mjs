// Your civilization's own uniques on the civ build page (ui/setup/lshuf-build-cards.js, CONTRACTS 35): where the
// settings keep them they start in the slots and a drop (CIVDROP_) takes one out; every civ has UNIQUE_MIN_SLOTS unique
// slots in all, or its own count where that's more, and Custom goes past them with a note.
import assert from "node:assert/strict";
import test from "node:test";

globalThis.Locale = { compose: (key) => key };
globalThis.Database = { query: () => [] };
globalThis.Controls = { define() {} };

const {
  cantTake, cardFor, dropOfUnique, isDrop, keptOwnUniques, otherPagePicks, overGroups, slotPicks, slotsShown,
  uniqueOfDrop, uniqueSlotCount
} = await import("../ui/setup/lshuf-build-cards.js");
const { UNIQUE_MIN_SLOTS } = await import("../shared/lshuf-constants.js");

const TERCIO = { id: "CIVUNQ_UNIT_TERCIO", kind: "civunique", own: true, reviewed: true, civ: "CIVILIZATION_SPAIN" };
const LEGION = { id: "CIVUNQ_UNIT_LEGION", kind: "civunique", reviewed: true, civ: "CIVILIZATION_ROME" };
const LEGATUS = { id: "CIVUNQ_UNIT_LEGATUS", kind: "civunique", reviewed: true, civ: "CIVILIZATION_ROME" };
const CARDS = [TERCIO, LEGION, LEGATUS];
const byId = new Map(CARDS.map((c) => [c.id, c]));
const DROP = "CIVDROP_UNIT_TERCIO";

test("slot counts: two in all, own included, or the own count where that's more", () => {
  assert.equal(UNIQUE_MIN_SLOTS, 2);
  assert.equal(uniqueSlotCount(1), 2, "Spain: the Tercio and one more");
  assert.equal(uniqueSlotCount(2), 2, "the Inca: Chasqui and Warakaq; one comes out to take another");
  assert.equal(uniqueSlotCount(3), 3);
  assert.equal(uniqueSlotCount(0), 2);
});

test("a drop names the own unique it takes out", () => {
  assert.equal(dropOfUnique(TERCIO.id), DROP);
  assert.equal(uniqueOfDrop(DROP), TERCIO.id);
  assert.equal(isDrop(DROP), true);
  assert.equal(isDrop(TERCIO.id), false);
});

test("kept own uniques start in the slots, and a drop takes one out", () => {
  assert.deepEqual(keptOwnUniques(CARDS, [], true), [TERCIO.id]);
  assert.deepEqual(slotPicks(CARDS, [LEGION.id], true), [TERCIO.id, LEGION.id]);
  assert.deepEqual(slotPicks(CARDS, [DROP, LEGION.id], true), [LEGION.id]);
  assert.deepEqual(slotPicks(CARDS, [LEGION.id], false), [LEGION.id], "Split up and Off keep none");
});

test("the kept own unique uses a slot: with it, one more fits; out, a whole two-unit set fits", () => {
  const counts = { civUniques: uniqueSlotCount(1) };
  assert.equal(cantTake(TERCIO, slotPicks(CARDS, [], true), counts), "taken", "in its slot, a click takes it out");
  const one = slotPicks(CARDS, [LEGION.id], true);
  assert.equal(one.length, 2);
  assert.equal(cantTake(LEGATUS, one, counts), "full", "the Tercio and the Legion fill Spain's two");
  const dropped = slotPicks(CARDS, [DROP, LEGION.id], true);
  assert.equal(cantTake(LEGATUS, dropped, counts), null, "the Tercio's slot is free");
  assert.equal(cantTake(TERCIO, slotPicks(CARDS, [DROP, LEGION.id, LEGATUS.id], true), counts), "full",
    "putting the Tercio back needs a free slot");
  assert.equal(cantTake(TERCIO, dropped, counts), null);
});

test("on Custom the uniques group still goes past two, and says so", () => {
  const counts = { ...COUNTS, civUniques: uniqueSlotCount(1) };
  const three = slotPicks(CARDS, [LEGION.id, LEGATUS.id], true);
  assert.equal(cantTake(HOPLITE, three, counts, true), null, "Custom: a fourth goes in");
  assert.equal(cantTake(HOPLITE, three, counts, false), "full", "not Custom: two is the limit");
  assert.deepEqual(overGroups(three, counts, true), [{ group: "civUniques", have: 3, normal: 2 }]);
});

test("a drop belongs to the civ page of its civ; the leader page and another civ's page don't hold it", () => {
  assert.equal(cardFor(byId, DROP), TERCIO);
  assert.deepEqual(otherPagePicks([DROP, LEGION.id], byId), [], "this civ's page holds both");
  assert.deepEqual(otherPagePicks([DROP, "ATTR_TRAIT_LEADER_ATTRIBUTE_CULTURAL"], new Map()),
    [DROP, "ATTR_TRAIT_LEADER_ATTRIBUTE_CULTURAL"], "the leader page leaves it alone");
  const rome = new Map([[LEGION.id, { ...LEGION, own: true }]]);
  assert.equal(cardFor(rome, DROP), null, "Rome's page doesn't answer for Spain's drop");
  const notOwn = new Map([[TERCIO.id, { ...TERCIO, own: false }]]);
  assert.equal(cardFor(notOwn, DROP), null, "a drop counts only for the builder civ's own unique");
});

// --- Custom takes more than the normal number (CONTRACTS 35) ---

const COUNTS = { ability: 2, attributes: 2, behavior: 1, terrain: 1, civAbility: 0, civUniques: 3, civCivics: 1,
  civTerrain: 1 };
const HOPLITE = { id: "CIVUNQ_UNIT_HOPLITE", kind: "civunique", reviewed: true };
const NU = { id: "CIVUNQ_UNIT_NU", kind: "civunique", reviewed: true };
const FULL = [TERCIO.id, LEGION.id, LEGATUS.id];

test("on Custom a full group still takes cards; on any other setting it reads full", () => {
  assert.equal(cantTake(HOPLITE, FULL, COUNTS), "full");
  assert.equal(cantTake(HOPLITE, FULL, COUNTS, true), null);
  assert.equal(cantTake(NU, [...FULL, HOPLITE.id], COUNTS, true), null, "and keeps taking them");
});

test("on Custom start terrain and AI behavior keep their one slot", () => {
  const bias = { id: "BIAS_LEADER_ISABELLA", kind: "bias", reviewed: true };
  const persona = { id: "PERSONA_LEADER_ISABELLA", kind: "persona", reviewed: true };
  assert.equal(cantTake(bias, ["BIAS_LEADER_AUGUSTUS"], COUNTS, true), "full");
  assert.equal(cantTake(persona, ["PERSONA_LEADER_AUGUSTUS"], COUNTS, true), "full");
  assert.equal(slotsShown("terrain", ["BIAS_LEADER_AUGUSTUS"], COUNTS, true), 1);
});

test("a whole card still needs an empty group on Custom", () => {
  const tree = { id: "CIVCIVC_CIVILIZATION_ROME", kind: "civcivics", reviewed: true };
  assert.equal(cantTake(tree, ["CIVNODE_NODE_CIVIC_AQ_ROME_CIVIS_ROMANUS"], COUNTS, true), "full");
  assert.equal(cantTake(tree, [], COUNTS, true), null);
});

test("an open group draws its normal count, or one more than it holds once it's full", () => {
  assert.equal(slotsShown("civUniques", [LEGION.id], COUNTS, true), 3);
  assert.equal(slotsShown("civUniques", FULL, COUNTS, true), 4, "full: an empty slot to click into");
  assert.equal(slotsShown("civUniques", [...FULL, HOPLITE.id], COUNTS, true), 5);
  assert.equal(slotsShown("civUniques", FULL, COUNTS), 3, "not Custom: the normal count");
  assert.equal(slotsShown("civAbility", [], COUNTS, true), 0, "a group the page doesn't have stays hidden");
});

test("the note lists only the groups over their normal count, and only on Custom", () => {
  assert.deepEqual(overGroups(FULL, COUNTS, true), [], "at the normal count: no note");
  assert.deepEqual(overGroups([...FULL, HOPLITE.id], COUNTS, true),
    [{ group: "civUniques", have: 4, normal: 3 }]);
  assert.deepEqual(overGroups([...FULL, HOPLITE.id], COUNTS, false), []);
});

test("the kept own uniques count toward the uniques group's normal", () => {
  const counts = { ...COUNTS, civUniques: uniqueSlotCount(1) };
  const inSlots = slotPicks(CARDS, [LEGION.id, LEGATUS.id], true);
  assert.deepEqual(overGroups(inSlots, counts, true), [{ group: "civUniques", have: 3, normal: 2 }]);
});
