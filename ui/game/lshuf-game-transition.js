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
  ageCivs, buildForLeader, buildPicks, isLocalHost, readDealConfigFromSetup, readSlots
} from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-config.js";
import { startAge } from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-params.js";
import { readSetupTable } from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-tables.js";
import { buildDealInput, computeDeal } from "/uncharted-leaders-and-civs/shared/deal/lshuf-deal.js";
import { civDealViews } from "/uncharted-leaders-and-civs/ui/display/lshuf-civ-views.js";
import {
  readCivItemRows, SHIPPED_CIV_ITEMS, shippedCivView, writeCivItemRows
} from "/uncharted-leaders-and-civs/ui/display/lshuf-config-rows.js";

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

// Every builder slot's cards and leader as they stand now (in a game the picks live in the game configuration),
// with each player's civ, which changes once a civ is picked for the next age.
function picksNow() {
  const out = [];
  for (let n = 1; n <= BUILD_SLOTS; n++) out.push(`${buildForLeader(n) || ""}:${buildPicks(n).join("|")}`);
  out.push(readSlots().map((s) => s.civ).join("|"));
  return out.join(",");
}

// The picks as the game loaded; a build made on a transition screen, or a civ picked for the next age, changes them,
// and only then are the deal's builder keys rewritten (with the civilization each player is taking into the next
// age), so the next age's data load applies them. A player who changes neither keeps what setup wrote.
let loadedPicks = null;
function writeTransitionBuilds() {
  if (loadedPicks == null) loadedPicks = picksNow();
  if (!isLocalHost() || picksNow() === loadedPicks) return;
  writeBuildKeys(readSlots());
}

// The next age's civilizations on the transition screens. The running game's deal comes from this age's data, which
// holds only this age's uniques and civics trees, so the next age's civs would show a swapped ability next to their
// own uniques and civics. The setup copy holds every age, so the deal is worked out here the way the setup screen
// does it, for the next age, and written for that age's civs; the next age's data load deals the same from the same
// seed and builds. Nobody plays those civs yet, so they show their deal under either Reveal setting.
let shownFor = null;
let shippedCivs = null;
function showNextAgeCivs() {
  const sign = picksNow();
  if (sign === shownFor) return;
  shownFor = sign;
  const config = readDealConfigFromSetup();
  const deal = computeDeal(buildDealInput(readSetupTable, config));
  if (!shippedCivs) shippedCivs = readCivItemRows(SHIPPED_CIV_ITEMS);
  const views = civDealViews(deal.civPieces || [], shippedCivs);
  const next = ageCivs(startAge());
  let n = 0;
  for (const [civ, own] of shippedCivs) {
    if (next && !next.has(civ)) continue;
    if (writeCivItemRows(civ, views.get(civ) || shippedCivView(own), own)) n += 1;
  }
  log(`next age ${config.age}: wrote ${n} civs from the deal`);
}

function sweep() {
  pending = null;
  try {
    injectBuildButton();
    logConfigCivs();
    if (onTransitionScreen()) {
      writeTransitionBuilds();
      showNextAgeCivs();
    }
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
