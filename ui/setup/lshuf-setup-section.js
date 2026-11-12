// Pieces the setup windows share: option text keys, the list-window buttons, headings, the setup revision and the
// host-only lock.

import { isLocalHost } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-config.js";
import { el } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-controls.js";

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

export function readRevision() {
  try {
    return GameSetup.currentRevision;
  } catch (_) {
    return -1;
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
