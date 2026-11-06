// Shell UIScripts entry for Re-dealable Leaders' setup side:
// - adds the "Re-dealable Leaders..." button to the Advanced Settings list with a MutationObserver (not by wrapping
//   AdvancedOptionsScreen through ComponentRegistry: Supercolors calls the base screen directly and drops wrappers);
// - gives the deal number a new value each time setup opens, on the host;
// - hides Drongo's start-bias panel and civ badges while a re-deal mode is on (they show the shipped biases);
// - registers the mod's only startCampaign handler.

import { PARAM, MODE, ONOFF, EVENT } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";
import {
  paramValue, rollSeed, setSeed
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-params.js";
import { isLocalHost } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-config.js";
import { startModdedChecks } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-mod-check.js";
import {
  endStartSession, installStartHandler
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-start.js";
import { openSetupWindow } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-window.js";

const OPEN_CLASS = "lshuf-setup__open";
const DRONGO_STYLE_ID = "lshuf-hide-drongo-bias";
const DRONGO_RULE = "#drongos-leader-bias-panel, .drongos-civilization-spawn-bias-overlay { display: none !important; }";
// Screens that mean "setup has just opened": single-player create game and the multiplayer lobby.
const SETUP_SCREENS = "create-game-sp, screen-mp-lobby";
// After the screen appears the game restores the last setup's settings (and Drongo's Random Improvements its own);
// the new deal number goes in after that.
const SEED_DELAY_MS = 800;
const THROTTLE_MS = 400;

const log = (msg) => console.warn(`[lshuf-setup] ${msg}`);

// --- the button ---

function injectButton() {
  const header = document.querySelector(".accordian-header");
  const list = header && header.closest(".accordian") ? header.closest(".accordian").parentElement : null;
  if (!list || list.querySelector(`.${OPEN_CLASS}`)) return;
  const btn = document.createElement("fxs-button");
  btn.classList.add(OPEN_CLASS);
  btn.setAttribute("caption", "LOC_LSHUF_OPEN_BUTTON");
  btn.setAttribute("data-audio-group-ref", "options");
  btn.addEventListener("action-activate", () => {
    try {
      openSetupWindow();
    } catch (e) {
      log(`open window failed: ${e}`);
    }
  });
  list.insertBefore(btn, list.firstChild);
}

// --- a new deal number when setup opens ---

const seenScreens = new WeakSet();

function isNewGameSetup() {
  try {
    return Configuration.getGame().gameState === GameStateTypes.GAMESTATE_PREGAME;
  } catch (_) {
    return true;
  }
}

// One new number per setup session: a rebuilt setup screen keeps the number the player typed. The session ends
// when the game starts or the game creator closes.
let rolledThisSession = false;

function newSeedForSetup() {
  if (rolledThisSession || !isLocalHost() || !isNewGameSetup()) return;
  rolledThisSession = true;
  setSeed(rollSeed());
}

const endSetupSession = () => {
  rolledThisSession = false;
};

function watchSetupScreens() {
  let found = false;
  for (const screen of document.querySelectorAll(SETUP_SCREENS)) {
    if (seenScreens.has(screen)) continue;
    seenScreens.add(screen);
    found = true;
  }
  if (!found) return;
  setTimeout(newSeedForSetup, SEED_DELAY_MS);
  startModdedChecks();
}

// --- Drongo's bias panel ---

// His panel shows the shipped biases: wrong whenever leaders are re-dealt, and when Start biases is Off.
function syncDrongoStyle() {
  const redealt = (paramValue(PARAM.Mode) || MODE.None) !== MODE.None;
  const hide = redealt || paramValue(PARAM.Biases) === ONOFF.Off;
  let style = document.getElementById(DRONGO_STYLE_ID);
  if (hide && !style) {
    style = document.createElement("style");
    style.id = DRONGO_STYLE_ID;
    style.textContent = DRONGO_RULE;
    (document.head || document.body).appendChild(style);
  } else if (!hide && style) {
    style.remove();
  }
}

// --- the observer ---

// Mutations inside Drongo's own elements are his panel redrawing; they never need a response from us.
function isDrongoMutation(record) {
  const t = record.target;
  const node = t && t.nodeType === 1 ? t : t && t.parentElement;
  return !!(node && node.closest && node.closest("[id^='drongos-']"));
}

let pending = 0;

function sweep() {
  pending = 0;
  try {
    injectButton();
    watchSetupScreens();
    syncDrongoStyle();
  } catch (e) {
    log(`sweep failed: ${e}`);
  }
}

function onMutations(records) {
  if (records.every(isDrongoMutation)) return;
  // The button goes in at once, so it's there the first frame the popup draws; the rest can wait a moment.
  try {
    injectButton();
  } catch (e) {
    log(`button failed: ${e}`);
  }
  if (!pending) pending = setTimeout(sweep, THROTTLE_MS);
}

new MutationObserver(onMutations).observe(document.body, { childList: true, subtree: true });
window.addEventListener("game-creator-opened", () => setTimeout(newSeedForSetup, SEED_DELAY_MS));
window.addEventListener(EVENT.SetupChanged, syncDrongoStyle);
window.addEventListener("game-creator-closed", endSetupSession);
window.addEventListener("main-menu-return", endSetupSession);
// The key cache and the lobby rewrite outlive startCampaign: in a network game players can still change leader
// between the host's Ready and the launch.
window.addEventListener("game-creator-closed", endStartSession);
window.addEventListener("main-menu-return", endStartSession);
installStartHandler();
// After the start handler, so this game's handler runs with the session still open.
window.addEventListener("startCampaign", endSetupSession);
startModdedChecks();
