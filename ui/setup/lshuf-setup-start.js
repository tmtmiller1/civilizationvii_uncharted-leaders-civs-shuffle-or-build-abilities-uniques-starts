// The mod's only startCampaign handler (CONTRACTS sections 3 and 7). Both create-game screens and the multiplayer
// staging screen send startCampaign synchronously just before engine.call("startGame"); in multiplayer the staging
// screen sends it from every player's Ready, so only the host writes keys. Steps run in the contract's order, then
// lshuf-setup-final goes out synchronously with the config, for the display script's own writes.
//
// In a network game the host's Ready comes before the countdown ends, and players can still change leader in
// between. After the host has written the keys once, each PlayerInfoChanged rewrites the keep keys and the
// not-in-game list from the slots as they are then, until setup closes.

import { EVENT, KEY, listValue } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";
import {
  KNOWN_LEADERS, MODDED_LEADER_TYPES
} from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-known-leaders.js";
import { currentSeed } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-params.js";
import {
  isLocalHost, readSlots, readOptions, readPools, planPoolSlots, planRandomSlots, randomChoices, keptLeaders,
  notInGame, anyModdedBoxOn, buildOut, readDealConfigFromSetup, slotsAfterPools, PLAIN_RANDOM
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-config.js";
import { moddedCheckResult } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-mod-check.js";

const log = (msg) => console.warn(`[lshuf-setup] ${msg}`);

// Values this session has written, so a rewrite only touches keys that changed (a write raises PlayerInfoChanged
// on some screens, and an unchanged write mustn't feed it).
const written = new Map();

function setKey(key, value) {
  const text = Array.isArray(value) ? value.join(",") : String(value);
  if (written.get(key) === text) return;
  try {
    Configuration.editGame().setValue(key, value);
    written.set(key, text);
  } catch (e) {
    log(`setValue(${key}) failed: ${e}`);
  }
}

// Gives each slot in the plan its leader. Returns what each planned slot ended up with; a pick the engine refused
// counts as plain Random, and the slot is set back to plain Random so a pool entry can't reach startGame.
function applyPicks(plan, label) {
  const result = new Map();
  for (const [slot, leader] of plan) {
    let r;
    try {
      r = GameSetup.setPlayerParameterValue(slot, "PlayerLeader", leader);
    } catch (e) {
      r = String(e);
    }
    log(`${label} slot ${slot} -> ${leader} (${r})`);
    result.set(slot, leader === PLAIN_RANDOM || r === 0 ? leader : PLAIN_RANDOM);
    if (leader !== PLAIN_RANDOM && r !== 0) {
      try {
        GameSetup.setPlayerParameterValue(slot, "PlayerLeader", PLAIN_RANDOM);
      } catch (_) {
        /* left as it is */
      }
    }
  }
  return result;
}

const randomIndex = (n) => Math.floor(Math.random() * n);

// In a network game a remote human's Random is theirs to resolve; the host picks for AI slots and its own.
function hostMayPick(slot) {
  try {
    const game = Configuration.getGame();
    if (!game || !game.isNetworkMultiplayer || !slot.human) return true;
    return slot.id === GameContext.localPlayerID;
  } catch (_) {
    return !slot.human;
  }
}

// Step 1: "Random from pool N" slots get a leader from their pool, then plain Random slots get one of the leaders
// their own list offers. A slot either step can't fill stays plain Random, and the not-in-game list is left empty.
function resolveSlots(seed) {
  const raw = readSlots();
  // The slots come from the plans, not from a fresh read: leaderTypeName may not show a pick at once, and the
  // preview (readDealConfigFromSetup) works from the same pool plan, so the keys and the preview agree.
  const afterPools = slotsAfterPools(raw, applyPicks(planPoolSlots(raw, readPools(), seed), "pool"));
  const randomPlan = planRandomSlots(afterPools, randomChoices, randomIndex, hostMayPick);
  return slotsAfterPools(afterPools, applyPicks(randomPlan, "random"));
}

// Step 2: LShufKeep_<LEADER>, from each human's final PlayerLeader.
function writeKeepKeys(slots, options) {
  const kept = new Set(keptLeaders(slots, options));
  for (const leader of KNOWN_LEADERS) setKey(KEY.keep(leader), kept.has(leader) ? "1" : "0");
  return [...kept].sort();
}

// Step 3: LShufModOK_<LEADER> (and LShufModWhy_<LEADER> for a failing one), only while a modded box is on.
function writeModKeys(options) {
  if (!anyModdedBoxOn(options)) return [];
  const ok = [];
  for (const leader of MODDED_LEADER_TYPES) {
    const r = moddedCheckResult(leader);
    setKey(KEY.modOK(leader), r.ok ? "1" : "0");
    if (r.ok) ok.push(leader);
    else setKey(KEY.modWhy(leader), String(r.why || "missing"));
  }
  return ok;
}

let hostWrote = false;

// Host: resolve the slots and write every key, then send the config it wrote. Every other machine sends the config
// as it reads now, so its loading screen isn't left on a stale preview. That non-host config is a best effort until
// probe 9 shows when the host's keys arrive on a joining machine.
function writeHostKeys() {
  const seed = currentSeed();
  const options = readOptions();
  const slots = resolveSlots(seed);
  const kept = writeKeepKeys(slots, options);
  const modOK = writeModKeys(options);
  setKey(KEY.NotInGame, notInGame(slots).map(listValue));
  hostWrote = true;
  return { seed, options, kept, out: buildOut(slots), modOK };
}

// A leader change after the host's Ready: the slots as they read now (no new picks), the keys that follow from them.
function onPlayerInfoChanged() {
  if (!hostWrote || !isLocalHost()) return;
  try {
    const slots = readSlots();
    const options = readOptions();
    writeKeepKeys(slots, options);
    setKey(KEY.NotInGame, notInGame(slots).map(listValue));
  } catch (e) {
    log(`rewriting the keys after a lobby change failed: ${e}`);
  }
}

export function onStartCampaign() {
  let config = null;
  try {
    config = isLocalHost() ? writeHostKeys() : readDealConfigFromSetup();
  } catch (e) {
    log(`startCampaign handler failed: ${e}`);
  }
  if (!config) {
    try {
      config = readDealConfigFromSetup();
    } catch (e) {
      log(`reading the setup config failed: ${e}`);
      return;
    }
  }
  window.dispatchEvent(new CustomEvent(EVENT.SetupFinal, { detail: config }));
}

// Setup closed or a game started from it: the next setup writes from scratch.
export function endStartSession() {
  hostWrote = false;
  written.clear();
}

export function installStartHandler() {
  window.addEventListener("startCampaign", onStartCampaign);
  try {
    engine.on("PlayerInfoChanged", onPlayerInfoChanged);
  } catch (e) {
    log(`PlayerInfoChanged listener failed: ${e}`);
  }
}
