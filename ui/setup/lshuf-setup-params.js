// Reading and writing the mod's setup parameters through GameSetup, shell scope. Every option is a Hidden = 1
// parameter (data/frontend/parameters.sql), so only the mod's window shows them.

import { PARAM, SEED_MIN, SEED_MAX, EVENT } from "/uncharted-leaders-and-civs/shared/lshuf-constants.js";

const log = (msg) => console.warn(`[lshuf-setup] ${msg}`);

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
  const p = findParam(paramId);
  const v = p && p.value ? p.value.value : undefined;
  return v === undefined || v === null ? "" : String(v);
}

export function paramBool(paramId) {
  const v = paramValue(paramId);
  return v === "1" || v === "true";
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
  const p = findParam(paramId);
  return !!(p && p.readOnly);
}

// The game's own start age row (Advanced Settings "Age").
export const START_AGE_PARAM = "Age";

// The age the game starts in ("" when it can't be read). A civilization picked from another age plays in this one
// (Test of Time), so the build screens and the deal take a builder's civ as a civ of this age.
export function startAge() {
  return paramValue(START_AGE_PARAM);
}

const REFUSED_ONCE = 5;

export function setParam(paramId, value) {
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
