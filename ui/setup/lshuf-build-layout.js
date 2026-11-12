// Pure layout rules for the build screens: how picks fill a slot group when a card brings riders along (CONTRACTS 23).
// No game globals here, so the tests can run it.
// What each slot of a group shows, left to right, for `n` slots: a pick, then one linked slot per rider it brings
// ({ pick, rider: name }), then empty slots (null) up to n. A bundle that no longer fits still draws whole, so the
// row never hides a pick.
export function slotLayout(picks, n, ridersOf) {
  const out = [];
  for (const pick of picks) {
    out.push({ pick, rider: null });
    for (const name of ridersOf(pick)) out.push({ pick, rider: name });
  }
  while (out.length < n) out.push(null);
  return out;
}

// --- the build window's pages (CONTRACTS 28) ---

// The link row across the top of the build window, in order: your leader, your civilization.
export const BUILD_PAGES = [
  { scope: "leader", key: "LOC_LSHUF_BUILD_PAGE_ME_LEADER", title: "LOC_LSHUF_BUILD_TITLE" },
  { scope: "civ", key: "LOC_LSHUF_BUILD_PAGE_ME_CIV", title: "LOC_LSHUF_BUILD_CIV_TITLE" }
];

export const pageOf = (scope) => BUILD_PAGES.find((p) => p.scope === scope) || BUILD_PAGES[0];

// A pool icon's badge: the word for "Pool" while everything is ticked, "on/total" once something is unticked.
export function poolBadge(total, off, word) {
  return off > 0 && total > 0 ? `${Math.max(0, total - off)}/${total}` : word;
}

// --- pickers and the AI players window (CONTRACTS 28) ---

// A leader or civilization dropdown's items and the index of the current pick. choices: [{ value, label }], the
// slot's valid picks with Random left out. With allowRandom, Random heads the list as a pick of its own (the AI
// players window); without it there's no Random, and until a pick is made a "Select" entry with an empty value heads
// the list (your own build pages, where a Random slot can't be built).
export function pickerItems(choices, current, opts = {}) {
  const sorted = [...choices].sort((a, b) => String(a.label).localeCompare(String(b.label)));
  if (opts.allowRandom) {
    const items = [{ value: opts.randomValue || "RANDOM", label: opts.randomLabel || "" }, ...sorted];
    return { items, selected: Math.max(0, items.findIndex((i) => i.value === current)) };
  }
  const at = sorted.findIndex((i) => i.value === current);
  if (at < 0) return { items: [{ value: "", label: opts.selectLabel || "" }, ...sorted], selected: 0 };
  return { items: sorted, selected: at };
}

// The AI players in the game, in player order, numbered from 1 whatever their player ids:
// [{ id, n, leader, civ }] from slots [{ id, human, leader, civ }]. localId is left out with the humans.
export function aiRows(slots, localId) {
  return [...slots]
    .filter((s) => !s.human && s.id !== localId)
    .sort((a, b) => a.id - b.id)
    .map((s, i) => ({ id: s.id, n: i + 1, leader: s.leader, civ: s.civ }));
}

// Which cards a page shows follows the settings, with no switch of its own (owner, 2026-11-10): a part set to
// Split up shows its single pieces, anything else its whole cards. `values` holds the three setting values that
// mean "whole" or "split": { leaderWhole, civAbilitySplit, civCivicsSplit }.
export function cardsShown(scope, options, values) {
  if (scope === "civ") {
    return {
      wholeAbility: options.CivAbilities !== values.civAbilitySplit,
      wholeCivics: options.CivCivics !== values.civCivicsSplit
    };
  }
  return { wholeAbility: options.Abilities === values.leaderWhole, wholeCivics: false };
}
