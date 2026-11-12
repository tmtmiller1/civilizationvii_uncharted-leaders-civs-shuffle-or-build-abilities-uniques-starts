// The civilization mode (CONTRACTS 32): a preset over Civilization abilities, uniques and civics, worded like the
// leader mode. Swap whole moves a civilization's ability, uniques and civics together; Swap partial swaps each as a
// whole set with a different civilization; Mix bonuses splits all three; any other mix reads Custom.
import assert from "node:assert/strict";
import test from "node:test";

import { CA_MODE, CC_MODE, CIV_MODE_CUSTOM, CIV_PRESETS, CU_MODE, civPresetOf } from "../shared/lshuf-constants.js";

test("each civilization mode sets the three rows, and reading them back gives the mode", () => {
  assert.deepEqual(CIV_PRESETS.LSHUF_CM_WHOLE, [CA_MODE.Swapped, CU_MODE.Paired, CC_MODE.Paired]);
  assert.deepEqual(CIV_PRESETS.LSHUF_CM_PARTIAL, [CA_MODE.Swapped, CU_MODE.Shuffled, CC_MODE.Shuffled]);
  assert.deepEqual(CIV_PRESETS.LSHUF_CM_SPLIT, [CA_MODE.Split, CU_MODE.Split, CC_MODE.Split]);
  for (const [mode, rows] of Object.entries(CIV_PRESETS)) assert.equal(civPresetOf(...rows), mode);
});

test("a hand-set mix reads Custom", () => {
  assert.equal(civPresetOf(CA_MODE.Swapped, CU_MODE.Split, CC_MODE.Normal), CIV_MODE_CUSTOM);
  assert.equal(civPresetOf(CA_MODE.Off, CU_MODE.Off, CC_MODE.Off), CIV_MODE_CUSTOM);
});
