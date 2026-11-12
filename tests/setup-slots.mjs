// planRandomSlots from ui/setup/lshuf-setup-config.js: which leader each Random slot gets before the keys are
// written, and the Leader pool that narrows the draw.
import assert from "node:assert/strict";
import test from "node:test";

import { importShipped } from "./_harness.mjs";

const load = () => importShipped("ui/setup/lshuf-setup-config.js");

const CHOICES = ["LEADER_AMINA", "LEADER_ASHOKA", "LEADER_AUGUSTUS", "LEADER_CONFUCIUS"];
const first = () => 0;

test("plain Random slots each get a leader nobody else has", async () => {
  const { planRandomSlots, PLAIN_RANDOM } = await load();
  const slots = [
    { id: 0, human: true, leader: "LEADER_AMINA" },
    { id: 2, human: false, leader: PLAIN_RANDOM },
    { id: 1, human: false, leader: PLAIN_RANDOM }
  ];
  const plan = planRandomSlots(slots, () => CHOICES, first);
  assert.deepEqual([...plan], [
    [1, "LEADER_ASHOKA"],
    [2, "LEADER_AUGUSTUS"]
  ], "id order, Amina skipped, no repeats");
});

test("a slot runs out of leaders and stays Random", async () => {
  const { planRandomSlots, PLAIN_RANDOM } = await load();
  const slots = [
    { id: 0, human: false, leader: PLAIN_RANDOM },
    { id: 1, human: false, leader: PLAIN_RANDOM }
  ];
  const plan = planRandomSlots(slots, () => ["LEADER_AMINA"], first);
  assert.deepEqual([...plan], [[0, "LEADER_AMINA"]]);
});

test("a slot the host may not pick for is left to the engine", async () => {
  const { planRandomSlots, PLAIN_RANDOM } = await load();
  const slots = [
    { id: 0, human: true, leader: PLAIN_RANDOM },
    { id: 1, human: false, leader: PLAIN_RANDOM }
  ];
  const plan = planRandomSlots(slots, () => CHOICES, first, (s) => !s.human);
  assert.deepEqual([...plan], [[1, "LEADER_AMINA"]]);
});

test("each slot uses its own list, and an out-of-range index is clamped", async () => {
  const { planRandomSlots, PLAIN_RANDOM } = await load();
  const slots = [
    { id: 0, human: false, leader: PLAIN_RANDOM },
    { id: 1, human: false, leader: PLAIN_RANDOM }
  ];
  const lists = { 0: ["LEADER_AMINA"], 1: ["LEADER_AMINA", "LEADER_CONFUCIUS"] };
  const plan = planRandomSlots(slots, (id) => lists[id], (n) => n + 5);
  assert.deepEqual([...plan], [
    [0, "LEADER_AMINA"],
    [1, "LEADER_CONFUCIUS"]
  ]);
});

test("Random slots only draw leaders ticked in the Leader pool", async () => {
  const { planRandomSlots, PLAIN_RANDOM } = await load();
  const slots = [
    { id: 0, human: true, leader: "LEADER_AMINA" },
    { id: 1, human: false, leader: PLAIN_RANDOM },
    { id: 2, human: false, leader: PLAIN_RANDOM },
    { id: 3, human: false, leader: PLAIN_RANDOM }
  ];
  const off = new Set(["LEADER_ASHOKA", "LEADER_AMINA"]);
  const plan = planRandomSlots(slots, () => CHOICES, first, () => true, off);
  assert.deepEqual([...plan], [
    [1, "LEADER_AUGUSTUS"],
    [2, "LEADER_CONFUCIUS"]
  ], "Ashoka is unticked, Amina is taken, and slot 3 has nobody left so it stays Random");
});

test("a leader picked by hand stays, ticked in the pool or not", async () => {
  const { planRandomSlots, PLAIN_RANDOM } = await load();
  const slots = [
    { id: 0, human: true, leader: "LEADER_ASHOKA" },
    { id: 1, human: false, leader: PLAIN_RANDOM }
  ];
  const plan = planRandomSlots(slots, () => CHOICES, first, () => true, new Set(["LEADER_ASHOKA"]));
  assert.deepEqual([...plan], [[1, "LEADER_AMINA"]], "only the Random slot is planned");
});

test("after the Random picks every slot names a leader, so the not-in-game list fills", async () => {
  const { planRandomSlots, slotsAfterPools, notInGame, PLAIN_RANDOM } = await load();
  const raw = [
    { id: 0, human: true, leader: "LEADER_AMINA" },
    { id: 1, human: false, leader: PLAIN_RANDOM },
    { id: 2, human: false, leader: PLAIN_RANDOM }
  ];
  assert.deepEqual(notInGame(raw), [], "a Random slot still open keeps the list empty");
  const slots = slotsAfterPools(raw, planRandomSlots(raw, () => CHOICES, first));
  assert.equal(slots[2].leader, "LEADER_AUGUSTUS");
  const out = notInGame(slots);
  assert.ok(out.length > 0);
  for (const l of ["LEADER_AMINA", "LEADER_ASHOKA", "LEADER_AUGUSTUS"]) assert.ok(!out.includes(l), l);
});

const CIVS = ["CIVILIZATION_AKSUM", "CIVILIZATION_EGYPT", "CIVILIZATION_GREECE", "CIVILIZATION_HAN"];

test("Random civilization slots skip taken and switched-off civs", async () => {
  const { planRandomCivSlots, PLAIN_RANDOM } = await load();
  const slots = [
    { id: 0, human: true, leader: "LEADER_AMINA", civ: "CIVILIZATION_AKSUM" },
    { id: 1, human: false, leader: "LEADER_ASHOKA", civ: PLAIN_RANDOM },
    { id: 2, human: false, leader: "LEADER_AUGUSTUS", civ: PLAIN_RANDOM }
  ];
  const plan = planRandomCivSlots(slots, () => CIVS, new Set(["CIVILIZATION_EGYPT"]), first);
  assert.deepEqual([...plan], [
    [1, "CIVILIZATION_GREECE"],
    [2, "CIVILIZATION_HAN"]
  ], "Aksum is taken, Egypt is off");
});

test("a civ picked by hand stays, even when it's switched off", async () => {
  const { planRandomCivSlots } = await load();
  const slots = [{ id: 0, human: false, leader: "LEADER_AMINA", civ: "CIVILIZATION_EGYPT" }];
  const plan = planRandomCivSlots(slots, () => CIVS, new Set(["CIVILIZATION_EGYPT"]), first);
  assert.deepEqual([...plan], []);
});

test("a remote human's Random civ is left to the engine, and a slot with nothing allowed stays Random", async () => {
  const { planRandomCivSlots, PLAIN_RANDOM } = await load();
  const slots = [
    { id: 0, human: true, leader: "LEADER_AMINA", civ: PLAIN_RANDOM },
    { id: 1, human: false, leader: "LEADER_ASHOKA", civ: PLAIN_RANDOM },
    { id: 2, human: false, leader: "LEADER_AUGUSTUS", civ: PLAIN_RANDOM }
  ];
  const off = new Set(["CIVILIZATION_AKSUM", "CIVILIZATION_EGYPT", "CIVILIZATION_GREECE"]);
  const plan = planRandomCivSlots(slots, () => CIVS, off, first, (s) => !s.human);
  assert.deepEqual([...plan], [[1, "CIVILIZATION_HAN"]], "slot 0 left to the engine, slot 2 has nothing left");
});

test("a slot with no civ field counts as Random", async () => {
  const { planRandomCivSlots } = await load();
  const plan = planRandomCivSlots([{ id: 3, human: false, leader: "LEADER_AMINA" }], () => CIVS, new Set(), first);
  assert.deepEqual([...plan], [[3, "CIVILIZATION_AKSUM"]]);
});

test("Random civilizations come from the starting age only under Apex Only, the game's other setting",
  async () => {
    const { inAge, randomCivAges } = await load();
    assert.equal(randomCivAges("GAME_START_CIV_SELECTION_MODE_APEX"), true);
    assert.equal(randomCivAges("GAME_START_CIV_SELECTION_MODE_ANACHRONISTIC"), false, "Time-Tested Allowed: every age");
    assert.equal(randomCivAges(null), false, "the game's default is Time-Tested Allowed");
    const all = ["CIVILIZATION_ROME", "CIVILIZATION_MEIJI", "CIVILIZATION_PRUSSIA", "CIVILIZATION_EGYPT"];
    const antiquity = new Set(["CIVILIZATION_ROME", "CIVILIZATION_EGYPT", "CIVILIZATION_AKSUM"]);
    assert.deepEqual(inAge(all, antiquity), ["CIVILIZATION_ROME", "CIVILIZATION_EGYPT"]);
    assert.deepEqual(inAge(all, null), all);
  });
