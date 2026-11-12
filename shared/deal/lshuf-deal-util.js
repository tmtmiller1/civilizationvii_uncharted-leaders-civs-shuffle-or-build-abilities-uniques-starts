// Fixed numbers and small helpers the deal shares with its SQL twin (scripts/generate/). Every number here is
// baked into the generated SQL too, so changing one means regenerating data/generated/ and bumping DEAL_VERSION.
import { lshufKey } from "../lshuf-key.js";

export const DEAL_VERSION = 15;

// The SQL unrolls each sequential deal to a fixed number of steps; the JS stops at the same count.
export const PIECE_STEP_CAP = 768;
// Cards a civics or uniques pool deals at most (CONTRACTS 21): about 80 civics and 60 uniques in an age.
export const POOL_STEP_CAP = 160;
export const ATTR_STEP_CAP = 512;
// Swap attempts after the attribute pass, one per undealt card.
export const ATTR_REPAIR_CAP = 64;
// Slots still empty after the swaps that take a leftover card even when it repeats a kind the leader holds.
export const ATTR_FILL_CAP = 64;
// BiasTags segments read per mapping row (the SQL splits the string in this many unrolled passes).
export const TAG_SEGMENT_CAP = 16;
// Value of a whole ability whose leader has no bullet rows in the mapping.
export const WHOLE_DEFAULT_VALUE = 5;
// Balanced dealing compares floor(received value * BALANCE_SCALE / slots).
export const BALANCE_SCALE = 100;
// Rolled biases: rank offsets so leader and civ rolls use separate keys; scores step by SCORE_STEP.
export const ROLL_RANK_STRIDE = 4;
export const CIV_ROLL_RANK_BASE = 100000;
export const SCORE_STEP = 5;
// A leader built from bias tags keeps its strongest MAX_TAG_BIASES tags.
export const MAX_TAG_BIASES = 2;
export const LEADER_TYPE_REQUIREMENT = "REQUIREMENT_PLAYER_LEADER_TYPE_MATCHES";
export const ISLAND_TABLE = "StartBiasIslands";

// Plain `<` on strings: the same order as SQLite's BINARY collation for these ids.
export const cmp = (a, b) => {
  if (a < b) return -1;
  return a > b ? 1 : 0;
};
export const sortIds = (ids) => [...new Set(ids)].sort(cmp);
export const floorDiv = (a, b) => Math.floor(a / b);

export function groupBy(rows, keyOf) {
  const out = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(row);
  }
  return out;
}

// ids (sorted, unique) in key order: key = lshufKey(seed, salt, rank in ids), ties by id.
export function keyOrder(seed, salt, ids) {
  return ids
    .map((id, rank) => ({ id, rank, key: lshufKey(seed, salt, rank) }))
    .sort((a, b) => a.key - b.key || cmp(a.id, b.id));
}

export function keyMap(seed, salt, ids) {
  const out = {};
  ids.forEach((id, rank) => {
    out[id] = lshufKey(seed, salt, rank);
  });
  return out;
}

// Each id takes from the next id in key order (a cycle, so nobody keeps its own for two or more ids).
export function cyclicDonors(seed, salt, ids) {
  const order = keyOrder(seed, salt, sortIds(ids));
  const out = {};
  order.forEach((entry, i) => {
    out[entry.id] = order[(i + 1) % order.length].id;
  });
  return out;
}

// Lexicographic compare over [a, b, descending] triples (numbers or strings).
export function compareBy(pairs) {
  for (const [a, b, desc] of pairs) {
    const c = typeof a === "number" && typeof b === "number" ? Math.sign(a - b) : cmp(a, b);
    if (c !== 0) return desc ? -c : c;
  }
  return 0;
}

// The BiasTags segments the SQL reads: segments 1..TAG_SEGMENT_CAP of "|" + value + "|", empty ones dropped.
export function tagSegments(value) {
  if (value == null) return [];
  return `|${value}|`
    .split("|")
    .slice(1, 1 + TAG_SEGMENT_CAP)
    .filter((s) => s.length > 0);
}
