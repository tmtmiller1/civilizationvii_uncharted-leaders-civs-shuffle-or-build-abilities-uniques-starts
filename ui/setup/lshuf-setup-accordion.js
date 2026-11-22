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
import { paramValue } from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-params.js";
import { PARAM } from "/uncharted-leaders-and-civs/shared/lshuf-constants.js";
import { BUILD_HINT_KEY, lineKey } from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-lines.js";

const BUTTON_ROW_CLASS = "lshuf-setup__advanced-row";
const LINE_CLASS = "lshuf-setup__line";
// The rows that get a line under them (CONTRACTS 34): [parameter, its option name key], in section order.
const LINE_ROWS = [
  [PARAM.Mode, "LOC_LSHUF_MODE_NAME"],
  [PARAM.CivMode, "LOC_LSHUF_CIV_MODE_NAME"],
  [PARAM.HumanMode, "LOC_LSHUF_HUMAN_MODE_NAME"],
  [PARAM.HumanCivMode, "LOC_LSHUF_HUMAN_CIV_MODE_NAME"],
  [PARAM.Personality, "LOC_LSHUF_PERSONALITY_NAME"],
  [PARAM.Reveal, "LOC_LSHUF_REVEAL_NAME"]
];
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

function compose(key) {
  try {
    return String(Locale.compose(key));
  } catch (_) {
    return "";
  }
}

// The line under one row: what its current pick does, in the player's words. Your civilization's line also points
// at the build pages. Game utility classes only (the accordion doesn't load the mod's stylesheet). The same text goes
// on the row as its tooltip. Returns the element the next thing goes after (the line), or the row.
function placeLine(row, paramId) {
  const key = lineKey(paramId, paramValue(paramId));
  let line = row.nextElementSibling;
  if (!line || !line.classList.contains(LINE_CLASS) || line.getAttribute("data-param") !== paramId) {
    line = document.createElement("div");
    line.className = `${LINE_CLASS} font-body text-xs text-accent-2 px-4 pb-2`;
    line.setAttribute("data-param", paramId);
    row.after(line);
  }
  let text = key ? compose(key) : "";
  if (paramId === PARAM.HumanCivMode) text = `${text} ${compose(BUILD_HINT_KEY)}`.trim();
  if (line.textContent !== text) line.textContent = text;
  if (text && row.getAttribute("data-tooltip-content") !== text) row.setAttribute("data-tooltip-content", text);
  return line;
}

// Every row's line; returns the Reveal row's line, the place the buttons go after.
function placeLines(first, last) {
  let after = null;
  for (const [paramId, nameKey] of LINE_ROWS) {
    const label = labelFor(nameOf(nameKey));
    const row = label ? rowOf(label, first === label ? last : first) : null;
    if (!row) continue;
    try {
      const placed = placeLine(row, paramId);
      if (paramId === PARAM.Reveal) after = placed;
    } catch (e) {
      log(`line for ${paramId} failed: ${e}`);
    }
  }
  return after;
}

export function injectAccordionButtons() {
  const last = labelFor(nameOf(LAST_KEY));
  const first = labelFor(nameOf(FIRST_KEY));
  const existing = document.querySelector(`.${BUTTON_ROW_CLASS}`);
  if (!last || !first) {
    if (existing) existing.remove();
    for (const line of document.querySelectorAll(`.${LINE_CLASS}`)) line.remove();
    return;
  }
  const after = placeLines(first, last) || rowOf(last, first);
  if (!after) return;
  if (existing && existing === after.nextElementSibling) return;
  after.after(existing || buttonRow());
}
