// planRandomSlots and planPoolSlots from ui/setup/lshuf-setup-config.js: which leader each Random or pool slot gets
// before the keys are written.
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

test("after pools and Random picks every slot names a leader, so the not-in-game list fills", async () => {
  const { planPoolSlots, planRandomSlots, slotsAfterPools, notInGame, PLAIN_RANDOM } = await load();
  const raw = [
    { id: 0, human: true, leader: "LEADER_AMINA" },
    { id: 1, human: false, leader: "LSHUF_RANDOM_POOL_1" },
    { id: 2, human: false, leader: PLAIN_RANDOM }
  ];
  const afterPools = slotsAfterPools(raw, planPoolSlots(raw, { 1: ["LEADER_ASHOKA"], 2: [] }, 7));
  assert.equal(afterPools[1].leader, "LEADER_ASHOKA");
  assert.deepEqual(notInGame(afterPools), [], "a Random slot still open keeps the list empty");
  const slots = slotsAfterPools(afterPools, planRandomSlots(afterPools, () => CHOICES, first));
  assert.equal(slots[2].leader, "LEADER_AUGUSTUS");
  const out = notInGame(slots);
  assert.ok(out.length > 0);
  for (const l of ["LEADER_AMINA", "LEADER_ASHOKA", "LEADER_AUGUSTUS"]) assert.ok(!out.includes(l), l);
});
