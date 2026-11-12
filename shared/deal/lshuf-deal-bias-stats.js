// The shape of the start-bias rows the deal rolls from (SPEC section 6): how often each table is used, which
// targets it uses, its score range, and how many leaders and civs have one bias or two.
import { BIAS_TABLES, BIAS_TARGET_COLUMN, biasTableOfTag } from "../lshuf-constants.js";
import { SALT, lshufKey } from "../lshuf-key.js";
import {
  CIV_ROLL_RANK_BASE,
  ISLAND_TABLE,
  ROLL_RANK_STRIDE,
  SCORE_STEP,
  cmp,
  floorDiv,
  sortIds
} from "./lshuf-deal-util.js";

const isLeaderRow = (r) => r.LeaderType != null;
const isCivRow = (r) => r.LeaderType == null && r.CivilizationType != null;

function range(scores) {
  return scores.length ? { lo: Math.min(...scores), hi: Math.max(...scores) } : null;
}

function countShape(rows, keyOf) {
  const counts = new Map();
  for (const r of rows) counts.set(keyOf(r), (counts.get(keyOf(r)) || 0) + 1);
  let two = 0;
  for (const c of counts.values()) if (c >= 2) two += 1;
  return { with: counts.size, two };
}

// The table weights, starts and targets of `rows`, in BIAS_TABLES order.
function tableShape(rows) {
  const out = {};
  let start = 0;
  for (const t of BIAS_TABLES) {
    const all = rows.filter((r) => r.TableName === t);
    out[t] = {
      w: all.length,
      start,
      targets: BIAS_TARGET_COLUMN[t] ? sortIds(all.map((r) => r.TargetType).filter((x) => x != null)) : []
    };
    start += all.length;
  }
  return { tables: out, total: start };
}

// Civilizations roll from every row; leaders from the leader rows alone, which are the same in every age, so a
// leader's rolled or logical start terrain doesn't change when the next age loads a different set of civilizations.
export function biasStats(rows, civCount) {
  const every = tableShape(rows);
  const lead = tableShape(rows.filter(isLeaderRow));
  const tables = {};
  for (const t of BIAS_TABLES) {
    const all = rows.filter((r) => r.TableName === t);
    const allRange = range(all.map((r) => r.Score));
    tables[t] = {
      ...every.tables[t],
      lw: lead.tables[t].w,
      lstart: lead.tables[t].start,
      ltargets: lead.tables[t].targets,
      leader: range(all.filter(isLeaderRow).map((r) => r.Score)) || allRange,
      civ: range(all.filter(isCivRow).map((r) => r.Score)) || allRange
    };
  }
  return {
    tables,
    total: every.total,
    leaderTotal: lead.total,
    leaders: countShape(rows.filter(isLeaderRow), (r) => r.LeaderType),
    civs: countShape(rows.filter(isCivRow), (r) => r.CivilizationType),
    civCount
  };
}

function rollCount(seed, stats, base, isCiv) {
  if (!isCiv) {
    const s = stats.leaders;
    if (s.with === 0) return 1;
    return lshufKey(seed, SALT.Biases, base) % s.with < s.two ? 2 : 1;
  }
  const s = stats.civs;
  if (stats.civCount === 0 || s.with === 0) return 0;
  if (lshufKey(seed, SALT.CivBiases, base) % stats.civCount >= s.with) return 0;
  return lshufKey(seed, SALT.Biases, base) % s.with < s.two ? 2 : 1;
}

function rollOne(seed, stats, rank, isCiv) {
  const total = isCiv ? stats.total : stats.leaderTotal;
  const r = lshufKey(seed, SALT.BiasKind, rank) % total;
  const startOf = (t) => (isCiv ? stats.tables[t].start : stats.tables[t].lstart);
  const wOf = (t) => (isCiv ? stats.tables[t].w : stats.tables[t].lw);
  const table = BIAS_TABLES.find((t) => r >= startOf(t) && r < startOf(t) + wOf(t));
  const t = stats.tables[table];
  const targets = isCiv ? t.targets : t.ltargets;
  const target = targets.length ? targets[lshufKey(seed, SALT.BiasTarget, rank) % targets.length] : null;
  const span = isCiv ? t.civ : t.leader;
  const steps = floorDiv(span.hi - span.lo, SCORE_STEP) + 1;
  const score =
    table === ISLAND_TABLE ? span.hi : span.lo + SCORE_STEP * (lshufKey(seed, SALT.BiasScore, rank) % steps);
  return { table, target, score };
}

// Rolled rows for one leader (rank in the bias pool) or one civ (rank in the civ list).
export function rollBiases(seed, stats, rank, isCiv) {
  if ((isCiv ? stats.total : stats.leaderTotal) === 0) return [];
  const base = isCiv ? CIV_ROLL_RANK_BASE + rank * ROLL_RANK_STRIDE : rank * ROLL_RANK_STRIDE;
  const count = rollCount(seed, stats, base, isCiv);
  const out = [];
  for (let j = 0; j < count; j += 1) {
    const b = rollOne(seed, stats, base + j, isCiv);
    if (j === 1 && b.table === out[0].table && b.target === out[0].target) continue;
    out.push(b);
  }
  return out;
}

// Rows built from bias tags: the strongest MAX tags held, scored into the table's leader range by piece value.
export function tagBiases(stats, tagValues, max) {
  const list = [];
  for (const [tag, value] of tagValues) {
    const table = biasTableOfTag(tag);
    if (!table || stats.tables[table].lw === 0) continue;
    list.push({ tag, table, value });
  }
  list.sort((a, b) => b.value - a.value || cmp(a.tag, b.tag));
  return list.slice(0, max).map(({ tag, table, value }) => {
    const span = stats.tables[table].leader;
    const v = Math.min(5, Math.max(1, value));
    const score = table === ISLAND_TABLE ? span.hi : span.lo + floorDiv((span.hi - span.lo) * (v - 1), 4);
    return { table, target: BIAS_TARGET_COLUMN[table] ? tag : null, score };
  });
}
