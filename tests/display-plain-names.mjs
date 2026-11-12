// The setup screens hold no terrain or resource text, so a start-bias target the shell can't name reads from its
// type: "Starts near: Mountain", never "Starts near: TERRAIN_MOUNTAIN".
import assert from "node:assert/strict";
import test from "node:test";

import { biasLine, plainTypeName } from "../ui/display/lshuf-display-text.js";

test("a type with no loaded name reads as plain words", () => {
  assert.equal(plainTypeName("TERRAIN_MOUNTAIN"), "Mountain");
  assert.equal(plainTypeName("FEATURE_CLASS_VEGETATED"), "Vegetated");
  assert.equal(plainTypeName("RESOURCE_HORSES"), "Horses");
  assert.equal(plainTypeName("BIOME_TROPICAL"), "Tropical");
  assert.equal(plainTypeName("TERRAIN_NAVIGABLE_RIVER"), "Navigable river");
});

test("the bias line falls back to the plain name when the key doesn't compose", () => {
  const lookups = { compose: (key, ...args) => (key === "LOC_LSHUF_BIAS_LINE" ? `Starts near: ${args[0]}` : key) };
  const line = biasLine([{ TableName: "StartBiasTerrains", TargetType: "TERRAIN_MOUNTAIN", Score: 5 }], lookups);
  assert.ok(line.includes("Mountain") && !line.includes("TERRAIN_MOUNTAIN"), line);
});
