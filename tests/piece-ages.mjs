// PIECE_AGES (shared/lshuf-constants.js): which age-bound bonuses an AI build skips.
import assert from "node:assert/strict";
import test from "node:test";

import { pieceWorksFrom, pieceWorksIn } from "../shared/lshuf-constants.js";

test("a civ bonus works only in its listed ages; anything unlisted works everywhere", () => {
  assert.equal(pieceWorksIn("CIVILIZATION_ICELAND__B04", "AGE_ANTIQUITY"), false);
  assert.equal(pieceWorksIn("CIVILIZATION_ICELAND__B04", "AGE_EXPLORATION"), true);
  assert.equal(pieceWorksIn("CIVILIZATION_SPAIN__B01", "AGE_MODERN"), true);
});

test("Yi Sun-sin's Antiquity Fleet Commanders work in an Antiquity start, not a later one", () => {
  assert.equal(pieceWorksFrom("LEADER_YI_SUN_SIN__B01", "AGE_ANTIQUITY"), true);
  assert.equal(pieceWorksFrom("LEADER_YI_SUN_SIN__B01", "AGE_EXPLORATION"), false);
  assert.equal(pieceWorksFrom("LEADER_AMINA__B01", "AGE_MODERN"), true);
});
