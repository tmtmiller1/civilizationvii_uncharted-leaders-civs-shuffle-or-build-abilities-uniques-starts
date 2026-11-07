// The pieces of the Build your own leader screen: the slot row, the toolbar and the card grid. Each takes the window
// (for its cards, counts, filters and handlers) and returns an element built from the game's own controls and art.

import { BUILD_KIND, buildKindOf } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";
import { el } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-controls.js";
import {
  attributeIdsOf, cantTake, cardFor, compose, isWholeCard, slotOfKind
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-cards.js";
import { CARD_ATTR, TOOLTIP_STYLE } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-tooltip.js";
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

const KINDS = [
  BUILD_KIND.Bullet, BUILD_KIND.Whole, BUILD_KIND.Attribute, BUILD_KIND.Persona, BUILD_KIND.Bias,
  BUILD_KIND.CivAbility, BUILD_KIND.CivBullet, BUILD_KIND.CivUnique, BUILD_KIND.CivCivics, BUILD_KIND.CivBias
];
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
    BUILD_KIND.CivBias, BUILD_KIND.CivAbility, BUILD_KIND.CivBullet, BUILD_KIND.CivUnique, BUILD_KIND.CivCivics
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
    slot.setAttribute("data-tooltip-content", compose(groupKey));
    const empty = el("div", "lshuf-build__slot-name font-body text-xs uppercase lshuf-build__slot-name--empty");
    empty.textContent = compose("LOC_LSHUF_BUILD_SLOT_EMPTY");
    slot.appendChild(empty);
  }
  slot.appendChild(highlight());
  return slot;
}

export function renderSlots(win, picks) {
  const row = el("div", "flex flex-row flex-wrap items-start");
  const picked = picks.map((id) => ({ id, card: cardFor(win.byId, id) })).filter((p) => p.card);
  for (const [group, key] of SLOT_GROUPS) {
    const n = win.counts[group];
    if (!n) continue;
    const box = el("div", "lshuf-build__slot-group flex flex-col items-center mr-4");
    const label = el("div", "font-title text-xs uppercase text-accent-2 mb-1");
    label.textContent = compose(key);
    const slots = el("div", "flex flex-row");
    const here = picked.filter((p) => slotOfKind(p.card.kind) === group);
    const whole = here.find((p) => isWholeCard(p.card.kind));
    if (whole) {
      const wide = slotBox(win, whole.card, key, whole.id);
      wide.classList.add("lshuf-build__slot--wide");
      slots.appendChild(wide);
    } else {
      for (let i = 0; i < n; i += 1) {
        const pick = here[i] || null;
        slots.appendChild(slotBox(win, pick ? pick.card : null, key, pick ? pick.id : null));
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

function toggle(win, field, key, cls) {
  const box = el("div", `flex flex-row items-center ${cls || ""}`.trim());
  const cb = el("fxs-checkbox", "mr-2");
  cb.setAttribute("data-audio-group-ref", "options");
  cb.setAttribute("selected", win.filters[field] ? "true" : "false");
  cb.addEventListener("component-value-changed", (e) => {
    win.filters[field] = !!(e.detail && e.detail.value);
    win.refresh();
  });
  box.append(cb, el("div", "font-body text-sm", key));
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
  bar.append(search, dropdown(kinds, set("kind"), "mr-3"), dropdown(types, set("type"), "mr-3"));
  bar.appendChild(dropdown(leaders, set("leader"), "mr-3"));
  if (win.kinds.includes(BUILD_KIND.Bias)) bar.appendChild(toggle(win, "hideNoTerrain", "LOC_LSHUF_BUILD_HIDE_NO_TERRAIN", "mr-4"));
  if (!win.kinds.includes(BUILD_KIND.Whole) && !win.kinds.includes(BUILD_KIND.CivAbility)) return bar;
  const wholeBox = el("div", "flex flex-row items-center");
  const cb = el("fxs-checkbox", "mr-2");
  cb.setAttribute("data-audio-group-ref", "options");
  cb.setAttribute("selected", win.filters.whole ? "true" : "false");
  cb.addEventListener("component-value-changed", (e) => {
    win.filters.whole = !!(e.detail && e.detail.value);
    win.refresh();
  });
  const label = el("div", "font-body text-sm", "LOC_LSHUF_BUILD_WHOLE_ABILITIES");
  wholeBox.append(cb, label);
  bar.appendChild(wholeBox);
  return bar;
}

// --- grid ---

const matchesSearch = (card, search) => !search
  || `${card.name} ${card.from} ${card.text}`.toLowerCase().includes(search);

// Whole abilities: the whole cards (leader or civilization) in place of the single bonuses, or the other way round.
const BULLET_KINDS = [BUILD_KIND.Bullet, BUILD_KIND.CivBullet];
const hiddenByToggles = (card, f) =>
  (f.whole ? BULLET_KINDS.includes(card.kind) : isWholeCard(card.kind)) || (f.hideNoTerrain && card.noTerrain);

function passes(card, f) {
  if (hiddenByToggles(card, f) || !matchesSearch(card, f.search)) return false;
  if (f.kind && card.kind !== f.kind) return false;
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
    own.textContent = compose("LOC_LSHUF_BUILD_CARD_OWN");
    box.appendChild(own);
  }
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
    from.textContent = card.kindLine
      ? `${card.kindLine} · ${compose("LOC_LSHUF_BUILD_CARD_FROM", card.from)}`
      : compose("LOC_LSHUF_BUILD_CARD_FROM", card.from);
    band.appendChild(from);
  }
  band.appendChild(pips(card.tags));
  box.appendChild(band);
  addMarks(box, card, why, attributeIdsOf(card, picks).length);
  let state = null;
  if (why === "taken") state = "LOC_LSHUF_BUILD_CARD_TAKEN";
  else if (why === "unreviewed") state = "LOC_LSHUF_BUILD_CARD_UNREVIEWED";
  box.setAttribute("data-tooltip-style", TOOLTIP_STYLE);
  box.setAttribute(CARD_ATTR, card.id);
  if (state) box.setAttribute("data-lshuf-state", state);
  box.appendChild(highlight());
  box.addEventListener("mouseenter", () => win.showDetails(card));
  box.addEventListener("click", () => win.take(card));
  return box;
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
