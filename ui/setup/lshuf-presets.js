// Leader shuffle is a preset over the three parts (CONTRACTS 15): picking a preset writes Leader abilities, Leader
// attributes and Start terrain; changing a part by hand makes the preset read Custom. The game's own rows in the
// settings section write through GameSetup without our events, so this watches the four values on a short timer
// while setup is open, as well as our own setup-changed event.

// The civilization mode (CONTRACTS 32) is the same over Civilization abilities, uniques and civics. The Leader mode
// also watches AI agendas (CONTRACTS 33): Agendas only and Agendas and attributes set it to Swap whole, and read
// back from it.

import {
  CIV_MODE_CUSTOM, CIV_PRESETS, EVENT, MODE_CUSTOM, OPTION_DEFAULTS, PARAM, PRESETS, PRESET_PERSONA, civPresetOf,
  presetOf
} from "/uncharted-leaders-and-civs/shared/lshuf-constants.js";
import { paramValue, setParam } from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-params.js";

// Each preset: its parameter, its three parts, what each value sets, the reverse lookup and its Custom value.
const GROUPS = [
  {
    mode: PARAM.Mode, parts: [PARAM.Abilities, PARAM.Attributes, PARAM.Biases], sets: PRESETS, of: presetOf,
    custom: MODE_CUSTOM, extra: PARAM.Personality, extraSets: PRESET_PERSONA,
    extraDefault: OPTION_DEFAULTS.Personality
  },
  {
    mode: PARAM.CivMode, parts: [PARAM.CivAbilities, PARAM.CivUniques, PARAM.CivCivics], sets: CIV_PRESETS,
    of: civPresetOf, custom: CIV_MODE_CUSTOM
  }
];
const POLL_MS = 400;
const last = new Map();
let timer = 0;

// The mode, its parts, and the extra value it reads back from (AI agendas for the Leader mode), as strings.
const watched = (g) => [g.mode, ...g.parts, ...(g.extra ? [g.extra] : [])];
const snapshot = (g) => watched(g).map((p) => paramValue(p)).map((v) => (v == null ? "" : String(v)));

// Writes only what differs, so a write never fires another write.
function write(paramId, value) {
  if (!value || paramValue(paramId) === value) return;
  setParam(paramId, value);
}

// A preset picked: its parts, and the extra value it sets (or the extra's default when leaving a preset that set it,
// so No shuffle after Agendas only shuffles nothing).
function applyPreset(g, mode, before) {
  g.sets[mode].forEach((v, i) => write(g.parts[i], v));
  if (!g.extra) return;
  if (g.extraSets[mode]) write(g.extra, g.extraSets[mode]);
  else if (g.extraSets[before]) write(g.extra, g.extraDefault);
}

function syncGroup(g) {
  const now = snapshot(g);
  const before = last.get(g.mode) || now;
  last.set(g.mode, now);
  const [mode, ...rest] = now;
  const parts = rest.slice(0, g.parts.length);
  const modeChanged = mode !== before[0];
  const partChanged = rest.some((v, i) => v !== before[i + 1]);
  if (modeChanged && g.sets[mode]) {
    applyPreset(g, mode, before[0]);
    last.set(g.mode, snapshot(g));
    return;
  }
  const modeStale = !g.sets[mode] && mode !== g.custom;
  if (partChanged || modeStale) {
    const extra = g.extra ? [rest[g.parts.length] || null] : [];
    if (parts.every(Boolean)) write(g.mode, g.of(...parts, ...extra));
    last.set(g.mode, snapshot(g));
  }
}

export function syncPresets() {
  for (const g of GROUPS) {
    // An older setup without the civilization mode keeps working on the leader one.
    if (paramValue(g.mode) == null && g.mode !== PARAM.Mode) continue;
    syncGroup(g);
  }
}

export function startPresetWatch() {
  if (timer) return;
  last.clear();
  timer = setInterval(() => {
    try {
      syncPresets();
    } catch (_) {
      /* setup not open */
    }
  }, POLL_MS);
}

export function stopPresetWatch() {
  clearInterval(timer);
  timer = 0;
  last.clear();
}

window.addEventListener(EVENT.SetupChanged, () => {
  try {
    syncPresets();
  } catch (_) {
    /* setup not open */
  }
});
