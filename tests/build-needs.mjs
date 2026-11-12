// uniqueNeeds(cards, picks) (ui/setup/lshuf-build-needs.js): a picked card whose text names a unique the builder
// doesn't hold, by the unique's icon or its name, with the unique's card.
import assert from "node:assert/strict";
import test from "node:test";

import { importShipped } from "./_harness.mjs";

const load = () => importShipped("ui/setup/lshuf-build-needs.js");

const COLONIST = { id: "CIVUNQ_UNIT_COLONIST", kind: "civunique", name: "Colonist", civ: "CIVILIZATION_CARTHAGE" };
const BYRSA = { id: "CIVUNQ_QUARTER_BYRSA", kind: "civunique", name: "Byrsa", civ: "CIVILIZATION_CARTHAGE" };
const LEGION = { id: "CIVUNQ_UNIT_LEGION", kind: "civunique", name: "Legion", civ: "CIVILIZATION_ROME", own: true };
const MERCHANTS = { id: "CIVILIZATION_CARTHAGE__B02", kind: "civbullet", civ: "CIVILIZATION_CARTHAGE",
  text: "Receive a second [icon:UNIT_MERCHANT] [B]Merchant[/B] or [icon:UNIT_COLONIST] [B]Colonist[/B] each time." };
const BYRSA_BONUS = { id: "CIVILIZATION_CARTHAGE__B03", kind: "civbullet", civ: "CIVILIZATION_CARTHAGE",
  text: "[B]+30% Production[/B] towards constructing [B]Byrsa[/B]." };
const LEGION_BONUS = { id: "CIVILIZATION_ROME__B01", kind: "civbullet", civ: "CIVILIZATION_ROME",
  text: "Your [icon:UNIT_LEGION] Legions heal faster." };
const CARDS = [COLONIST, BYRSA, LEGION, MERCHANTS, BYRSA_BONUS, LEGION_BONUS];

test("a bonus naming a unique by its icon or by its name needs it; a standard unit like the Merchant doesn't", async () => {
  const { uniqueNeeds } = await load();
  const needs = uniqueNeeds(CARDS, [MERCHANTS.id, BYRSA_BONUS.id]);
  assert.deepEqual(needs.map((n) => [n.card.id, n.unique.id]), [
    [MERCHANTS.id, COLONIST.id],
    [BYRSA_BONUS.id, BYRSA.id]
  ]);
});

test("a unique the builder picked, or its own civilization's, isn't needed", async () => {
  const { uniqueNeeds } = await load();
  assert.deepEqual(uniqueNeeds(CARDS, [MERCHANTS.id, COLONIST.id]), []);
  assert.deepEqual(uniqueNeeds(CARDS, [LEGION_BONUS.id]), []);
});

test("nothing picked, or a screen without unique cards, gives no needs", async () => {
  const { uniqueNeeds } = await load();
  assert.deepEqual(uniqueNeeds(CARDS, []), []);
  assert.deepEqual(uniqueNeeds([MERCHANTS], [MERCHANTS.id]), []);
});

const BUCCANEER = { id: "CIVUNQ_UNIT_BUCCANEER", kind: "civunique", name: "Buccaneer", civ: "CIVILIZATION_PIRATE_REPUBLIC" };
const CHARGE = { id: "CIVILIZATION_PIRATE_REPUBLIC__B02", kind: "civbullet", name: "Ruthless Reputation 2",
  text: "[B][icon:UNIT_BUCCANEER] Buccaneers[/B] gain [B]1 charge to create a new Settlement[/B]." };
const NO_SETTLERS = { id: "CIVILIZATION_PIRATE_REPUBLIC__B03", kind: "civbullet", name: "Ruthless Reputation 3",
  text: "[icon:UNIT_SETTLER] [B]Settlers[/B] cannot be trained or purchased." };
const PIRATES = [BUCCANEER, CHARGE, NO_SETTLERS];

test("the Pirates' no-Settlers bonus needs the settle charge, and the charge names the Buccaneer", async () => {
  const { uniqueNeeds } = await load();
  const alone = uniqueNeeds(PIRATES, [NO_SETTLERS.id]);
  assert.deepEqual(alone.map((n) => [n.card.id, n.unique.id, !!n.bonus]), [[NO_SETTLERS.id, CHARGE.id, true]]);
  const two = uniqueNeeds(PIRATES, [NO_SETTLERS.id, CHARGE.id]);
  assert.deepEqual(two.map((n) => [n.card.id, n.unique.id, !!n.bonus]), [[CHARGE.id, BUCCANEER.id, false]]);
  assert.deepEqual(uniqueNeeds(PIRATES, [NO_SETTLERS.id, CHARGE.id, BUCCANEER.id]), []);
  // With no unique cards on the screen the bonus still asks for its other half.
  assert.equal(uniqueNeeds([CHARGE, NO_SETTLERS], [NO_SETTLERS.id]).length, 1);
});
