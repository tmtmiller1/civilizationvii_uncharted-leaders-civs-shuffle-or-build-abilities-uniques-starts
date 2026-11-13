// Who is in each axis's deal (CONTRACTS.md section 5.4), and the flags the mode and switches set.
import { A_MODE, B_MODE, DEALING, MODE, MODE_CUSTOM, ONOFF, PERSONA, PRESETS, REASON, T_MODE } from "../lshuf-constants.js";

// The preset the parts make, for LShufResultMeta.Mode (CONTRACTS 33): the two agenda presets need AI agendas Swap whole
// with abilities and start terrain on Base game; the other presets match on the three parts alone.
const AGENDA_PRESETS = new Set([MODE.AgendasOnly, MODE.AgendasAttributes]);
export function dealMode(a, t, b, persona) {
  if (persona === PERSONA.Redealt && a === A_MODE.Normal && b === B_MODE.Normal) {
    if (t === T_MODE.Normal) return MODE.AgendasOnly;
    if (t === T_MODE.Random) return MODE.AgendasAttributes;
  }
  const hit = Object.entries(PRESETS)
    .find(([m, v]) => !AGENDA_PRESETS.has(m) && v[0] === a && v[1] === t && v[2] === b);
  return hit ? hit[0] : MODE_CUSTOM;
}

export const AXES = ["A", "T", "B"];
export const AXIS_NAME = { A: "ABILITY", T: "ATTRIBUTES", B: "BIASES" };
const MODDED_BOX = { A: "ModdedAbilities", T: "ModdedAttributes", B: "ModdedBiases" };
const OFF_SWITCH = { A: "Abilities", T: "Attributes", B: "Biases" };

// The three parts (CONTRACTS 15): what each does, and the flags the modules branch on. A part that needs the
// abilities dealt a certain way falls back when they aren't: attributes paired with normal or off abilities deal at
// random; start terrain following or paired with them rolls.
export function partFlags(o) {
  const A = o.Abilities;
  const T = o.Attributes;
  const B = o.Biases;
  const isWhole = A === A_MODE.Whole;
  const isSplit = A === A_MODE.Split;
  const bFollows = B === B_MODE.Paired || B === B_MODE.Matched;
  const live = (v, normal) => v !== normal && v !== ONOFF.Off;
  return {
    A, T, B,
    mode: dealMode(A, T, B, o.Personality),
    isWhole,
    isSplit,
    tCycle: T === T_MODE.Paired && isWhole,
    tFromA: T === T_MODE.Paired && isSplit,
    bCycle: bFollows && isWhole,
    bFromA: B === B_MODE.Paired && isSplit,
    isMatched: B === B_MODE.Matched && isSplit,
    rollBiases: B === B_MODE.Rolled || (bFollows && !isWhole && !isSplit),
    normal: { A: A === A_MODE.Normal, T: T === T_MODE.Normal, B: B === B_MODE.Normal },
    active: live(A, A_MODE.Normal) || live(T, T_MODE.Normal) || live(B, B_MODE.Normal)
  };
}

export function makeContext(input) {
  const o = input.options;
  const f = {
    ...partFlags(o),
    balanced: o.Dealing !== DEALING.Chance,
    persona: o.Personality,
    follows: o.Personality !== PERSONA.Stays && o.Personality !== PERSONA.Redealt,
    redealtPersona: o.Personality === PERSONA.Redealt,
    // Agendas shuffle on their own while abilities stay on Base game (CONTRACTS 33).
    agendasAlone: o.Personality === PERSONA.Redealt && o.Abilities === A_MODE.Normal
  };
  const byType = new Map(input.leaders.map((l) => [l.type, l]));
  return { input, seed: input.seed, f, byType, majors: input.leaders.map((l) => l.type) };
}

export function baseReason(l) {
  if (!l.known) return REASON.Unknown;
  if (l.kept) return REASON.Kept;
  if (l.outReason != null) return l.outReason;
  if (l.mods.length === 0 && l.attrs.length === 0) return REASON.Observer;
  if (l.modded && !l.modOK) return REASON.ModdedNotOK;
  if (l.modded && l.leaderTypeReq) return REASON.ModdedLeaderType;
  return null;
}

function axisState(ctx, axis) {
  const o = ctx.input.options;
  const reason = {};
  const eligible = [];
  for (const l of ctx.input.leaders) {
    const base = baseReason(l);
    const r = base || (l.modded && o[MODDED_BOX[axis]] !== "1" ? REASON.ModdedOff : null);
    reason[l.type] = r;
    if (r == null) eligible.push(l.type);
  }
  const off = o[OFF_SWITCH[axis]] === ONOFF.Off;
  const eligibleSet = new Set(eligible);
  const state = { axis, off, reason, eligible, eligibleSet, dealt: [], level: null, fallback: false };
  if (off) return state;
  if (!ctx.f.active || ctx.f.normal[axis]) state.level = REASON.ModeNone;
  else if (eligible.length < 2) {
    state.level = REASON.TooFew;
    state.fallback = true;
  } else state.dealt = eligible;
  state.dealtSet = new Set(state.dealt);
  return state;
}

export function computeAxes(ctx) {
  const axes = {};
  for (const axis of AXES) {
    axes[axis] = axisState(ctx, axis);
    axes[axis].dealtSet = new Set(axes[axis].dealt);
  }
  return axes;
}

// Switched off for this leader: the axis is Off and the leader would have been in its pool.
export const isOffFor = (state, leader) => state.off && state.eligibleSet.has(leader);

// Why a leader isn't dealt in an axis (null when dealt, or when the axis is switched off for it).
export function axisReasonFor(state, leader) {
  if (state.dealtSet.has(leader) || isOffFor(state, leader)) return null;
  return state.reason[leader] || state.level;
}
