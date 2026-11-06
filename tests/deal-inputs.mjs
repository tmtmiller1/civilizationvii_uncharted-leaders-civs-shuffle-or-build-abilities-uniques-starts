// The per-value and per-leader groups (CONTRACTS 9) fill the input tables so they mirror the setup: LShufSeed,
// LShufOptions, LShufKept, LShufOut and LShufModOK read back as dealConfig() of the same setup. Waits on B.
import assert from "node:assert/strict";
import test from "node:test";

import { configFromTables, DEAL_LOAD_ORDER, dealConfig, gameConfig, loadGame, need, normalizeOptions } from "./_harness.mjs";
import { DEALING, KEY, MODE, ONOFF, PERSONA, REVEAL, SEED_MAX, SEED_MIN } from "../shared/lshuf-constants.js";
import { ADDED_LEADER } from "../scripts/fixtures/build-fixtures.mjs";

async function inputs(spec, { config, fixture = "base" } = {}) {
  need("data/generated/modinfo-groups.xml");
  const cfg = config || gameConfig(spec);
  const run = await loadGame({ fixture, config: cfg, requireDeal: false, stopAt: DEAL_LOAD_ORDER });
  try {
    return configFromTables(run.pre);
  } finally {
    run.close();
  }
}

const strip = ({ seedRows: _s, ...rest }) => rest;

test("deal numbers 1..256 each set LShufSeed; anything else leaves it empty", async () => {
  for (const seed of [SEED_MIN, 2, 17, 100, SEED_MAX - 1, SEED_MAX]) {
    const got = await inputs({ seed });
    assert.equal(got.seedRows, 1, `seed ${seed}: one row`);
    assert.equal(got.seed, seed);
  }
  for (const raw of ["0", "257", "017", "abc", "", 17]) {
    const config = { ...gameConfig({}), LShufSeed: raw };
    const got = await inputs(null, { config });
    assert.equal(got.seedRows, 0, `LShufSeed ${JSON.stringify(raw)} matches no seed group`);
  }
});

test("every option value reads back", async () => {
  const values = {
    Mode: Object.values(MODE),
    Biases: Object.values(ONOFF),
    Abilities: Object.values(ONOFF),
    Attributes: Object.values(ONOFF),
    Personality: Object.values(PERSONA),
    Dealing: Object.values(DEALING),
    Reveal: Object.values(REVEAL),
    KeepMine: ["1", "0"],
    ModdedAbilities: ["1", "0"],
    ModdedAttributes: ["1", "0"],
    ModdedBiases: ["1", "0"]
  };
  for (const [name, list] of Object.entries(values)) {
    for (const value of list) {
      const got = await inputs({ seed: 3, options: { [name]: value } });
      assert.deepEqual(got.options, normalizeOptions({ [name]: value }), `${name} = ${value}`);
    }
  }
});

test("keep, left-out, not-in-game and mod-check keys fill their tables", async () => {
  const spec = {
    seed: 5,
    options: { KeepMine: "1", ModdedAbilities: "1" },
    kept: ["LEADER_AMINA", "LEADER_REMILIA"],
    excluded: ["LEADER_XERXES"],
    moddedExcluded: ["LEADER_FLAN"],
    notInGame: ["LEADER_ISABELLA", "LEADER_Bocchi"],
    modOK: ["LEADER_REMILIA", "LEADER_Aya"]
  };
  assert.deepEqual(strip(await inputs(spec)), dealConfig(spec));
  const off = { ...spec, options: { KeepMine: "0" } };
  assert.deepEqual(strip(await inputs(off)), dealConfig(off), "Keep off: no keep rows; no modded box: no ModOK rows");
});

test("list keys match whole entries only, and unknown leaders have no groups", async () => {
  const got = await inputs({ seed: 1, excluded: ["LEADER_XERXES_ALT"], notInGame: ["LEADER_HIMIKO_ALT"] });
  assert.deepEqual(got.out, [
    { LeaderType: "LEADER_HIMIKO_ALT", Reason: "notingame" },
    { LeaderType: "LEADER_XERXES_ALT", Reason: "list" }
  ]);
  const config = {
    ...gameConfig({ seed: 1, options: { KeepMine: "1" } }),
    [KEY.keep(ADDED_LEADER)]: "1",
    LShufExcludedLeaders: [`|${ADDED_LEADER}|`]
  };
  const unknown = await inputs(null, { config, fixture: "added-leader" });
  assert.deepEqual([unknown.kept, unknown.out], [[], []]);
});
