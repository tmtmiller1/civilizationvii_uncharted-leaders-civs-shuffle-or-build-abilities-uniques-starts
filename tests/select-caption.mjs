// The leader screen's own Select reads Continue once the host has built a leader (shared/lshuf-constants.js,
// hasLeaderBuild, used by ui/setup/lshuf-build-entry.js): any leader piece in the picks counts, civilization pieces
// alone don't.
import assert from "node:assert/strict";
import test from "node:test";

const { hasLeaderBuild } = await import("../shared/lshuf-constants.js");

test("no picks, or civilization pieces only, keep Select", () => {
  assert.equal(hasLeaderBuild([]), false);
  assert.equal(hasLeaderBuild(["CIVABIL_ROME", "CIVUNQ_UNIT_LEGION", "CIVBIAS_GREECE_1", "CIVILIZATION_ROME__B01"]), false);
});

test("any leader piece makes it Continue", () => {
  assert.equal(hasLeaderBuild(["LEADER_AUGUSTUS__B01"]), true);
  assert.equal(hasLeaderBuild(["CIVABIL_ROME", "LEADER_AUGUSTUS__WHOLE"]), true);
  assert.equal(hasLeaderBuild(["ATTR2_CULTURAL"]), true);
  assert.equal(hasLeaderBuild(["PERSONA_AUGUSTUS"]), true);
  assert.equal(hasLeaderBuild(["BIAS_AUGUSTUS_1"]), true);
});
