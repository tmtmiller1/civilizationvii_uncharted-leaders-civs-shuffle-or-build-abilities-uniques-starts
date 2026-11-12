// The Build your own civilization... buttons at an age transition (owner, 2026-11-07). The civilization select and
// civilization details screens a player gets between ages are the shell's own create-game screens run inside the
// game (they branch on UI.isInGame()), so the same injection as at game setup puts the bar above that screen's
// Select and the button in the civ select's filter row; the build screen itself opens as it does at setup. A
// throttled MutationObserver watches the page the way ui/setup/lshuf-setup.js does, since the screens come and go
// with the transition.

import { injectBuildButton } from "/uncharted-leaders-and-civs/ui/setup/lshuf-build-entry.js";
import { writeBuildKeys } from "/uncharted-leaders-and-civs/ui/setup/lshuf-build-keys.js";
import { BUILD_SLOTS } from "/uncharted-leaders-and-civs/shared/lshuf-constants.js";
import {
  buildForLeader, buildPicks, isLocalHost, readSlots
} from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-config.js";

const THROTTLE_MS = 150;
const log = (msg) => console.warn(`[lshuf-game] ${msg}`);

let pending = null;
let lastCivs = "";

// What the game configuration says each player's civilization is, logged whenever it changes while a transition
// screen is up: this says when the engine's picks for the AI leaders become readable (CONTRACTS 20, open point 2).
const onTransitionScreen = () => !!(document.querySelector(".civ-age-select-body")
  || document.querySelector(".civ-details-continue-button"));

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

// Every builder slot's cards and leader as the setup parameters hold them now.
function picksNow() {
  const out = [];
  for (let n = 1; n <= BUILD_SLOTS; n++) out.push(`${buildForLeader(n) || ""}:${buildPicks(n).join("|")}`);
  return out.join(",");
}

// The picks as the game loaded; a build made on a transition screen changes them, and only then are the deal's
// builder keys rewritten (with the civilization each player is taking into the next age), so the next age's data
// load applies them. A player who doesn't build at the transition keeps what setup wrote.
let loadedPicks = null;
function writeTransitionBuilds() {
  if (loadedPicks == null) loadedPicks = picksNow();
  if (!isLocalHost() || picksNow() === loadedPicks) return;
  writeBuildKeys(readSlots());
}

function sweep() {
  pending = null;
  try {
    injectBuildButton();
    logConfigCivs();
    if (onTransitionScreen()) writeTransitionBuilds();
  } catch (e) {
    log(`transition sweep failed: ${e}`);
  }
}

function onMutations() {
  if (!pending) pending = setTimeout(sweep, THROTTLE_MS);
}

export function installTransitionButtons() {
  try {
    loadedPicks = picksNow();
  } catch (e) {
    log(`reading the build picks failed: ${e}`);
  }
  try {
    new MutationObserver(onMutations).observe(document.body, { childList: true, subtree: true });
  } catch (e) {
    log(`transition observer failed: ${e}`);
  }
}
