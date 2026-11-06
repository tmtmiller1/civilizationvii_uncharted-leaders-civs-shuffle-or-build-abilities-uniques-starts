// The rows of the mod's setup window, built from fxs- controls. Each builder returns { el, sync } where sync() redraws
// the control from the current setup values (another player's or the host's change, a sticky-setup restore).

import { SEED_MIN, SEED_MAX } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";
import {
  paramValue, paramBool, paramValues, paramChoices, paramReadOnly, setParam, parseSeed, currentSeed, rollSeed, setSeed
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-params.js";

const CHECKBOX_CHANGE = "component-value-changed";
const DROPDOWN_CHANGE = "dropdown-selection-change";

export function el(tag, cls, l10n) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (l10n) e.setAttribute("data-l10n-id", l10n);
  return e;
}

export const compose = (key, ...args) => {
  try {
    return Locale.compose(key, ...args);
  } catch (_) {
    return key;
  }
};

const setDisabled = (control, off) => control.setAttribute("disabled", off ? "true" : "false");

// A label (with its _DESC tooltip) on the left, the control on the right.
function optionRow(nameKey, descKey, control) {
  const row = el("div", "lshuf-setup__row flex flex-row items-center justify-between");
  const label = el("div", "lshuf-setup__label font-body text-base flex-auto mr-4", nameKey);
  if (descKey) row.setAttribute("data-tooltip-content", descKey);
  row.append(label, control);
  return row;
}

// A dropdown over a select parameter's domain values.
export function dropdownRow(paramId, nameKey, descKey, ctx) {
  const dd = el("fxs-dropdown", "lshuf-setup__dropdown");
  dd.setAttribute("data-audio-group-ref", "options");
  let values = [];
  const sync = () => {
    const choices = paramChoices(paramId);
    values = choices.map((c) => c.value);
    dd.setAttribute("dropdown-items", JSON.stringify(choices.map((c) => ({ label: c.name, tooltip: c.description }))));
    dd.setAttribute("selected-item-index", String(Math.max(0, values.indexOf(paramValue(paramId)))));
    setDisabled(dd, ctx.locked() || paramReadOnly(paramId));
  };
  dd.addEventListener(DROPDOWN_CHANGE, (e) => {
    const v = values[e.detail ? e.detail.selectedIndex : -1];
    if (v === undefined || ctx.locked() || v === paramValue(paramId)) return;
    setParam(paramId, v);
    ctx.changed();
  });
  sync();
  return { el: optionRow(nameKey, descKey, dd), sync };
}

// A check box over a bool parameter.
export function checkboxRow(paramId, nameKey, descKey, ctx) {
  const cb = el("fxs-checkbox", "lshuf-setup__checkbox");
  cb.setAttribute("data-audio-group-ref", "options");
  const sync = () => {
    cb.setAttribute("selected", paramBool(paramId) ? "true" : "false");
    setDisabled(cb, ctx.locked() || paramReadOnly(paramId));
  };
  cb.addEventListener(CHECKBOX_CHANGE, (e) => {
    if (ctx.locked()) return sync();
    const on = !!(e.detail && e.detail.value);
    if (on === paramBool(paramId)) return undefined;
    setParam(paramId, on);
    ctx.changed();
    return undefined;
  });
  sync();
  return { el: optionRow(nameKey, descKey, cb), sync };
}

// The deal number: a text box (1..256), its range, and a "new number" button.
export function seedRow(paramId, nameKey, descKey, ctx) {
  const box = el("fxs-textbox", "lshuf-setup__seed");
  box.setAttribute("max-length", "3");
  box.setAttribute("show-keyboard-on-activate", "true");
  const roll = el("fxs-button", "lshuf-setup__seed-new ml-2");
  roll.setAttribute("caption", "LOC_LSHUF_SEED_NEW");
  const range = el("div", "lshuf-setup__note font-body text-xs ml-2");
  range.textContent = compose("LOC_LSHUF_SEED_RANGE", SEED_MIN, SEED_MAX);
  const sync = () => {
    box.setAttribute("value", String(currentSeed()));
    const off = ctx.locked() || paramReadOnly(paramId);
    box.setAttribute("enabled", off ? "false" : "true");
    setDisabled(roll, off);
  };
  const take = (text, final) => {
    const n = parseSeed(text);
    if (ctx.locked() || n === null) {
      if (final) sync();
      return;
    }
    if (n !== currentSeed()) {
      setSeed(n);
      ctx.changed();
    }
  };
  box.addEventListener("text-changed", (e) => take(e.detail ? e.detail.newStr : box.getAttribute("value"), false));
  box.addEventListener("text-edit-stop", () => take(box.getAttribute("value"), true));
  roll.addEventListener("action-activate", () => {
    if (ctx.locked()) return;
    setSeed(rollSeed());
    sync();
    ctx.changed();
  });
  const control = el("div", "flex flex-row items-center");
  control.append(box, roll, range);
  sync();
  return { el: optionRow(nameKey, descKey, control), sync };
}

// One leader row in a list.
function listItem(choice, list) {
  const row = el("div", "lshuf-setup__item flex flex-row items-center");
  const cb = el("fxs-checkbox", "mr-2");
  cb.setAttribute("data-audio-group-ref", "options");
  const name = el("div", "font-body text-sm");
  name.textContent = choice.name || choice.value;
  row.append(cb, name);
  cb.addEventListener(CHECKBOX_CHANGE, (e) => list.toggle(choice.value, !!(e.detail && e.detail.value)));
  return { row, cb, value: choice.value };
}

const sortByName = (choices) => [...choices].sort((a, b) => a.name.localeCompare(b.name));

function stored(paramId) {
  return new Set(paramValues(paramId));
}

// A list of leaders over an array parameter, closed until its header is pressed. inverted: the stored list holds
// the leaders switched off (UxHint InvertSelection).
class LeaderList {
  constructor(paramId, ctx, opts) {
    this.paramId = paramId;
    this.ctx = ctx;
    this.inverted = !!(opts && opts.inverted);
    this.emptyKey = (opts && opts.emptyKey) || null;
    this.choices = sortByName(paramChoices(paramId));
    this.open = false;
  }

  build(nameKey, descKey) {
    this.el = el("div", "lshuf-setup__list");
    const head = el("div", "lshuf-setup__list-head flex flex-row items-center justify-between");
    if (descKey) head.setAttribute("data-tooltip-content", descKey);
    this.count = el("div", "lshuf-setup__note font-body text-sm mx-3");
    this.toggleBtn = el("fxs-button", "lshuf-setup__list-toggle");
    head.append(el("div", "font-body text-base flex-auto", nameKey), this.count, this.toggleBtn);
    this.body = el("div", "lshuf-setup__list-body");
    const tools = el("div", "flex flex-row mb-1");
    this.allOn = el("fxs-button", "mr-2");
    this.allOn.setAttribute("caption", "LOC_LSHUF_LIST_ALL_ON");
    this.allOff = el("fxs-button");
    this.allOff.setAttribute("caption", "LOC_LSHUF_LIST_ALL_OFF");
    tools.append(this.allOn, this.allOff);
    const grid = el("div", "lshuf-setup__grid");
    this.items = this.choices.map((c) => listItem(c, this));
    for (const it of this.items) grid.appendChild(it.row);
    this.body.append(tools, grid);
    this.el.append(head, this.body);
    this.allOn.addEventListener("action-activate", () => this.setAll(true));
    this.allOff.addEventListener("action-activate", () => this.setAll(false));
    this.toggleBtn.addEventListener("action-activate", () => {
      this.open = !this.open;
      this.sync();
    });
    this.sync();
    return this;
  }

  locked() {
    return this.ctx.locked() || paramReadOnly(this.paramId);
  }

  isOn(value, set) {
    return this.inverted ? !set.has(value) : set.has(value);
  }

  toggle(value, on) {
    if (this.locked()) return this.sync();
    const set = stored(this.paramId);
    if (this.isOn(value, set) === on) return undefined;
    if (on !== this.inverted) set.add(value);
    else set.delete(value);
    return this.write(set);
  }

  setAll(on) {
    if (this.locked()) return;
    this.write(new Set(on !== this.inverted ? this.choices.map((c) => c.value) : []));
  }

  write(set) {
    const offered = new Set(this.choices.map((c) => c.value));
    setParam(this.paramId, [...set].filter((v) => offered.has(v)));
    this.ctx.changed();
    this.sync();
  }

  sync() {
    const set = stored(this.paramId);
    const off = this.locked();
    let on = 0;
    for (const it of this.items) {
      const lit = this.isOn(it.value, set);
      if (lit) on++;
      it.cb.setAttribute("selected", lit ? "true" : "false");
      setDisabled(it.cb, off);
    }
    const empty = on === 0 && this.emptyKey;
    this.count.textContent = empty ? compose(this.emptyKey) : compose("LOC_LSHUF_LIST_COUNT", on, this.items.length);
    setDisabled(this.allOn, off);
    setDisabled(this.allOff, off);
    this.toggleBtn.setAttribute("caption", this.open ? "LOC_LSHUF_LIST_HIDE" : "LOC_LSHUF_LIST_SHOW");
    this.body.style.display = this.open ? "" : "none";
  }
}

export function leaderList(paramId, nameKey, descKey, ctx, opts) {
  const list = new LeaderList(paramId, ctx, opts).build(nameKey, descKey);
  return { el: list.el, sync: () => list.sync(), size: list.items.length };
}
