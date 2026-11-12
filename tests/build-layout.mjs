// The build screens' layout rule (ui/setup/lshuf-build-layout.js): bundles draw in as many slots as they take
// (CONTRACTS 23).
import assert from "node:assert/strict";
import test from "node:test";

import { slotLayout } from "../ui/setup/lshuf-build-layout.js";

test("a bundle draws its lead and a linked slot per rider, then the free slots", () => {
  const agoge = { id: "AGOGE", riders: ["Ekklesia"] };
  const other = { id: "ARETE", riders: [] };
  const cells = slotLayout([agoge, other], 4, (p) => p.riders);
  assert.deepEqual(cells.map((c) => (c ? `${c.pick.id}${c.rider ? `+${c.rider}` : ""}` : "empty")),
    ["AGOGE", "AGOGE+Ekklesia", "ARETE", "empty"]);
});

test("no picks gives n empty slots; an oversized bundle still draws whole", () => {
  assert.deepEqual(slotLayout([], 3, () => []), [null, null, null]);
  const big = { id: "SEOWON", riders: ["Ihak", "Seonbi"] };
  assert.equal(slotLayout([big], 2, (p) => p.riders).length, 3);
});

// --- the build window's pages and the pool badge (CONTRACTS 28) ---

const pages = await import("../ui/setup/lshuf-build-layout.js");

test("two pages in link-row order, each with its own title; nothing for the AI", () => {
  assert.deepEqual(pages.BUILD_PAGES.map((p) => p.scope), ["leader", "civ"]);
  assert.equal(pages.pageOf("civ").title, "LOC_LSHUF_BUILD_CIV_TITLE");
  assert.equal(pages.pageOf("ai"), pages.BUILD_PAGES[0]);
});

test("a pool badge reads Pool until something is unticked, then how many are still on", () => {
  assert.equal(pages.poolBadge(38, 0, "Pool"), "Pool");
  assert.equal(pages.poolBadge(38, 31, "Pool"), "7/38");
  assert.equal(pages.poolBadge(0, 0, "Pool"), "Pool");
  assert.equal(pages.poolBadge(50, 60, "Pool"), "0/50");
});

test("your own picker has no Random and reads Select until a pick is made", () => {
  const choices = [{ value: "LEADER_B", label: "Beta" }, { value: "LEADER_A", label: "Alpha" }];
  const none = pages.pickerItems(choices, "RANDOM", { selectLabel: "Select" });
  assert.deepEqual(none.items.map((i) => i.value), ["", "LEADER_A", "LEADER_B"]);
  assert.equal(none.items[0].label, "Select");
  assert.equal(none.selected, 0);
  const picked = pages.pickerItems(choices, "LEADER_B", { selectLabel: "Select" });
  assert.deepEqual(picked.items.map((i) => i.value), ["LEADER_A", "LEADER_B"]);
  assert.equal(picked.selected, 1);
});

test("an AI player's picker starts with Random, a pick of its own", () => {
  const choices = [{ value: "LEADER_B", label: "Beta" }, { value: "LEADER_A", label: "Alpha" }];
  const onRandom = pages.pickerItems(choices, "RANDOM", { allowRandom: true, randomLabel: "Random" });
  assert.deepEqual(onRandom.items, [
    { value: "RANDOM", label: "Random" }, { value: "LEADER_A", label: "Alpha" }, { value: "LEADER_B", label: "Beta" }
  ]);
  assert.equal(onRandom.selected, 0);
  assert.equal(pages.pickerItems(choices, "LEADER_B", { allowRandom: true, randomLabel: "Random" }).selected, 2);
  assert.equal(pages.pickerItems(choices, "LEADER_GONE", { allowRandom: true }).selected, 0, "an unknown pick shows Random");
});

test("AI rows are the non-human slots in player order, numbered from 1, for any game size", () => {
  const slots = [
    { id: 5, human: false, leader: "RANDOM", civ: "RANDOM" },
    { id: 0, human: true, leader: "LEADER_AMINA", civ: "CIVILIZATION_ROME" },
    { id: 2, human: false, leader: "LEADER_ASHOKA", civ: "RANDOM" }
  ];
  assert.deepEqual(pages.aiRows(slots, 0), [
    { id: 2, n: 1, leader: "LEADER_ASHOKA", civ: "RANDOM" },
    { id: 5, n: 2, leader: "RANDOM", civ: "RANDOM" }
  ]);
  const big = Array.from({ length: 12 }, (_, id) => ({ id, human: id === 0, leader: "RANDOM", civ: "RANDOM" }));
  assert.deepEqual(pages.aiRows(big, 0).map((r) => r.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.deepEqual(pages.aiRows([{ id: 1, human: false, leader: "RANDOM", civ: "RANDOM" }], 1), [], "the local seat is never an AI row");
});

test("the cards follow the settings: Split up shows single pieces, anything else whole cards", async () => {
  const { cardsShown } = await import("../ui/setup/lshuf-build-layout.js");
  const values = { leaderWhole: "A_WHOLE", civAbilitySplit: "CA_SPLIT", civCivicsSplit: "CC_SPLIT" };
  assert.deepEqual(cardsShown("civ", { CivAbilities: "CA_SPLIT", CivCivics: "CC_NORMAL" }, values), { wholeAbility: false, wholeCivics: true });
  assert.deepEqual(cardsShown("civ", { CivAbilities: "CA_SWAPPED", CivCivics: "CC_SPLIT" }, values), { wholeAbility: true, wholeCivics: false });
  assert.deepEqual(cardsShown("leader", { Abilities: "A_WHOLE" }, values), { wholeAbility: true, wholeCivics: false });
  assert.deepEqual(cardsShown("leader", { Abilities: "A_SPLIT" }, values), { wholeAbility: false, wholeCivics: false });
  assert.deepEqual(cardsShown("leader", { Abilities: "A_NORMAL" }, values), { wholeAbility: false, wholeCivics: false });
});
