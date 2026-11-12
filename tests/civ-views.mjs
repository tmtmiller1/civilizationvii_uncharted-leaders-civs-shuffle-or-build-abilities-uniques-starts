// The civ select and loading screen views (ui/display/lshuf-civ-views.js): a builder's civ shows the ability it
// took, the uniques it took alongside its own, and the civics rows of the civ whose tree it got; the giver's card
// loses what left.
import assert from "node:assert/strict";
import test from "node:test";

import { civDealViews } from "../ui/display/lshuf-civ-views.js";

const ROME = "CIVILIZATION_ROME";
const GREECE = "CIVILIZATION_GREECE";
const row = (civ, kind, type) => ({
  CivilizationDomain: "AntiquityAgeCivilizations", CivilizationType: civ, AgeType: kind === "KIND_TRAIT" ? "AGE_ANTIQUITY" : null,
  Type: type, Kind: kind, Name: `LOC_${type}_NAME`, Description: `LOC_${type}_DESCRIPTION`, Icon: null, SortIndex: 0, CanSyncretize: 0
});
const shipped = new Map([
  [ROME, { rows: [row(ROME, "KIND_TRAIT", "TRAIT_ROME_ABILITY"), row(ROME, "KIND_UNIT", "UNIT_LEGION"),
    row(ROME, "KIND_UNIT", "UNIT_LEGATUS"), row(ROME, "KIND_QUARTER", "QUARTER_FORUM"), row(ROME, "KIND_BUILDING", "BUILDING_BASILICA")] }],
  [GREECE, { rows: [row(GREECE, "KIND_TRAIT", "TRAIT_GREECE_ABILITY"), row(GREECE, "KIND_UNIT", "UNIT_HOPLITE"),
    row(GREECE, "KIND_QUARTER", "QUARTER_ACROPOLIS"), row(GREECE, "KIND_BUILDING", "BUILDING_ODEON")] }]
]);
const pieces = [
  { CivilizationType: ROME, PieceId: "CIVABIL_CIVILIZATION_GREECE", FromCivilization: GREECE, Kind: "ability", SortIndex: 0 },
  { CivilizationType: GREECE, PieceId: "CIVABIL_CIVILIZATION_ROME", FromCivilization: ROME, Kind: "ability", SortIndex: 0 },
  { CivilizationType: ROME, PieceId: "CIVUNQ_UNIT_HOPLITE", FromCivilization: GREECE, Kind: "unique", SortIndex: 1 },
  { CivilizationType: ROME, PieceId: "CIVCIVC_CIVILIZATION_GREECE", FromCivilization: GREECE, Kind: "civics", SortIndex: 0 },
  { CivilizationType: GREECE, PieceId: "CIVCIVC_CIVILIZATION_ROME", FromCivilization: ROME, Kind: "civics", SortIndex: 0 }
];

test("Rome with Greece's ability, Hoplite and civics: Demokratia, Hoplite with its own units, Greece's buildings", () => {
  const rome = civDealViews(pieces, shipped).get(ROME);
  assert.equal(rome.ability.Name, "LOC_TRAIT_GREECE_ABILITY_NAME");
  assert.deepEqual(rome.uniques.map((u) => u.Type), ["UNIT_HOPLITE", "UNIT_LEGION", "UNIT_LEGATUS", "QUARTER_ACROPOLIS", "BUILDING_ODEON"]);
});

test("Greece gives: Rome's ability, no Hoplite, Rome's buildings with Rome's civics", () => {
  const greece = civDealViews(pieces, shipped).get(GREECE);
  assert.equal(greece.ability.Name, "LOC_TRAIT_ROME_ABILITY_NAME");
  assert.deepEqual(greece.uniques.map((u) => u.Type), ["QUARTER_FORUM", "BUILDING_BASILICA"]);
});

test("no deal rows: every civ shows what it ships with", () => {
  const rome = civDealViews([], shipped).get(ROME);
  assert.equal(rome.ability.Name, "LOC_TRAIT_ROME_ABILITY_NAME");
  assert.deepEqual(rome.uniques.map((u) => u.Type), ["UNIT_LEGION", "UNIT_LEGATUS", "QUARTER_FORUM", "BUILDING_BASILICA"]);
});

// Attribute tags (CONTRACTS 30): a civ shows the tags it was dealt, the giver's as shipped.
const tagRows = (civ, tags) => tags.map((t) => ({ CivilizationDomain: "AntiquityAgeCivilizations", CivilizationType: civ, TagType: t }));
const shippedTags = new Map([
  [ROME, { ...shipped.get(ROME), tagRows: tagRows(ROME, ["TAG_TRAIT_CULTURAL", "TAG_TRAIT_MILITARISTIC"]) }],
  [GREECE, { ...shipped.get(GREECE), tagRows: tagRows(GREECE, ["TAG_TRAIT_CULTURAL", "TAG_TRAIT_POLITICAL"]) }]
]);
const tagsRow = (civ, from) => ({ CivilizationType: civ, PieceId: `CIVTAGS_${from}`, FromCivilization: from, Kind: "tags", SortIndex: 0 });

test("a civ shows the attribute tags it was dealt, and its own without a tags row", () => {
  const views = civDealViews([...pieces, tagsRow(ROME, GREECE), tagsRow(GREECE, ROME)], shippedTags);
  assert.deepEqual(views.get(ROME).tags, ["TAG_TRAIT_CULTURAL", "TAG_TRAIT_POLITICAL"]);
  assert.deepEqual(views.get(GREECE).tags, ["TAG_TRAIT_CULTURAL", "TAG_TRAIT_MILITARISTIC"]);
  assert.deepEqual(civDealViews([], shippedTags).get(ROME).tags, ["TAG_TRAIT_CULTURAL", "TAG_TRAIT_MILITARISTIC"]);
  assert.equal(civDealViews([], shipped).get(ROME).tags, null, "no tags copy: the screens leave the tags alone");
});
