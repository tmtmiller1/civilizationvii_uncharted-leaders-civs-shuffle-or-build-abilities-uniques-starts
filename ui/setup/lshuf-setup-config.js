// The deal config as the setup stands now (CONTRACTS sections 3, 5.2 and 7), shell scope. The startCampaign handler
// writes the game config keys from the same functions, so the preview and the game read the same leaders.

import {
  PARAM, OPTION_DEFAULTS, RANDOM_POOL, REASON, BUILD_SLOTS, fromListValue
} from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";
import {
  KNOWN_LEADERS, MODDED_LEADER_TYPES
} from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-known-leaders.js";
import { lshufKey, SALT } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-key.js";
import {
  paramValue, paramBool, paramValues, paramChoices, currentSeed
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-params.js";
import { moddedCheckResult } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-mod-check.js";

export const PLAIN_RANDOM = "RANDOM";

// The host in a network game; anyone in single player and hotseat.
export function isLocalHost() {
  try {
    const game = Configuration.getGame();
    if (!game || !game.isNetworkMultiplayer) return true;
    if (typeof Network.isHost === "function") return !!Network.isHost();
    return Network.getHostPlayerId() === GameContext.localPlayerID;
  } catch (_) {
    return true;
  }
}

// The slots in the game: [{ id, human, leader }].
export function readSlots() {
  const out = [];
  let ids = [];
  try {
    ids = [...(Configuration.getGame().participatingPlayerIDs || [])];
  } catch (_) {
    ids = [];
  }
  for (const id of ids) {
    const p = Configuration.getPlayer(id);
    if (!p) continue;
    out.push({
      id,
      human: !!p.isHuman,
      leader: String(p.leaderTypeName || PLAIN_RANDOM),
      civ: String(p.civilizationTypeName || PLAIN_RANDOM)
    });
  }
  return out;
}

const BOOL_OPTIONS = new Set(["KeepMine", "ModdedAbilities", "ModdedAttributes", "ModdedBiases"]);

export function readOptions() {
  const options = {};
  for (const name of Object.keys(OPTION_DEFAULTS)) {
    if (BOOL_OPTIONS.has(name)) {
      options[name] = paramBool(PARAM[name]) ? "1" : "0";
    } else {
      options[name] = paramValue(PARAM[name]) || OPTION_DEFAULTS[name];
    }
  }
  return options;
}

export const anyModdedBoxOn = (options) =>
  options.ModdedAbilities === "1" || options.ModdedAttributes === "1" || options.ModdedBiases === "1";

// A pool's leaders: the stored list, kept to leaders the domain still offers, sorted by id (BINARY order).
export function poolLeaders(paramId) {
  const offered = new Set(paramChoices(paramId).map((c) => c.value));
  const stored = paramValues(paramId).filter((l) => offered.has(l));
  return [...new Set(stored)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

// A pool's leaders in draw order for a seed: by lshufKey(seed, SALT.Pools, rank), ties by id.
export function poolDrawOrder(sortedLeaders, seed) {
  const keyed = sortedLeaders.map((leader, rank) => ({ leader, key: lshufKey(seed, SALT.Pools, rank) }));
  keyed.sort((a, b) => a.key - b.key || (a.leader < b.leader ? -1 : a.leader > b.leader ? 1 : 0));
  return keyed.map((k) => k.leader);
}

// What each pool slot gets: Map slotId -> leader, or PLAIN_RANDOM for an empty or used-up pool. Slots are filled in
// id order; a leader already in a slot, or given to an earlier pool slot, is skipped. Pure apart from its inputs.
export function planPoolSlots(slots, pools, seed) {
  const plan = new Map();
  const taken = new Set(slots.map((s) => s.leader));
  const order = { [RANDOM_POOL[1]]: poolDrawOrder(pools[1] || [], seed) };
  const sorted = [...slots].sort((a, b) => a.id - b.id);
  for (const slot of sorted) {
    const list = order[slot.leader];
    if (!list) continue;
    const pick = list.find((l) => !taken.has(l));
    if (pick) taken.add(pick);
    plan.set(slot.id, pick || PLAIN_RANDOM);
  }
  return plan;
}

export function readPools() {
  return { 1: poolLeaders(PARAM.Pool1) };
}

const NOT_A_LEADER = new Set([PLAIN_RANDOM, RANDOM_POOL[1]]);

// The leaders a slot's own leader list offers as a valid pick (owned and unlocked), in domain order: the same test
// the game's leader list uses to grey a leader out. Random and the pool entries are left out.
const validReason = () =>
  typeof GameSetupDomainValueInvalidReason === "object" ? GameSetupDomainValueInvalidReason.Valid : 0;

function possibleValues(slotId, paramName) {
  const p = GameSetup.findPlayerParameter(slotId, paramName);
  return p && p.domain && p.domain.possibleValues ? p.domain.possibleValues : [];
}

export function randomChoices(slotId, paramName = "PlayerLeader") {
  try {
    const valid = validReason();
    const out = [];
    for (const v of possibleValues(slotId, paramName)) {
      const id = v && v.value != null ? String(v.value) : "";
      if (id && !NOT_A_LEADER.has(id) && v.invalidReason === valid) out.push(id);
    }
    return out;
  } catch (_) {
    return [];
  }
}

// What each plain Random slot gets, so every slot names a leader before the keys are written (the engine would pick
// these itself only after startCampaign). Slots go in id order; a leader already in a slot or given to an earlier
// slot is skipped. canPick(slot) leaves a slot to the engine; choicesOf(slotId) lists its leaders; pickIndex(n)
// returns 0..n-1. A slot with nothing left to pick stays plain Random. Pure apart from its inputs.
export function planRandomSlots(slots, choicesOf, pickIndex, canPick = () => true) {
  const plan = new Map();
  const taken = new Set(slots.map((s) => s.leader));
  const sorted = [...slots].sort((a, b) => a.id - b.id);
  for (const slot of sorted) {
    if (slot.leader !== PLAIN_RANDOM || !canPick(slot)) continue;
    const open = choicesOf(slot.id).filter((l) => !taken.has(l));
    if (!open.length) continue;
    const pick = open[Math.min(open.length - 1, Math.max(0, pickIndex(open.length)))];
    taken.add(pick);
    plan.set(slot.id, pick);
  }
  return plan;
}

// A civilization slot's valid choices (owned and unlocked), from its own PlayerCivilization list.
export const civChoices = (slotId) => randomChoices(slotId, "PlayerCivilization");

// The civilizations switched off in "Civilizations in the game", as a Set of CIVILIZATION_X.
export function civsSwitchedOff() {
  return new Set(paramValues(PARAM.CivsOut).map(fromListValue));
}

// What each plain Random civilization slot gets: a civ its own list offers, not switched off, not in another slot.
// Slots go in id order; a slot with nothing allowed left stays Random. A civ picked by hand is left as it is.
// choicesOf(slotId) lists the slot's civs; off is a Set of switched-off civs; pickIndex and canPick as above.
export function planRandomCivSlots(slots, choicesOf, off, pickIndex, canPick = () => true) {
  const plan = new Map();
  const taken = new Set(slots.map((s) => s.civ).filter((c) => c && c !== PLAIN_RANDOM));
  const sorted = [...slots].sort((a, b) => a.id - b.id);
  for (const slot of sorted) {
    if ((slot.civ || PLAIN_RANDOM) !== PLAIN_RANDOM || !canPick(slot)) continue;
    const open = choicesOf(slot.id).filter((c) => !taken.has(c) && !off.has(c));
    if (!open.length) continue;
    const pick = open[Math.min(open.length - 1, Math.max(0, pickIndex(open.length)))];
    taken.add(pick);
    plan.set(slot.id, pick);
  }
  return plan;
}

// The slots after the pool slots resolve, for the config.
export function slotsAfterPools(slots, plan) {
  return slots.map((s) => (plan.has(s.id) ? { ...s, leader: plan.get(s.id) } : s));
}

// Kept leaders: each human's leader when Keep my leader is on, known leaders only (only they have keep groups).
export function keptLeaders(slots, options) {
  if (options.KeepMine !== "1") return [];
  const known = new Set(KNOWN_LEADERS);
  return [...new Set(slots.filter((s) => s.human && known.has(s.leader)).map((s) => s.leader))].sort();
}

// LShufNotInGame: known leaders in no slot; empty when any slot is still plain Random (CONTRACTS section 12).
export function notInGame(slots) {
  if (slots.some((s) => !s.leader || s.leader === PLAIN_RANDOM)) return [];
  const inGame = new Set(slots.map((s) => s.leader));
  return KNOWN_LEADERS.filter((l) => !inGame.has(l));
}

// modOK: listed modded leaders that pass the live check, only while a modded box is on.
export function modOKLeaders(options) {
  if (!anyModdedBoxOn(options)) return [];
  return MODDED_LEADER_TYPES.filter((l) => moddedCheckResult(l).ok);
}

export function buildOut(slots) {
  const out = [];
  for (const v of paramValues(PARAM.LeadersOut)) out.push({ LeaderType: fromListValue(v), Reason: REASON.List });
  for (const v of paramValues(PARAM.ModdedOut)) out.push({ LeaderType: fromListValue(v), Reason: REASON.ModdedList });
  for (const l of notInGame(slots)) out.push({ LeaderType: l, Reason: REASON.NotInGame });
  return out;
}

// Builder slot n's hidden parameters (CONTRACTS 13): its picks, and for n > 1 the AI leader it builds.
export const buildPicksParam = (n = 1) => (n === 1 ? PARAM.BuildPicks : `${PARAM.BuildPicks}${n}`);
export const buildForParam = (n) => `LShufBuildFor${n}`;

// The card ids a build screen stored for slot n ("|id|id|"), unique, in order.
export function buildPicks(n = 1) {
  const raw = paramValue(buildPicksParam(n));
  const ids = raw ? String(raw).split("|").filter(Boolean) : [];
  return [...new Set(ids)];
}

// The leader slot n builds: the local player for slot 1, else the leader LShufBuildFor<n> names ("|LEADER_X|").
export function buildForLeader(n) {
  if (n === 1) return null;
  const raw = paramValue(buildForParam(n));
  const ids = raw ? String(raw).split("|").filter(Boolean) : [];
  return ids.length ? ids[0] : null;
}

const realLeader = (slot) => !!(slot && slot.leader && slot.leader !== PLAIN_RANDOM && !NOT_A_LEADER.has(slot.leader));

// Build your own leader (CONTRACTS 13): builder slot n as a deal builder { slot, leader, civ, pieces }, or null.
// Slot 1 is the local player's slot; slot n > 1 is the AI slot whose leader LShufBuildFor<n> names, if that leader
// is in the game as an AI. Null without picks, or while the slot is still Random.
export function builderFromSetup(slots, n = 1, picks = buildPicks(n)) {
  if (!picks.length) return null;
  let slot = null;
  if (n === 1) {
    let id = -1;
    try {
      id = GameContext.localPlayerID;
    } catch (_) {
      return null;
    }
    slot = slots.find((s) => s.id === id);
  } else {
    const leader = buildForLeader(n);
    slot = leader ? slots.find((s) => !s.human && s.leader === leader) : null;
  }
  if (!realLeader(slot)) return null;
  const civ = slot.civ && slot.civ !== PLAIN_RANDOM ? slot.civ : null;
  return { slot: n, leader: slot.leader, civ, pieces: picks };
}

// Every builder slot that resolves, in slot order.
export function buildersFromSetup(slots) {
  const out = [];
  for (let n = 1; n <= BUILD_SLOTS; n++) {
    const b = builderFromSetup(slots, n);
    if (b) out.push(b);
  }
  return out;
}

// The config object of CONTRACTS 5.2: { seed, options, kept, out, modOK, builders }.
export function readDealConfigFromSetup() {
  const seed = currentSeed();
  const options = readOptions();
  const raw = readSlots();
  const slots = slotsAfterPools(raw, planPoolSlots(raw, readPools(), seed));
  return {
    seed,
    options,
    kept: keptLeaders(slots, options),
    out: buildOut(slots),
    modOK: modOKLeaders(options),
    builders: buildersFromSetup(slots)
  };
}
