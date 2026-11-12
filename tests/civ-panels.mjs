// The game's own civilization panels in play (CONTRACTS 25): the diplomacy panel files each tradition under the
// base trait of the civilization that holds it now (ui/game/lshuf-civ-panels.js), and the civ build screen says
// whether the builder keeps its own uniques (ui/setup/lshuf-build-cards.js uniquesStayOwn).
import assert from "node:assert/strict";
import test from "node:test";

globalThis.Locale = { compose: (key) => key };
globalThis.Database = { query: () => [] };

const { NOBODY, remapTraditionRows, traditionOwners } = await import("../ui/game/lshuf-civ-panels.js");
const { uniquesStayOwn } = await import("../ui/setup/lshuf-build-cards.js");
const { CU_MODE } = await import("../shared/lshuf-constants.js");

const legacyOf = new Map([["CIVILIZATION_GREECE", "TRAIT_GREECE"], ["CIVILIZATION_ROME", "TRAIT_ROME"]]);
const civs = ["CIVILIZATION_GREECE", "CIVILIZATION_ROME"];
const traditions = [
  { TraditionType: "TRADITION_STRATEGOI", TraitType: "TRAIT_GREECE" },
  { TraditionType: "TRADITION_DEMOCRATIA", TraitType: "TRAIT_GREECE" },
  { TraditionType: "TRADITION_ROMAN_ROADS", TraitType: "TRAIT_ROME" },
  { TraditionType: "TRADITION_POLICY_NONE", TraitType: null },
  { TraditionType: "TRADITION_BABYLON_X", TraitType: "TRAIT_BABYLON" }
];

test("a tradition whose civic moved is filed under its new holder; the giver no longer lists it", () => {
  // Rome took Agoge (Strategoi) under civics Split up; Greece kept Democratia.
  const node = { TRADITION_STRATEGOI: "ROME", TRADITION_DEMOCRATIA: "GREECE", TRADITION_ROMAN_ROADS: "ROME" };
  const judgeOf = new Map(civs.map((civ) => [civ, (row) => (node[row.TraditionType]
    ? `CIVILIZATION_${node[row.TraditionType]}` === civ : null)]));
  const held = new Map([["CIVILIZATION_GREECE", new Set(["TRAIT_GREECE"])], ["CIVILIZATION_ROME", new Set(["TRAIT_ROME"])]]);
  const owners = traditionOwners(traditions, civs, legacyOf, judgeOf, held);
  assert.deepEqual([...owners], [["TRADITION_STRATEGOI", "TRAIT_ROME"]]);
  const rows = remapTraditionRows(traditions.map((t) => ({ ...t, Type: t.TraditionType })), owners);
  const romes = rows.filter((r) => r.TraitType === "TRAIT_ROME").map((r) => r.TraditionType).sort();
  const greeks = rows.filter((r) => r.TraitType === "TRAIT_GREECE").map((r) => r.TraditionType);
  assert.deepEqual(romes, ["TRADITION_ROMAN_ROADS", "TRADITION_STRATEGOI"]);
  assert.deepEqual(greeks, ["TRADITION_DEMOCRATIA"]);
});

test("a whole civics swap files each tree's traditions under the civ holding that base trait", () => {
  const held = new Map([["CIVILIZATION_GREECE", new Set(["TRAIT_ROME"])], ["CIVILIZATION_ROME", new Set(["TRAIT_GREECE"])]]);
  const owners = traditionOwners(traditions, civs, legacyOf, new Map(), held);
  assert.equal(owners.get("TRADITION_STRATEGOI"), "TRAIT_ROME");
  assert.equal(owners.get("TRADITION_ROMAN_ROADS"), "TRAIT_GREECE");
  assert.equal(owners.has("TRADITION_BABYLON_X"), false, "a civ not in the game is left alone");
});

test("a tradition given away to nobody in the game drops out of its civ's panel", () => {
  const held = new Map([["CIVILIZATION_GREECE", new Set()], ["CIVILIZATION_ROME", new Set(["TRAIT_ROME"])]]);
  const owners = traditionOwners(traditions, civs, legacyOf, new Map(), held);
  assert.equal(owners.get("TRADITION_STRATEGOI"), NOBODY);
  assert.equal(owners.has("TRADITION_ROMAN_ROADS"), false);
});

test("rows pass through untouched when nothing moved", () => {
  const rows = [{ TraditionType: "TRADITION_STRATEGOI", TraitType: "TRAIT_GREECE" }];
  assert.equal(remapTraditionRows(rows, new Map()), rows);
  assert.equal(remapTraditionRows(null, new Map([["X", "Y"]])), null);
});

test("a civilization builder keeps its own uniques except under Split up and Off entirely", () => {
  assert.equal(uniquesStayOwn(CU_MODE.Normal), true);
  assert.equal(uniquesStayOwn(CU_MODE.Paired), true);
  assert.equal(uniquesStayOwn(CU_MODE.Shuffled), true);
  assert.equal(uniquesStayOwn(CU_MODE.Split), false);
  assert.equal(uniquesStayOwn(CU_MODE.Off), false);
});
