// Leader shuffle is a preset over the three parts (CONTRACTS 15): picking a preset writes Leader abilities, Leader
// attributes and Start terrain; changing a part by hand makes the preset read Custom. The game's own rows in the
// settings section write through GameSetup without our events, so this watches the four values on a short timer
// while setup is open, as well as our own setup-changed event.

// The civilization mode (CONTRACTS 32) is the same over Civilization abilities, uniques and civics.

import {
  CIV_MODE_CUSTOM, CIV_PRESETS, EVENT, MODE_CUSTOM, PARAM, PRESETS, civPresetOf, presetOf
} from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";
import { paramValue, setParam } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-params.js";

// Each preset: its parameter, its three parts, what each value sets, the reverse lookup and its Custom value.
const GROUPS = [
  {
    mode: PARAM.Mode, parts: [PARAM.Abilities, PARAM.Attributes, PARAM.Biases], sets: PRESETS, of: presetOf,
    custom: MODE_CUSTOM
  },
  {
    mode: PARAM.CivMode, parts: [PARAM.CivAbilities, PARAM.CivUniques, PARAM.CivCivics], sets: CIV_PRESETS,
    of: civPresetOf, custom: CIV_MODE_CUSTOM
  }
];
const POLL_MS = 400;
const last = new Map();
let timer = 0;

const snapshot = (g) => [paramValue(g.mode), ...g.parts.map((p) => paramValue(p))].map((v) => (v == null ? "" : String(v)));

// Writes only what differs, so a write never fires another write.
function write(paramId, value) {
  if (!value || paramValue(paramId) === value) return;
  setParam(paramId, value);
}

function syncGroup(g) {
  const now = snapshot(g);
  const before = last.get(g.mode) || now;
  last.set(g.mode, now);
  const [mode, ...parts] = now;
  const modeChanged = mode !== before[0];
  const partChanged = parts.some((v, i) => v !== before[i + 1]);
  if (modeChanged && g.sets[mode]) {
    g.sets[mode].forEach((v, i) => write(g.parts[i], v));
    last.set(g.mode, snapshot(g));
    return;
  }
  const modeStale = !g.sets[mode] && mode !== g.custom;
  if (partChanged || modeStale) {
    if (parts.every(Boolean)) write(g.mode, g.of(...parts));
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
