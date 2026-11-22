// Pieces the setup windows share: option text keys, the list-window buttons, headings, the setup revision and the
// host-only lock.

import { BUILD_SLOTS, PARAM } from "/uncharted-leaders-and-civs/shared/lshuf-constants.js";
import {
  buildForParam, buildPicksParam, isLocalHost, readSlots
} from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-config.js";
import { el } from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-controls.js";
import { paramValue, paramValues, START_AGE_PARAM } from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-params.js";

export const opt = (key) => [`LOC_LSHUF_${key}_NAME`, `LOC_LSHUF_${key}_DESC`];

// The list windows the advanced window opens, in button order: [page id, caption].
export const PAGE_BUTTONS = [
  ["leaders", "LOC_LSHUF_BTN_LEADERS"],
  ["modded", "LOC_LSHUF_BTN_MODDED"]
];

// The buttons after the main settings in the mod's section: [page id, caption].
export const SECTION_BUTTONS = [
  ["pools", "LOC_LSHUF_BTN_POOLS"],
  ["civs", "LOC_LSHUF_BTN_CIVS"],
  ["aiplayers", "LOC_LSHUF_BTN_AI_PLAYERS"],
  ["build", "LOC_LSHUF_BTN_BUILD"],
  ["buildciv", "LOC_LSHUF_BTN_BUILD_CIV"],
  ["advanced", "LOC_LSHUF_BTN_ADVANCED"]
];

export function heading(key, cls = "") {
  return el("div", `lshuf-setup__heading font-title text-lg text-secondary uppercase ${cls}`.trim(), key);
}

// What the setup windows show, as one string: every option of the mod, the build values, the start age and each
// player's leader and civilization. The windows redraw when it changes. GameSetup.currentRevision can't serve: on the
// create-game screens it rises every frame with nothing changed (lab 2026-11-22, about 60 a second with no setup
// write at all), and redrawing on it made the build window flicker twice a second.
const SIGNATURE_PARAMS = () => {
  const ids = new Set([...Object.values(PARAM), START_AGE_PARAM]);
  for (let n = 1; n <= BUILD_SLOTS; n++) {
    ids.add(buildPicksParam(n));
    if (n > 1) ids.add(buildForParam(n));
  }
  return [...ids].filter((id) => typeof id === "string").sort();
};

export function readRevision() {
  try {
    const values = SIGNATURE_PARAMS().map((id) => `${id}=${paramValue(id)}|${paramValues(id).join(",")}`);
    const players = readSlots().map((s) => `${s.id}:${s.leader}:${s.civ}`);
    return `${values.join(";")}#${players.join(";")}`;
  } catch (_) {
    return "";
  }
}

// Only the host changes values in a network game; every machine can look.
export function setupCtx(onChange) {
  return { locked: () => !isLocalHost(), changed: () => onChange && onChange() };
}

export function pageButtons(open, buttons = PAGE_BUTTONS) {
  // Game utility classes only: the Advanced Settings accordion doesn't load the mod's stylesheet.
  const row = el("div", "lshuf-setup__buttons flex flex-row flex-wrap justify-center mt-2 mb-3");
  for (const [page, caption] of buttons) {
    const btn = el("fxs-button", "lshuf-setup__page-button m-1");
    btn.setAttribute("caption", caption);
    btn.setAttribute("data-audio-group-ref", "options");
    btn.addEventListener("action-activate", () => open(page));
    row.appendChild(btn);
  }
  return row;
}
