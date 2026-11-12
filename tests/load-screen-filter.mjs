// The loading screen's trait-based pages (ui/game/lshuf-load-screen.js heldFilter): a civ that took uniques or a
// civics tree lists what it holds now, a civ nothing touched lists what it ships with.
import assert from "node:assert/strict";
import test from "node:test";

import { heldFilter } from "../ui/game/lshuf-load-screen.js";

const ROME = "TRAIT_ROME";
const OWN = "TRAIT_LSHUF_CIV_CIVILIZATION_ROME";
const units = [
  { UnitType: "UNIT_LEGION", TraitType: OWN },
  { UnitType: "UNIT_HOPLITE", TraitType: OWN },
  { UnitType: "UNIT_ODEON_GUARD", TraitType: "TRAIT_GREECE" },
  { UnitType: "UNIT_WARRIOR", TraitType: null }
];
const traditions = [
  { TraditionType: "TRADITION_AUXILIA", TraitType: ROME, AgeType: null },
  { TraditionType: "TRADITION_GREEK_1", TraitType: "TRAIT_GREECE", AgeType: null },
  { TraditionType: "TRADITION_GREEK_LATE", TraitType: "TRAIT_GREECE", AgeType: "AGE_EXPLORATION" }
];
const byTrait = (t) => (u) => u.TraitType === t;

test("Rome holding Greece's civics and its own units: the pages list what Rome holds, not what it gave away", () => {
  const held = new Set(["TRAIT_GREECE", OWN, "TRAIT_GREECE_ABILITY"]);
  assert.deepEqual(heldFilter(units, byTrait(ROME), ROME, held).map((u) => u.UnitType), ["UNIT_LEGION", "UNIT_HOPLITE", "UNIT_ODEON_GUARD"]);
  const age = "AGE_ANTIQUITY";
  const pred = (t) => t.TraitType === ROME && (!t.AgeType || t.AgeType === age);
  assert.deepEqual(heldFilter(traditions, pred, ROME, held).map((t) => t.TraditionType), ["TRADITION_GREEK_1"],
    "Greek traditions of this age, Rome's own gone with its civics");
});

test("a civ nothing touched, and a test that isn't about the base trait, read as the game reads them", () => {
  const held = new Set([ROME, "TRAIT_ROME_ABILITY"]);
  const rome = [{ UnitType: "UNIT_LEGION", TraitType: ROME }, ...units];
  assert.deepEqual(heldFilter(rome, byTrait(ROME), ROME, held), rome.filter(byTrait(ROME)));
  const byType = (u) => u.UnitType === "UNIT_HOPLITE";
  assert.deepEqual(heldFilter(units, byType, ROME, held), units.filter(byType), "a test on another column passes through");
  assert.deepEqual(heldFilter(units, byTrait(ROME), null, held), [], "no base trait: the game's own answer");
});
