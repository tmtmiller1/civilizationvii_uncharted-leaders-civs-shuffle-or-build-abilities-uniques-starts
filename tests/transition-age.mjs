// The build screens at an age transition (ui/setup/lshuf-setup-params.js): the builds are for the age after the one
// being played, as the game's own civ select picks it, and only the build values can change mid-game.
import assert from "node:assert/strict";
import test from "node:test";

const AGES = ["AGE_ANTIQUITY", "AGE_EXPLORATION", "AGE_MODERN"];

function withGame(age, config = {}) {
  const writes = [];
  globalThis.UI = { isInGame: () => true };
  globalThis.Game = { age };
  globalThis.GameInfo = { Ages: { lookup: (a) => ({ AgeType: a }) } };
  globalThis.GameSetup = {
    findGameParameter: (id) => (id === "Age"
      ? { value: { value: "AGE_ANTIQUITY" }, domain: { possibleValues: AGES.map((v, i) => ({ value: v, sortIndex: i })) } }
      : { value: { value: "from setup" } }),
    setGameParameterValue: () => 8
  };
  globalThis.Configuration = {
    getGame: () => ({ getValue: (k) => (k in config ? config[k] : null) }),
    editGame: () => ({ setValue: (k, v) => { config[k] = v; writes.push(k); } })
  };
  globalThis.window = { dispatchEvent: () => true };
  globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
  return writes;
}

const params = await import("../ui/setup/lshuf-setup-params.js");

test("the age after this one, the last age staying itself", () => {
  assert.equal(params.nextAge("AGE_ANTIQUITY", AGES), "AGE_EXPLORATION");
  assert.equal(params.nextAge("AGE_EXPLORATION", AGES), "AGE_MODERN");
  assert.equal(params.nextAge("AGE_MODERN", AGES), "AGE_MODERN");
});

test("in a game the builds are for the next age, whatever the Age row still says", () => {
  withGame("AGE_ANTIQUITY");
  assert.equal(params.startAge(), "AGE_EXPLORATION");
  withGame("AGE_EXPLORATION");
  assert.equal(params.startAge(), "AGE_MODERN");
});

test("in a game the build picks are read and written through the game configuration", () => {
  const config = { LShufBuildPicks: "|A|B|" };
  const writes = withGame("AGE_ANTIQUITY", config);
  assert.equal(params.paramValue("LShufBuildPicks"), "|A|B|");
  assert.equal(params.setParam("LShufBuildPicks", "|A|"), 0);
  assert.equal(params.paramValue("LShufBuildPicks"), "|A|");
  assert.deepEqual(writes, ["LShufBuildPicks"]);
});

test("in a game an emptied pick list stays empty instead of falling back to the setup's picks", () => {
  const config = { LShufBuildPicks: "|A|" };
  withGame("AGE_ANTIQUITY", config);
  params.setParam("LShufBuildPicks", "");
  const raw = params.paramValue("LShufBuildPicks");
  assert.notEqual(raw, "from setup");
  assert.deepEqual(raw.split("|").filter(Boolean), []);
});

test("in a game the settings stay as the game started", () => {
  const writes = withGame("AGE_ANTIQUITY");
  assert.equal(params.setParam("LShufBiases", "LSHUF_B_ROLLED"), -1);
  assert.equal(params.paramReadOnly("LShufBiases"), true);
  assert.equal(params.paramReadOnly("LShufBuildPicks2"), false);
  assert.equal(params.paramValue("LShufBiases"), "from setup");
  assert.deepEqual(writes, []);
});
