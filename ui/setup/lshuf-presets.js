// Leader shuffle is a preset over the three parts (CONTRACTS 15): picking a preset writes Leader abilities, Leader
// attributes and Start terrain; changing a part by hand makes the preset read Custom. The game's own rows in the
// settings section write through GameSetup without our events, so this watches the four values on a short timer
// while setup is open, as well as our own setup-changed event.

import { EVENT, MODE_CUSTOM, PARAM, PRESETS, presetOf } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";
import { paramValue, setParam } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-params.js";

const PARTS = [PARAM.Abilities, PARAM.Attributes, PARAM.Biases];
const POLL_MS = 400;
let last = null;
let timer = 0;

const snapshot = () => [paramValue(PARAM.Mode), ...PARTS.map((p) => paramValue(p))].map((v) => (v == null ? "" : String(v)));

// Writes only what differs, so a write never fires another write.
function write(paramId, value) {
  if (!value || paramValue(paramId) === value) return;
  setParam(paramId, value);
}

export function syncPresets() {
  const now = snapshot();
  const before = last || now;
  last = now;
  const [mode, a, t, b] = now;
  const modeChanged = mode !== before[0];
  const partChanged = a !== before[1] || t !== before[2] || b !== before[3];
  if (modeChanged && PRESETS[mode]) {
    const [pa, pt, pb] = PRESETS[mode];
    write(PARAM.Abilities, pa);
    write(PARAM.Attributes, pt);
    write(PARAM.Biases, pb);
    last = snapshot();
    return;
  }
  const modeStale = !PRESETS[mode] && mode !== MODE_CUSTOM;
  if (partChanged || modeStale) {
    if (a && t && b) write(PARAM.Mode, presetOf(a, t, b));
    last = snapshot();
  }
}

export function startPresetWatch() {
  if (timer) return;
  last = null;
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
  last = null;
}

window.addEventListener(EVENT.SetupChanged, () => {
  try {
    syncPresets();
  } catch (_) {
    /* setup not open */
  }
});
