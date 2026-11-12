// The build screens' card tooltip: a tooltip type of the mod's own (TooltipManager.registerType, the way the game's
// random-event and relationship tooltips are made) so every card and filled slot shows its name, where it's from,
// what it does with the game's icons, and its value. A card element carries data-tooltip-style="lshuf-card" and
// data-lshuf-card="<id>"; the screen registers its cards here before it draws them.

import TooltipManager from "/core/ui/tooltips/tooltip-manager.js";
import { BUILD_KIND } from "/uncharted-leaders-and-civs/shared/lshuf-constants.js";
import { el } from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-controls.js";
import { compose } from "/uncharted-leaders-and-civs/ui/setup/lshuf-build-cards.js";

export const TOOLTIP_STYLE = "lshuf-card";
export const CARD_ATTR = "data-lshuf-card";
const STATE_ATTR = "data-lshuf-state";

const cards = new Map();
export function registerCards(list) {
  cards.clear();
  for (const c of list) cards.set(c.id, c);
}

const stylize = (text) => (Locale.stylize ? Locale.stylize(text) : text);
const kindKey = (kind) => `LOC_LSHUF_BUILD_KIND_${String(kind).toUpperCase()}`;

class BuildCardTooltip {
  tooltip = document.createElement("fxs-tooltip");
  box = el("div", "lshuf-build-tip flex flex-col");
  id = null;
  state = null;

  constructor() {
    this.tooltip.classList.add("lshuf-build-tip__frame");
    this.tooltip.appendChild(this.box);
  }

  getHTML() {
    return this.tooltip;
  }

  reset() {
    this.box.innerHTML = "";
  }

  // The hovered node may be a child of the card (its art, name or pips): read the card from the nearest holder.
  isUpdateNeeded(target) {
    const holder = target && target.closest ? target.closest(`[${CARD_ATTR}]`) : null;
    const id = holder ? holder.getAttribute(CARD_ATTR) : null;
    const state = holder ? holder.getAttribute(STATE_ATTR) : null;
    if (id === this.id && state === this.state) return false;
    this.id = id;
    this.state = state;
    return true;
  }

  art(card) {
    const art = el("div", "lshuf-build-tip__art");
    const image = card.background || card.portrait || card.icon || "";
    if (image) art.style.backgroundImage = image;
    return art;
  }

  head(card) {
    const head = el("div", "lshuf-build-tip__head flex flex-row items-center");
    const titles = el("div", "flex flex-col ml-3");
    const name = el("div", "lshuf-build-tip__name font-title text-base uppercase text-secondary");
    name.innerHTML = stylize(card.name || "");
    const kind = el("div", "font-body text-xs uppercase text-accent-2");
    const showFrom = card.from && card.kind !== BUILD_KIND.Persona && card.kind !== BUILD_KIND.Bias;
    const kindText = card.kindLine || compose(kindKey(card.kind));
    kind.textContent = showFrom
      ? [kindText, compose("LOC_LSHUF_BUILD_CARD_FROM", card.from), card.otherAge].filter(Boolean).join(" · ")
      : kindText;
    titles.append(name, kind);
    head.append(this.art(card), titles);
    return head;
  }

  foot(card) {
    const foot = el("div", "lshuf-build-tip__foot font-body text-xs text-accent-2 flex flex-row justify-between");
    const value = el("div");
    if (card.value != null) value.textContent = `${compose("LOC_LSHUF_DEALING_NAME")}: ${card.value}`;
    const state = el("div", "lshuf-build-tip__state");
    if (this.state) state.textContent = this.state.startsWith("LOC_") ? compose(this.state) : this.state;
    else if (card.own) state.textContent = compose(card.leader ? "LOC_LSHUF_BUILD_CARD_OWN" : "LOC_LSHUF_BUILD_CARD_OWN_CIV");
    foot.append(value, state);
    return foot;
  }

  update() {
    const card = this.id ? cards.get(this.id) : null;
    if (!card) return;
    const body = el("div", "lshuf-build-tip__body font-body text-sm");
    body.innerHTML = stylize(card.text || "");
    this.box.append(this.head(card), body, this.foot(card));
  }

  isBlank() {
    return !this.id || !cards.has(this.id);
  }
}

TooltipManager.registerType(TOOLTIP_STYLE, new BuildCardTooltip());
