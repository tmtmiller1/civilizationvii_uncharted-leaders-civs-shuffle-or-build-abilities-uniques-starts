// The Build your own civilization... buttons at an age transition (owner, 2026-11-07). The civilization select and
// civilization details screens a player gets between ages are the shell's own create-game screens run inside the
// game (they branch on UI.isInGame()), so the same injection as at game setup puts the bar above that screen's
// Select and the button in the civ select's filter row; the build screen itself opens as it does at setup. A
// throttled MutationObserver watches the page the way ui/setup/lshuf-setup.js does, since the screens come and go
// with the transition.

import { injectBuildButton } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-entry.js";

const THROTTLE_MS = 150;
const log = (msg) => console.warn(`[lshuf-game] ${msg}`);

let pending = null;
let lastCivs = "";

// What the game configuration says each player's civilization is, logged whenever it changes while a transition
// screen is up: this says when the engine's picks for the AI leaders become readable (CONTRACTS 20, open point 2).
function logConfigCivs() {
  const screen = document.querySelector(".civ-age-select-body") ? "civ select"
    : document.querySelector(".civ-details-continue-button") ? "civ details" : "";
  if (!screen) return;
  const civs = [];
  for (let i = 0; i < 16; i++) {
    const p = Configuration.getPlayer(i);
    if (p && p.leaderTypeName) civs.push(`${i}:${p.leaderTypeName}:${p.civilizationTypeName}`);
  }
  const line = civs.join(" ");
  if (line === lastCivs) return;
  lastCivs = line;
  log(`${screen} at turn ${Game.turn}: config civs ${line}`);
}

function sweep() {
  pending = null;
  try {
    injectBuildButton();
    logConfigCivs();
  } catch (e) {
    log(`transition sweep failed: ${e}`);
  }
}

function onMutations() {
  if (!pending) pending = setTimeout(sweep, THROTTLE_MS);
}

export function installTransitionButtons() {
  try {
    new MutationObserver(onMutations).observe(document.body, { childList: true, subtree: true });
  } catch (e) {
    log(`transition observer failed: ${e}`);
  }
}
