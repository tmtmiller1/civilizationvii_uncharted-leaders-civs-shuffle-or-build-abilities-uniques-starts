// The pieces of the Build your own leader screen: the slot row, the toolbar and the card grid. Each takes the window
// (for its cards, counts, filters and handlers) and returns an element built from the game's own controls and art.

import { BUILD_KIND, buildKindOf } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";
import { el } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-controls.js";
import {
  attributeIdsOf, cantTake, cardFor, compose, isWholeCard, slotOfKind
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-cards.js";
import { CARD_ATTR, TOOLTIP_STYLE } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-tooltip.js";
import { slotLayout } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-layout.js";
import {
  attributeIcon, SLOT_BASE, TAG_EQUIPPED
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-art.js";

const SLOT_GROUPS = [
  ["ability", "LOC_LSHUF_BUILD_SLOTS_ABILITY"],
  ["attributes", "LOC_LSHUF_BUILD_SLOTS_ATTRIBUTES"],
  ["behavior", "LOC_LSHUF_BUILD_SLOT_BEHAVIOR"],
  ["terrain", "LOC_LSHUF_BUILD_SLOT_TERRAIN"],
  ["civAbility", "LOC_LSHUF_BUILD_SLOT_CIV_ABILITY"],
  ["civUniques", "LOC_LSHUF_BUILD_SLOTS_CIV_UNIQUES"],
  ["civCivics", "LOC_LSHUF_BUILD_SLOT_CIV_CIVICS"],
  ["civTerrain", "LOC_LSHUF_BUILD_SLOT_CIV_TERRAIN"]
];

// The kind dropdown's entries. A whole card and its single pieces (a leader ability and its bonuses, a civilization
// ability and its bonuses, a civics tree and its civics) are one entry, since the Whole toggle already decides which
// of the two the grid shows; with separate entries one choice always emptied the grid (watched 2026-11-08).
const KINDS = [
  BUILD_KIND.Whole, BUILD_KIND.Attribute, BUILD_KIND.Persona, BUILD_KIND.Bias,
  BUILD_KIND.CivAbility, BUILD_KIND.CivUnique, BUILD_KIND.CivCivics, BUILD_KIND.CivBias
];
const SINGLE_OF = {
  [BUILD_KIND.Whole]: BUILD_KIND.Bullet,
  [BUILD_KIND.CivAbility]: BUILD_KIND.CivBullet,
  [BUILD_KIND.CivCivics]: BUILD_KIND.CivCivic
};
const kindMatches = (card, kind) => !kind || card.kind === kind || card.kind === SINGLE_OF[kind];
const CIVICS_KINDS = [BUILD_KIND.CivCivic, BUILD_KIND.CivCivics];
const DETAILS_DWELL_MS = 160;
const kindKey = (kind) => `LOC_LSHUF_BUILD_KIND_${kind.toUpperCase()}`;

// The game's rollover glow, shown while the mouse is over the parent (.group).
const MOD_ID = "re-dealable-leader-abilities-attributes-and-start-biases";

const highlight = () => el("div", "img-rollover-highlight absolute inset-0 opacity-0 group-hover\\:opacity-100 pointer-events-none");

// --- card art ---

// The art layers of a card or a filled slot.
// A generic start terrain card: a picture of the terrain (ui/img/terrain/<family>.png, drawn by
// scripts/art/build-terrain-art.py; the game has no art of its own for a terrain) over the terrain's colours.
function terrainArt(card) {
  const family = String(card.family || "").toLowerCase();
  const tile = el("div", `lshuf-build__terrain lshuf-build__terrain--${family}`);
  const picture = el("div", "lshuf-build__terrain-picture");
  picture.style.backgroundImage = `url("fs://game/${MOD_ID}/ui/img/terrain/${family}.png")`;
  tile.appendChild(picture);
  return tile;
}

function artOf(card) {
  const art = el("div", "lshuf-build__art absolute inset-0");
  const civKinds = [
    BUILD_KIND.CivBias, BUILD_KIND.CivAbility, BUILD_KIND.CivBullet, BUILD_KIND.CivUnique, BUILD_KIND.CivCivic,
    BUILD_KIND.CivCivics
  ];
  if (card.generic) {
    art.appendChild(terrainArt(card));
  } else if (civKinds.includes(card.kind)) {
    // The civ card's background; the civ's symbol, or for a unique its own icon over the background.
    art.style.backgroundImage = card.background;
    const sym = el("div", card.kind === BUILD_KIND.CivUnique && card.icon ? "lshuf-build__big-icon" : "lshuf-build__symbol");
    sym.style.backgroundImage = card.kind === BUILD_KIND.CivUnique && card.icon ? card.icon : card.symbol;
    art.appendChild(sym);
  } else if (card.kind === BUILD_KIND.Attribute) {
    art.classList.add("lshuf-build__art--attribute");
    const icon = el("div", "lshuf-build__big-icon");
    icon.style.backgroundImage = card.icon;
    art.appendChild(icon);
  } else {
    art.style.backgroundImage = card.portrait;
    art.classList.add("lshuf-build__art--portrait");
  }
  return art;
}

function pips(tags) {
  const row = el("div", "lshuf-build__pips flex flex-row justify-center");
  for (const tag of tags || []) {
    const pip = el("div", "lshuf-build__pip");
    pip.style.backgroundImage = attributeIcon(tag);
    row.appendChild(pip);
  }
  return row;
}

// --- slots ---

// What a slot group holds, for its heading's and its empty slots' tooltip. The civ Ability and Uniques groups add
// what taking one does under the current Civilization uniques setting (lshuf-build-cards.js uniquesStayOwn).
const GROUP_TIPS = {
  ability: "LOC_LSHUF_BUILD_GROUP_TIP_ABILITY",
  attributes: "LOC_LSHUF_BUILD_GROUP_TIP_ATTRIBUTES",
  behavior: "LOC_LSHUF_BUILD_GROUP_TIP_BEHAVIOR",
  terrain: "LOC_LSHUF_BUILD_GROUP_TIP_TERRAIN",
  civAbility: "LOC_LSHUF_BUILD_GROUP_TIP_CIV_ABILITY",
  civUniques: "LOC_LSHUF_BUILD_GROUP_TIP_CIV_UNIQUES",
  civCivics: "LOC_LSHUF_BUILD_GROUP_TIP_CIV_CIVICS",
  civTerrain: "LOC_LSHUF_BUILD_GROUP_TIP_CIV_TERRAIN"
};
function groupTip(win, group) {
  const tip = compose(GROUP_TIPS[group]);
  if (group === "civAbility") return `${tip} ${compose("LOC_LSHUF_BUILD_CIV_SWAP_NOTE")}`;
  if (group === "civUniques") {
    return `${tip} ${compose(win.uniquesAdd ? "LOC_LSHUF_BUILD_CIV_UNIQUES_ADD_NOTE" : "LOC_LSHUF_BUILD_CIV_UNIQUES_SPLIT_NOTE")}`;
  }
  return tip;
}

// A slot a bundle's rider takes (CONTRACTS 23): the lead card's art, dimmed, named for the rider; a click puts the
// whole bundle back.
function riderBox(win, card, rider, slotId) {
  const slot = el("div", "lshuf-build__slot lshuf-build__slot--filled lshuf-build__slot--rider relative group");
  slot.style.backgroundImage = SLOT_BASE;
  const name = el("div", "lshuf-build__slot-name font-body text-xs uppercase");
  name.textContent = rider;
  slot.append(artOf(card), name, highlight());
  slot.setAttribute("data-tooltip-content", compose("LOC_LSHUF_BUILD_SLOT_RIDER", rider, card.name));
  slot.addEventListener("click", () => win.drop(slotId));
  slot.addEventListener("mouseenter", () => win.showDetails(card));
  return slot;
}

function slotBox(win, card, groupKey, slotId = null) {
  const slot = el("div", "lshuf-build__slot relative group");
  slot.style.backgroundImage = SLOT_BASE;
  if (card) {
    slot.classList.add("lshuf-build__slot--filled");
    slot.appendChild(artOf(card));
    const tag = el("div", "lshuf-build__equipped");
    tag.style.backgroundImage = TAG_EQUIPPED;
    const name = el("div", "lshuf-build__slot-name font-body text-xs uppercase");
    name.textContent = card.name;
    slot.append(tag, name);
    slot.setAttribute("data-tooltip-style", TOOLTIP_STYLE);
    slot.setAttribute(CARD_ATTR, card.id);
    slot.addEventListener("click", () => win.drop(slotId || card.id));
    slot.addEventListener("mouseenter", () => win.showDetails(card));
  } else {
    slot.setAttribute("data-tooltip-content", groupKey);
    const empty = el("div", "lshuf-build__slot-name font-body text-xs uppercase lshuf-build__slot-name--empty");
    empty.textContent = compose("LOC_LSHUF_BUILD_SLOT_EMPTY");
    slot.appendChild(empty);
  }
  slot.appendChild(highlight());
  return slot;
}

// The builder civ's own uniques, shown as kept when the game keeps them beside what it takes (lshuf-build-cards.js
// uniquesStayOwn): not slots, nothing to click.
function keptUniques(win) {
  const own = [...win.byId.values()].filter((c) => c.kind === BUILD_KIND.CivUnique && c.own);
  if (!own.length) return null;
  const box = el("div", "lshuf-build__slot-group flex flex-col items-center mr-4");
  const label = el("div", "font-title text-xs uppercase text-accent-2 mb-1");
  label.textContent = compose("LOC_LSHUF_BUILD_SLOTS_CIV_UNIQUES_KEPT");
  label.setAttribute("data-tooltip-content", compose("LOC_LSHUF_BUILD_SLOTS_CIV_UNIQUES_KEPT_TIP"));
  const slots = el("div", "flex flex-row");
  for (const card of own) {
    const slot = el("div", "lshuf-build__slot lshuf-build__slot--filled lshuf-build__slot--kept relative");
    slot.style.backgroundImage = SLOT_BASE;
    const name = el("div", "lshuf-build__slot-name font-body text-xs uppercase");
    name.textContent = card.name;
    slot.append(artOf(card), name);
    slot.setAttribute("data-tooltip-content", compose("LOC_LSHUF_BUILD_SLOTS_CIV_UNIQUES_KEPT_TIP"));
    slot.addEventListener("mouseenter", () => win.showDetails(card));
    slots.appendChild(slot);
  }
  box.append(label, slots);
  return box;
}

export function renderSlots(win, picks) {
  const row = el("div", "flex flex-row flex-wrap items-start");
  const picked = picks.map((id) => ({ id, card: cardFor(win.byId, id) })).filter((p) => p.card);
  for (const [group, baseKey] of SLOT_GROUPS) {
    const n = win.counts[group];
    if (!n) continue;
    let key = baseKey;
    if (group === "civUniques" && win.uniquesAdd) {
      key = "LOC_LSHUF_BUILD_SLOTS_CIV_UNIQUES_ADD";
      const kept = keptUniques(win);
      if (kept) row.appendChild(kept);
    }
    const box = el("div", "lshuf-build__slot-group flex flex-col items-center mr-4");
    const label = el("div", "font-title text-xs uppercase text-accent-2 mb-1");
    label.textContent = compose(key);
    const tip = groupTip(win, group);
    label.setAttribute("data-tooltip-content", tip);
    const slots = el("div", "flex flex-row");
    const here = picked.filter((p) => slotOfKind(p.card.kind) === group);
    const whole = here.find((p) => isWholeCard(p.card.kind));
    if (whole) {
      const wide = slotBox(win, whole.card, tip, whole.id);
      wide.classList.add("lshuf-build__slot--wide");
      slots.appendChild(wide);
    } else {
      for (const cell of slotLayout(here, n, (p) => p.card.withNames || [])) {
        if (cell && cell.rider) slots.appendChild(riderBox(win, cell.pick.card, cell.rider, cell.pick.id));
        else slots.appendChild(slotBox(win, cell ? cell.pick.card : null, tip, cell ? cell.pick.id : null));
      }
    }
    box.append(label, slots);
    row.appendChild(box);
  }
  return row;
}

// --- toolbar ---

export function dropdown(items, onPick, cls, selected = 0) {
  const dd = el("fxs-dropdown", `lshuf-build__dropdown ${cls || ""}`.trim());
  dd.setAttribute("data-audio-group-ref", "options");
  dd.setAttribute("dropdown-items", JSON.stringify(items.map((i) => ({ label: i.label }))));
  dd.setAttribute("selected-item-index", String(selected));
  dd.addEventListener("dropdown-selection-change", (e) => {
    const i = e.detail ? e.detail.selectedIndex : 0;
    onPick(items[i] ? items[i].value : "");
  });
  return dd;
}

function toggle(win, field, key, cls, tipKey = null) {
  const box = el("div", `flex flex-row items-center ${cls || ""}`.trim());
  const cb = el("fxs-checkbox", "mr-2");
  cb.setAttribute("data-audio-group-ref", "options");
  cb.setAttribute("selected", win.filters[field] ? "true" : "false");
  cb.addEventListener("component-value-changed", (e) => {
    win.filters[field] = !!(e.detail && e.detail.value);
    win.refresh();
  });
  box.append(cb, el("div", "font-body text-sm", key));
  if (tipKey) box.setAttribute("data-tooltip-content", compose(tipKey));
  return box;
}

export function renderToolbar(win) {
  const bar = el("div", "flex flex-row flex-wrap items-center");
  const search = el("fxs-textbox", "lshuf-build__search mr-3");
  search.setAttribute("placeholder", compose("LOC_LSHUF_BUILD_SEARCH"));
  search.addEventListener("text-changed", (e) => {
    win.filters.search = String(e.detail ? e.detail.newStr : search.getAttribute("value") || "").trim().toLowerCase();
    win.refresh();
  });
  const all = compose("LOC_LSHUF_BUILD_FILTER_ALL");
  const kinds = [{ value: "", label: compose("LOC_LSHUF_BUILD_FILTER_KIND", all) }]
    .concat(KINDS.filter((k) => win.kinds.includes(k)).map((k) => ({ value: k, label: compose(kindKey(k)) })));
  const types = [{ value: "", label: compose("LOC_LSHUF_BUILD_FILTER_TYPE", all) }]
    .concat([...win.tagNames].map(([tag, name]) => ({ value: tag, label: name })));
  const leaders = [{ value: "", label: compose("LOC_LSHUF_BUILD_FILTER_LEADER", all) }]
    .concat([...win.leaderNames].map(([type, info]) => ({ value: type, label: info.name }))
      .sort((a, b) => a.label.localeCompare(b.label)));
  const set = (name) => (value) => {
    win.filters[name] = value;
    win.refresh();
  };
  bar.append(search, dropdown(kinds, set("kind"), "mr-3"));
  // Attribute types and leaders only sort leader cards; the civ screen has neither.
  if (win.scope !== "civ") bar.append(dropdown(types, set("type"), "mr-3"), dropdown(leaders, set("leader"), "mr-3"));
  if (win.kinds.includes(BUILD_KIND.Bias)) bar.appendChild(toggle(win, "hideNoTerrain", "LOC_LSHUF_BUILD_HIDE_NO_TERRAIN", "mr-4"));
  if (win.kinds.includes(BUILD_KIND.CivAbility)) bar.appendChild(toggle(win, "everyAge", "LOC_LSHUF_BUILD_EVERY_AGE", "ml-4", "LOC_LSHUF_BUILD_EVERY_AGE_TIP"));
  return bar;
}

// --- grid ---

const matchesSearch = (card, search) => !search
  || `${card.name} ${card.from} ${card.text}`.toLowerCase().includes(search);

// Whole cards or single pieces, per part, as the settings say (lshuf-build-layout.js cardsShown): a leader or
// civilization ability shows whole or as single bonuses, and civics as whole trees or single civics.
const ABILITY_SINGLE = [BUILD_KIND.Bullet, BUILD_KIND.CivBullet];
const ABILITY_WHOLE = [BUILD_KIND.Whole, BUILD_KIND.CivAbility];
function hiddenByToggles(card, f) {
  if (f.hideNoTerrain && card.noTerrain) return true;
  if (ABILITY_SINGLE.includes(card.kind)) return !!f.wholeAbility;
  if (ABILITY_WHOLE.includes(card.kind)) return !f.wholeAbility;
  if (card.kind === BUILD_KIND.CivCivic) return !!f.wholeCivics;
  if (card.kind === BUILD_KIND.CivCivics) return !f.wholeCivics;
  return false;
}

function passes(card, f) {
  if (hiddenByToggles(card, f) || !matchesSearch(card, f.search)) return false;
  if (card.otherAge && !f.everyAge) return false;
  if (!kindMatches(card, f.kind)) return false;
  if (f.type && !(card.tags || []).includes(f.type)) return false;
  if (f.leader && card.leader !== f.leader) return false;
  return true;
}

// The equipped tag, the attribute copy count and the "your leader's own" mark.
function addMarks(box, card, why, copies) {
  if (why === "taken" || copies > 0) {
    const tag = el("div", "lshuf-build__equipped");
    tag.style.backgroundImage = TAG_EQUIPPED;
    box.appendChild(tag);
  }
  if (card.kind === BUILD_KIND.Attribute && copies > 0) {
    const count = el("div", "lshuf-build__copies font-title text-sm");
    count.textContent = `×${copies}`;
    box.appendChild(count);
  }
  if (card.own) {
    const own = el("div", "lshuf-build__own font-body text-xs uppercase");
    own.textContent = compose(card.leader ? "LOC_LSHUF_BUILD_CARD_OWN" : "LOC_LSHUF_BUILD_CARD_OWN_CIV");
    box.appendChild(own);
  }
}

// The card's state line (its tooltip's foot): why it can't be taken, in the player's words. Another age's civics
// aren't in this age's game at all, so they get their own line.
function stateLine(card, why) {
  if (why === "taken") return "LOC_LSHUF_BUILD_CARD_TAKEN";
  if (why === "unreviewed") return "LOC_LSHUF_BUILD_CARD_UNREVIEWED";
  if (why === "otherage") {
    const key = CIVICS_KINDS.includes(card.kind) ? "LOC_LSHUF_BUILD_CARD_OTHER_AGE_CIVICS" : "LOC_LSHUF_BUILD_CARD_OTHER_AGE";
    return compose(key, card.otherAge);
  }
  if (why === "terrainoff") return compose("LOC_LSHUF_BUILD_CARD_TERRAIN_OFF");
  if (why === "goeswith") return compose("LOC_LSHUF_BUILD_CARD_GOES_WITH_MISSING");
  if (why === "bundle") return compose("LOC_LSHUF_BUILD_CARD_BUNDLE_FULL", String(1 + (card.withNames || []).length));
  return null;
}

function cardEl(win, card, picks) {
  const why = win.note ? "off" : cantTake(card, picks, win.counts);
  const box = el("div", "lshuf-build__card relative group");
  if (why) box.classList.add(`lshuf-build__card--${why}`);
  box.appendChild(artOf(card));
  const band = el("div", "lshuf-build__band absolute flex flex-col items-center");
  const name = el("div", "lshuf-build__card-name font-title text-sm uppercase text-center");
  name.textContent = card.name;
  band.appendChild(name);
  if (card.from && card.kind !== BUILD_KIND.Persona && card.kind !== BUILD_KIND.Bias) {
    const from = el("div", "font-body text-xs text-accent-2 text-center");
    const parts = [card.kindLine, compose("LOC_LSHUF_BUILD_CARD_FROM", card.from), card.otherAge].filter(Boolean);
    from.textContent = parts.join(" · ");
    band.appendChild(from);
  }
  // What comes with the card (CONTRACTS 23): "With: Ekklesia".
  if (card.withLine) {
    const withEl = el("div", "lshuf-build__card-with font-body text-xs text-center");
    withEl.textContent = card.withLine;
    band.appendChild(withEl);
  }
  band.appendChild(pips(card.tags));
  box.appendChild(band);
  addMarks(box, card, why, attributeIdsOf(card, picks).length);
  const state = stateLine(card, why);
  box.setAttribute("data-tooltip-style", TOOLTIP_STYLE);
  box.setAttribute(CARD_ATTR, card.id);
  if (state) box.setAttribute("data-lshuf-state", state);
  box.appendChild(highlight());
  if (CIVICS_KINDS.includes(card.kind)) box.appendChild(treeButton(win, card));
  // The details pane follows the pointer only once it rests on a card, so crossing other cards on the way to the
  // pane's buttons leaves the one you were reading in place.
  let dwell = 0;
  box.addEventListener("mouseenter", () => {
    dwell = setTimeout(() => win.showDetails(card), DETAILS_DWELL_MS);
  });
  box.addEventListener("mouseleave", () => clearTimeout(dwell));
  box.addEventListener("click", () => win.take(card));
  return box;
}

// A civics card's own "Tree" button: opens the tree for exactly this card, without taking it.
function treeButton(win, card) {
  const btn = el("div", "lshuf-build__treebtn font-body text-xs uppercase pointer-events-auto");
  if (card.own) btn.classList.add("lshuf-build__treebtn--low");
  btn.textContent = compose("LOC_LSHUF_BUILD_TREE_BUTTON");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    win.showDetails(card);
    win.openTree(card);
  });
  return btn;
}

export function renderGrid(win, picks) {
  const frag = document.createDocumentFragment();
  for (const card of win.cards) {
    if (!passes(card, win.filters)) continue;
    frag.appendChild(cardEl(win, card, picks));
  }
  return frag;
}

export const kindOfId = buildKindOf;
