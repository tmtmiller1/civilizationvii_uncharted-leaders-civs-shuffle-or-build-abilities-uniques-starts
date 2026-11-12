// The config keys the deal reads (CONTRACTS 3 and 13): one shared writer for the setup screens
// (lshuf-setup-start.js) and the age-transition screens in a game (ui/game/lshuf-game-transition.js), so builds made
// at a transition reach the next age's data load the way setup builds reach the first.
import { BUILD_SLOTS, KEY, listValue } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";
import { builderFromSetup } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-config.js";

const log = (msg) => console.warn(`[lshuf-keys] ${msg}`);

// Values this session has written, so a rewrite only touches keys that changed (a write raises PlayerInfoChanged
// on some screens, and an unchanged write mustn't feed it).
const written = new Map();

export function setKey(key, value) {
  const text = Array.isArray(value) ? value.join(",") : String(value);
  if (written.get(key) === text) return;
  try {
    Configuration.editGame().setValue(key, value);
    written.set(key, text);
  } catch (e) {
    log(`setValue(${key}) failed: ${e}`);
  }
}

export function clearWritten() {
  written.clear();
}

// Each builder slot's leader, civilization and cards from the slots as they read now. Returns the builders.
export function writeBuildKeys(slots) {
  const builders = [];
  for (let n = 1; n <= BUILD_SLOTS; n++) {
    const b = builderFromSetup(slots, n);
    setKey(KEY.builderN(n), b ? [listValue(b.leader)] : []);
    setKey(KEY.builderCivN(n), b && b.civ ? [listValue(b.civ)] : []);
    setKey(KEY.builtN(n), b ? b.pieces.map(listValue) : []);
    if (b) builders.push(b);
  }
  return builders;
}
