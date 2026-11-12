// Single civics on the civ select and loading screen (ui/display/lshuf-civ-views.js, CONTRACTS 21): a civ that
// took one civic shows the buildings that civic unlocks alongside its own, and the giver's card loses them.
import assert from "node:assert/strict";
import test from "node:test";

import { civDealViews, civicNodeRows } from "../ui/display/lshuf-civ-views.js";

const ROME = "CIVILIZATION_ROME";
const GREECE = "CIVILIZATION_GREECE";
const row = (civ, kind, type) => ({
  CivilizationDomain: "AntiquityAgeCivilizations", CivilizationType: civ, AgeType: kind === "KIND_TRAIT" ? "AGE_ANTIQUITY" : null,
  Type: type, Kind: kind, Name: `LOC_${type}_NAME`, Description: `LOC_${type}_DESCRIPTION`, Icon: null, SortIndex: 0, CanSyncretize: 0
});
const shipped = new Map([
  [ROME, { rows: [row(ROME, "KIND_TRAIT", "TRAIT_ROME_ABILITY"), row(ROME, "KIND_UNIT", "UNIT_LEGION"),
    row(ROME, "KIND_QUARTER", "QUARTER_FORUM"), row(ROME, "KIND_BUILDING", "BUILDING_BASILICA"),
    row(ROME, "KIND_BUILDING", "BUILDING_TEMPLE_OF_JUPITER")] }],
  [GREECE, { rows: [row(GREECE, "KIND_TRAIT", "TRAIT_GREECE_ABILITY"), row(GREECE, "KIND_UNIT", "UNIT_HOPLITE"),
    row(GREECE, "KIND_UNIT", "UNIT_LOGIOS"), row(GREECE, "KIND_QUARTER", "QUARTER_ACROPOLIS"), row(GREECE, "KIND_BUILDING", "BUILDING_ODEON"),
    row(GREECE, "KIND_BUILDING", "BUILDING_PARTHENON")] }]
]);
// What each civic unlocks, as LShufSetup_CivCivics has it (traditions left out).
const unlocks = new Map([
  ["NODE_CIVIC_AQ_GREECE_DEMOKRATIA", ["BUILDING_ODEON"]],
  // A great person tied to the Acropolis rides with the civics (CONTRACTS 23), as the Watonathi does.
  ["NODE_CIVIC_AQ_GREECE_ARETE", ["UNIT_LOGIOS"]],
  ["NODE_CIVIC_AQ_ROME_IMPERIUM", ["BUILDING_BASILICA", "BUILDING_TEMPLE_OF_JUPITER"]]
]);
const civic = (taker, node, giver, i) => ({
  CivilizationType: taker, PieceId: `CIVNODE_${node}`, FromCivilization: giver, Kind: "civic", SortIndex: i
});

test("civicNodeRows: the giver's rows of what the node unlocks, a civics unit included, a unit card never", () => {
  const greek = shipped.get(GREECE).rows;
  assert.deepEqual(civicNodeRows("NODE_CIVIC_AQ_GREECE_DEMOKRATIA", greek, unlocks).map((r) => r.Type), ["BUILDING_ODEON"]);
  assert.deepEqual(civicNodeRows("NODE_CIVIC_AQ_GREECE_ARETE", greek, unlocks).map((r) => r.Type), ["UNIT_LOGIOS"]);
  assert.deepEqual(civicNodeRows("NODE_CIVIC_NOT_THERE", greek, unlocks), []);
  assert.deepEqual(civicNodeRows("NODE_CIVIC_AQ_GREECE_DEMOKRATIA", undefined, unlocks), []);
});

test("Rome takes Demokratia: it gains the Odeon after its own rows, Greece loses the Odeon", () => {
  const views = civDealViews([civic(ROME, "NODE_CIVIC_AQ_GREECE_DEMOKRATIA", GREECE, 1)], shipped, unlocks);
  assert.deepEqual(views.get(ROME).uniques.map((u) => u.Type),
    ["UNIT_LEGION", "QUARTER_FORUM", "BUILDING_BASILICA", "BUILDING_TEMPLE_OF_JUPITER", "BUILDING_ODEON"]);
  assert.deepEqual(views.get(GREECE).uniques.map((u) => u.Type),
    ["UNIT_HOPLITE", "UNIT_LOGIOS", "QUARTER_ACROPOLIS", "BUILDING_PARTHENON"]);
  assert.equal(views.get(ROME).ability.Name, "LOC_TRAIT_ROME_ABILITY_NAME", "the ability stays");
});

test("a civic that unlocks two buildings moves both; one that unlocks a civics unit moves the unit", () => {
  const pieces = [
    civic(GREECE, "NODE_CIVIC_AQ_ROME_IMPERIUM", ROME, 1),
    civic(ROME, "NODE_CIVIC_AQ_GREECE_ARETE", GREECE, 1)
  ];
  const views = civDealViews(pieces, shipped, unlocks);
  assert.deepEqual(views.get(GREECE).uniques.map((u) => u.Type),
    ["UNIT_HOPLITE", "QUARTER_ACROPOLIS", "BUILDING_ODEON", "BUILDING_PARTHENON", "BUILDING_BASILICA", "BUILDING_TEMPLE_OF_JUPITER"]);
  assert.deepEqual(views.get(ROME).uniques.map((u) => u.Type), ["UNIT_LEGION", "QUARTER_FORUM", "UNIT_LOGIOS"]);
});

test("SortIndex runs 0.. over the final rows", () => {
  const views = civDealViews([civic(ROME, "NODE_CIVIC_AQ_GREECE_DEMOKRATIA", GREECE, 1)], shipped, unlocks);
  assert.deepEqual(views.get(ROME).uniques.map((u) => u.SortIndex), [0, 1, 2, 3, 4]);
});

test("no civic rows: the unlock table isn't needed and nothing changes", () => {
  const views = civDealViews([], shipped);
  assert.deepEqual(views.get(ROME).uniques.map((u) => u.Type),
    ["UNIT_LEGION", "QUARTER_FORUM", "BUILDING_BASILICA", "BUILDING_TEMPLE_OF_JUPITER"]);
});

test("a whole civics swap moves the civics units and leaves unit cards and main-tree improvements", () => {
  const nepal = "CIVILIZATION_NEPAL";
  const withNepal = new Map([...shipped, [nepal, { rows: [row(nepal, "KIND_TRAIT", "TRAIT_NEPAL_ABILITY"),
    row(nepal, "KIND_UNIT", "UNIT_SHERPA"), row(nepal, "KIND_IMPROVEMENT", "IMPROVEMENT_HIGHLAND_POWER_STATION")] }]]);
  const pieces = [
    { CivilizationType: nepal, PieceId: `CIVCIVC_${GREECE}`, FromCivilization: GREECE, Kind: "civics", SortIndex: 0 },
    { CivilizationType: GREECE, PieceId: `CIVCIVC_${nepal}`, FromCivilization: nepal, Kind: "civics", SortIndex: 0 }
  ];
  const views = civDealViews(pieces, withNepal, unlocks);
  assert.deepEqual(views.get(nepal).uniques.map((u) => u.Type), ["UNIT_SHERPA", "IMPROVEMENT_HIGHLAND_POWER_STATION",
    "UNIT_LOGIOS", "QUARTER_ACROPOLIS", "BUILDING_ODEON", "BUILDING_PARTHENON"]);
  assert.deepEqual(views.get(GREECE).uniques.map((u) => u.Type), ["UNIT_HOPLITE"]);
});

test("a rider unique row from the deal shows on the taker and leaves the giver", () => {
  const nepal = "CIVILIZATION_NEPAL";
  const withNepal = new Map([...shipped, [nepal, { rows: [row(nepal, "KIND_TRAIT", "TRAIT_NEPAL_ABILITY"),
    row(nepal, "KIND_UNIT", "UNIT_SHERPA"), row(nepal, "KIND_IMPROVEMENT", "IMPROVEMENT_HIGHLAND_POWER_STATION")] }]]);
  const take = (id, i) => ({ CivilizationType: ROME, PieceId: id, FromCivilization: nepal, Kind: "unique", SortIndex: i });
  const views = civDealViews([take("CIVUNQ_UNIT_SHERPA", 1), take("CIVUNQ_IMPROVEMENT_HIGHLAND_POWER_STATION", 1)],
    withNepal, unlocks);
  assert.ok(views.get(ROME).uniques.some((u) => u.Type === "IMPROVEMENT_HIGHLAND_POWER_STATION"));
  assert.deepEqual(views.get(nepal).uniques.map((u) => u.Type), []);
});
