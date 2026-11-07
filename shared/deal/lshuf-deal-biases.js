// The start-bias axis: moved with the package (Swap whole leaders), rolled from the shape of the shipped rows
// (Swap whole abilities, Split abilities with random starts), or built from the bias tags of the pieces a leader
// holds (Split abilities, matched starts). Civ biases are shuffled among civs of the same age or rolled.
import { BIAS_TARGET_COLUMN, GENERIC_BIASES, biasTableOfTag } from "../lshuf-constants.js";
import { SALT } from "../lshuf-key.js";
import { MAX_TAG_BIASES, cyclicDonors, groupBy, tagSegments } from "./lshuf-deal-util.js";
import { biasStats, rollBiases, tagBiases } from "./lshuf-deal-bias-stats.js";
import { buildsFor } from "./lshuf-deal-build.js";

const isLeaderRow = (r) => r.LeaderType != null;
const isCivRow = (r) => r.LeaderType == null && r.CivilizationType != null;

const out = (r, origin) => ({
  TableName: r.TableName,
  LeaderType: r.LeaderType,
  CivilizationType: r.CivilizationType,
  TargetType: r.TargetType,
  Score: r.Score,
  Origin: origin
});
const newRow = (b, leader, civ, origin) =>
  out({ TableName: b.table, LeaderType: leader, CivilizationType: civ, TargetType: b.target, Score: b.score }, origin);

// The mapping bullet rows behind the pieces a leader holds (its own rows when its ability wasn't dealt in pieces).
function heldBulletRows(ctx, ability, x) {
  const mapping = ctx.input.mapping;
  const bullets = (leader) => (mapping[leader] || []).filter((r) => r.Kind === "bullet");
  const held = ability.held[x];
  if (!ctx.f.isSplit || !held) return bullets(x);
  const rows = [];
  for (const p of held) {
    if (p.kind === "whole") rows.push(...bullets(p.from));
    else if (p.kind === "remainder") rows.push(...bullets(p.from).filter((r) => r.Movable !== 1));
    else rows.push(...bullets(p.from).filter((r) => r.PieceId === p.id));
  }
  return rows;
}

function tagRows(ctx, ability, stats, x) {
  const values = new Map();
  for (const r of heldBulletRows(ctx, ability, x)) {
    for (const tag of tagSegments(r.BiasTags)) {
      values.set(tag, values.has(tag) ? Math.max(values.get(tag), r.Value) : r.Value);
    }
  }
  return tagBiases(stats, values, MAX_TAG_BIASES);
}

// Leaders whose start terrain comes whole from one leader: a builder's card (CONTRACTS 13), the cycle (paired
// with whole abilities), or the leader it got the most pieces from (paired with split abilities). Returns a
// function giving that leader, or undefined when the leader's terrain is made another way.
function fixedSources(ctx, B, ability, donors) {
  const biasPick = new Map(buildsFor(ctx, B).filter((b) => b.bias != null).map((b) => [b.leader, b.bias]));
  return (x) => {
    if (biasPick.has(x)) return biasPick.get(x);
    // A generic card is made in dealLeaders, ahead of the cycle and the ability's leader.
    if (genericOf(ctx, B).has(x)) return undefined;
    if (ctx.f.bCycle) return donors[x];
    if (ctx.f.bFromA) return ability.abilityFrom[x] || x;
    return undefined;
  };
}

let genericCache = null;
function genericOf(ctx, B) {
  if (!genericCache || genericCache.ctx !== ctx) {
    const map = new Map(buildsFor(ctx, B).filter((b) => b.bias == null && b.genericBias != null)
      .map((b) => [b.leader, b.genericBias]));
    genericCache = { ctx, map };
  }
  return genericCache.map;
}

function dealLeaders(ctx, B, ability, stats, res) {
  const rowsOf = groupBy(ctx.input.biasRows.filter(isLeaderRow), (r) => r.LeaderType);
  const donors = ctx.f.bCycle ? cyclicDonors(ctx.seed, SALT.Leaders, B.dealt) : {};
  const fixed = fixedSources(ctx, B, ability, donors);
  B.dealt.forEach((x, rank) => {
    const from = fixed(x);
    if (from !== undefined) {
      res.biasFrom[x] = from;
      for (const r of rowsOf.get(from) || []) res.rows.push(out({ ...r, LeaderType: x }, "moved"));
      return;
    }
    if (genericOf(ctx, B).has(x)) {
      const tag = genericOf(ctx, B).get(x);
      const table = biasTableOfTag(tag);
      const score = GENERIC_BIASES.find(([t]) => t === tag)[1];
      res.biasFrom[x] = null;
      res.rows.push(newRow({ table, target: BIAS_TARGET_COLUMN[table] ? tag : null, score }, x, null, "moved"));
      return;
    }
    res.biasFrom[x] = null;
    const made = ctx.f.rollBiases ? rollBiases(ctx.seed, stats, rank, false) : tagRows(ctx, ability, stats, x);
    for (const b of made) res.rows.push(newRow(b, x, null, ctx.f.rollBiases ? "rolled" : "tags"));
  });
}

function dealCivs(ctx, stats, res) {
  const civs = ctx.input.civs;
  if (ctx.f.rollBiases) {
    civs.forEach((c, rank) => {
      for (const b of rollBiases(ctx.seed, stats, rank, true)) res.rows.push(newRow(b, null, c.type, "rolled"));
    });
    return;
  }
  const rowsOf = groupBy(ctx.input.biasRows.filter(isCivRow), (r) => r.CivilizationType);
  for (const group of groupBy(civs, (c) => c.age).values()) {
    const ids = group.map((c) => c.type);
    const donors = ids.length >= 2 ? cyclicDonors(ctx.seed, SALT.CivBiases, ids) : {};
    for (const c of ids) {
      const from = donors[c] || c;
      for (const r of rowsOf.get(from) || []) res.rows.push(out({ ...r, CivilizationType: c }, from === c ? "shipped" : "moved"));
    }
  }
}

export function dealBiases(ctx, axes, ability) {
  const B = axes.B;
  const stats = biasStats(ctx.input.biasRows, ctx.input.civs.length);
  const civActive = B.dealt.length > 0;
  const legacy = new Set(ctx.input.civs.map((c) => c.type));
  const replaced = new Set(B.off ? B.eligible : B.dealt);
  const dropped = (r) => {
    if (isLeaderRow(r)) return replaced.has(r.LeaderType);
    return B.off || (civActive && legacy.has(r.CivilizationType));
  };
  const res = { rows: ctx.input.biasRows.filter((r) => !dropped(r)).map((r) => out(r, "shipped")), biasFrom: {} };
  if (civActive) {
    dealLeaders(ctx, B, ability, stats, res);
    dealCivs(ctx, stats, res);
    civBuild(ctx, B, res);
  }
  return res;
}

// The builder's civilization start terrain card (CONTRACTS 13): its civ, when picked by hand, gets that
// civilization's shipped rows (moved) in place of whatever the civ shuffle gave it. Ignored without a civ, and when
// the card's civilization has no rows in this game.
function civBuild(ctx, B, res) {
  for (const build of buildsFor(ctx, B)) {
    if (build.civ == null || build.civBias == null) continue;
    const source = ctx.input.biasRows.filter((r) => isCivRow(r) && r.CivilizationType === build.civBias);
    if (!source.length) continue;
    res.rows = res.rows.filter((r) => !(isCivRow(r) && r.CivilizationType === build.civ));
    for (const r of source) res.rows.push(out({ ...r, CivilizationType: build.civ }, "moved"));
  }
}
