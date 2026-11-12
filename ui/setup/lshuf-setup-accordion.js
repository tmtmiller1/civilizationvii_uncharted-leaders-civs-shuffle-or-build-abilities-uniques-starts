// The Leader pool..., Civilization pool..., AI players..., Build your own leader..., Build your own
// civilization... and Advanced settings... buttons, right after
// the main options in the mod's own "Uncharted Leaders & Civs Settings" section of Advanced Settings (ordinary rows,
// data/frontend/parameters.sql).
// The game draws a section's rows only while it's open, so the buttons go in after our last row whenever that row is
// on screen, and leave with it.

import { openSetupWindow } from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-window.js";
import { openBuildWindow } from "/uncharted-leaders-and-civs/ui/setup/lshuf-build-window.js";
import {
  pageButtons, SECTION_BUTTONS
} from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-section.js";

const BUTTON_ROW_CLASS = "lshuf-setup__advanced-row";
// Our first and last rows in the section, by their option names.
const FIRST_KEY = "LOC_LSHUF_MODE_NAME";
const LAST_KEY = "LOC_LSHUF_REVEAL_NAME";

const log = (msg) => console.warn(`[lshuf-setup] ${msg}`);

const names = {};
function nameOf(key) {
  if (!names[key]) {
    try {
      names[key] = String(Locale.compose(key)).trim().toLowerCase();
    } catch (_) {
      names[key] = "";
    }
  }
  return names[key];
}

// The innermost element whose own text is exactly `text`, inside an accordion.
function labelFor(text) {
  if (!text) return null;
  for (const node of document.querySelectorAll(".accordian div, .accordian span")) {
    if (node.children.length) continue;
    if (String(node.textContent || "").trim().toLowerCase() === text && node.closest(".accordian")) return node;
  }
  return null;
}

// The row holding `label`: its ancestor that is a direct child of the element both our rows sit in.
function rowOf(label, other) {
  let row = label;
  while (row.parentElement && !row.parentElement.contains(other)) row = row.parentElement;
  return row.parentElement ? row : null;
}

// "build" and "buildciv" are the build window's two pages; the rest are setup-window pages.
function openPage(page) {
  try {
    if (page === "build") openBuildWindow("leader");
    else if (page === "buildciv") openBuildWindow("civ");
    else openSetupWindow(page);
  } catch (e) {
    log(`open ${page} failed: ${e}`);
  }
}

function buttonRow() {
  const row = pageButtons(openPage, SECTION_BUTTONS);
  row.classList.add(BUTTON_ROW_CLASS);
  return row;
}

export function injectAccordionButtons() {
  const last = labelFor(nameOf(LAST_KEY));
  const first = labelFor(nameOf(FIRST_KEY));
  const existing = document.querySelector(`.${BUTTON_ROW_CLASS}`);
  if (!last || !first) {
    if (existing) existing.remove();
    return;
  }
  const row = rowOf(last, first);
  if (!row) return;
  if (existing && existing === row.nextElementSibling) return;
  row.after(existing || buttonRow());
}
