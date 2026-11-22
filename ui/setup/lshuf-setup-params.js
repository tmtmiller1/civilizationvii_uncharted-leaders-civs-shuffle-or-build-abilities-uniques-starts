// Reading and writing the mod's setup parameters through GameSetup, shell scope. Every option is a Hidden = 1
// parameter (data/frontend/parameters.sql), so only the mod's window shows them.
//
// The build screens also open at an age transition, inside the game. There GameSetup keeps the values the game
// started with and turns every write down (result 8, value unchanged; lab game 2026-11-21), so the mod's own
// single values are read and written through the game configuration instead, under the same key.

import { AGE_ORDER, PARAM, SEED_MIN, SEED_MAX, EVENT } from "/uncharted-leaders-and-civs/shared/lshuf-constants.js";

const log = (msg) => console.warn(`[lshuf-setup] ${msg}`);

export function inGame() {
  try {
    return typeof UI !== "undefined" && !!UI.isInGame();
  } catch (_) {
    return false;
  }
}

const ownParam = (paramId) => String(paramId).startsWith("LShuf");

// What can change at an age transition: the build cards and which AI leader a builder slot builds for. The
// settings themselves stay as the game started; the next age's data load reads them, and a change there would
// apply half a setup.
const EMPTY_LIST = "|";

const transitionParam = (paramId) => /^LShufBuild(Picks|For)\d*$/.test(String(paramId));

// The game configuration's value for one of the mod's own keys in a running game; null outside a game, for a key
// that isn't the mod's, or when the configuration has no value for it.
function configValue(paramId) {
  if (!ownParam(paramId) || !inGame()) return null;
  try {
    const v = Configuration.getGame().getValue(paramId);
    return v === undefined || v === null ? null : v;
  } catch (_) {
    return null;
  }
}

export function findParam(paramId) {
  try {
    return GameSetup.findGameParameter(paramId) || null;
  } catch (e) {
    log(`findGameParameter(${paramId}) failed: ${e}`);
    return null;
  }
}

// A single-value parameter's value, as a string ("" when it has none).
export function paramValue(paramId) {
  const c = configValue(paramId);
  if (c !== null) return String(c);
  const p = findParam(paramId);
  const v = p && p.value ? p.value.value : undefined;
  return v === undefined || v === null ? "" : String(v);
}

export function paramBool(paramId) {
  const v = paramValue(paramId);
  return v === "1" || v === "true";
}

// You follow the AI players (CONTRACTS 34) while Your leader and Your civilization are both Same as the AI players
// (or unset, as in a setup from before the rows existed). The hidden LShufHumanFollows, which the deal reads, is
// written from this by the preset watch (ui/setup/lshuf-presets.js).
export function humanFollows() {
  const same = (v, sameValue) => v == null || v === "" || v === sameValue;
  return same(paramValue("LShufHumanMode"), "LSHUF_MODE_SAME") && same(paramValue("LShufHumanCivMode"), "LSHUF_CM_SAME");
}

// The stored LShufHumanFollows value, ticked unless it says otherwise (a setup from before CONTRACTS 33 follows).
export function storedHumanFollows() {
  const v = paramValue("LShufHumanFollows");
  return v == null || v === "" || v === "1" || v === "true";
}

// An array parameter's stored values, as strings.
export function paramValues(paramId) {
  const p = findParam(paramId);
  const list = p && Array.isArray(p.values) ? p.values : [];
  const out = [];
  for (const v of list) {
    const raw = v && typeof v === "object" ? v.value : v;
    if (raw !== undefined && raw !== null) out.push(String(raw));
  }
  return out;
}

function resolveName(handle) {
  try {
    const key = typeof handle === "string" ? handle : GameSetup.resolveString(handle);
    return key ? Locale.compose(key) : "";
  } catch (_) {
    return "";
  }
}

// The parameter's domain values, in domain order: [{ value, name, description }], names composed.
export function paramChoices(paramId) {
  const p = findParam(paramId);
  const list = p && p.domain && p.domain.possibleValues ? p.domain.possibleValues : [];
  const out = [];
  for (const pv of list) {
    out.push({ value: String(pv.value), name: resolveName(pv.name), description: resolveName(pv.description) });
  }
  return out;
}

export function paramReadOnly(paramId) {
  if (inGame() && !transitionParam(paramId)) return true;
  const p = findParam(paramId);
  return !!(p && p.readOnly);
}

// The game's own start age row (Advanced Settings "Age").
export const START_AGE_PARAM = "Age";

// The ages in the game's order: the Age row's own sort order, as the game's age select sorts them, or AGE_ORDER.
function sortedAges() {
  const p = findParam(START_AGE_PARAM);
  const list = p && p.domain && p.domain.possibleValues ? [...p.domain.possibleValues] : [];
  const out = list.sort((a, b) => (a.sortIndex || 0) - (b.sortIndex || 0)).map((v) => String(v.value)).filter(Boolean);
  return out.length ? out : AGE_ORDER;
}

// The age being played in a running game, from Game.age; "" when it can't be read.
function playedAge() {
  try {
    const row = GameInfo.Ages.lookup(Game.age);
    return row && row.AgeType ? String(row.AgeType) : "";
  } catch (_) {
    return "";
  }
}

// The age after this one, the way the game's own transition screen picks it (the last age stays itself).
export function nextAge(age, ages = AGE_ORDER) {
  const i = ages.indexOf(age);
  if (i < 0) return age;
  return ages[Math.min(i + 1, ages.length - 1)];
}

// The age the builds are for ("" when it can't be read): at setup the age the game starts in; in a running game
// (the age transition screens) the age that comes next, since the Age row still names the one being left. A
// civilization picked from another age plays in this one (Test of Time), so the build screens and the deal take a
// builder's civ as a civ of this age.
export function startAge() {
  if (inGame()) {
    const now = playedAge() || paramValue(START_AGE_PARAM);
    return now ? nextAge(now, sortedAges()) : "";
  }
  return paramValue(START_AGE_PARAM);
}

const REFUSED_ONCE = 5;

// In a running game the build values go to the game configuration (GameSetup refuses them there); every other
// setting stays as the game started.
function setInGame(paramId, value) {
  if (!transitionParam(paramId)) {
    log(`${paramId} can't change in a running game`);
    return -1;
  }
  try {
    // The configuration keeps no empty value (it reads back as no value, and the reader would fall back to the
    // setup's), so an empty list goes in as a lone "|", which the list readers take as no entries (lab 2026-11-21).
    const stored = value === "" || value === null || value === undefined ? EMPTY_LIST : value;
    Configuration.editGame().setValue(paramId, stored);
    window.dispatchEvent(new CustomEvent(EVENT.SetupChanged, { detail: { paramId } }));
    return 0;
  } catch (e) {
    log(`setValue(${paramId}) failed: ${e}`);
    return -1;
  }
}

export function setParam(paramId, value) {
  if (inGame()) return setInGame(paramId, value);
  try {
    let r = GameSetup.setGameParameterValue(paramId, value);
    // The game turns down every second write to the mod's options that comes in a later task than the one before
    // (result 5, value unchanged); the same write sent again goes through. Watched 2026-11-07 on LShufBiases.
    if (r === REFUSED_ONCE) r = GameSetup.setGameParameterValue(paramId, value);
    window.dispatchEvent(new CustomEvent(EVENT.SetupChanged, { detail: { paramId } }));
    return r;
  } catch (e) {
    log(`setGameParameterValue(${paramId}) failed: ${e}`);
    return -1;
  }
}

// The deal number: an integer SEED_MIN..SEED_MAX, or null for anything else.
export function parseSeed(text) {
  const s = String(text === undefined || text === null ? "" : text).trim();
  if (!/^\d{1,3}$/.test(s)) return null;
  const n = Number(s);
  return n >= SEED_MIN && n <= SEED_MAX ? n : null;
}

export function currentSeed() {
  const n = parseSeed(paramValue(PARAM.Seed));
  return n === null ? SEED_MIN : n;
}

// A new deal number, different from the current one. Math.random is fine here: the number is picked once in the
// shell and then travels as a setup value, so every machine reads the same one.
export function rollSeed() {
  const old = currentSeed();
  let n = old;
  for (let i = 0; i < 8 && n === old; i++) n = SEED_MIN + Math.floor(Math.random() * (SEED_MAX - SEED_MIN + 1));
  return n;
}

export function setSeed(n) {
  return setParam(PARAM.Seed, String(n));
}
