// You on your own (CONTRACTS 33): with HumanFollows "0" the host builder (slot 1) is out of every leader axis pool as
// if kept, so the AI players deal among themselves under the AI rows, and the builder's cards are laid on top as
// copies whatever those rows say: a part with no card keeps the builder's own. The SQL twin is the Own columns in
// scripts/generate/sql-prepare.mjs and the Own branches of sql-biases.mjs, sql-results.mjs and sql-apply.mjs.
import { BIAS_TARGET_COLUMN, GENERIC_BIASES, REASON, STATUS, TRAIT, biasTableOfTag, pieceId } from "../lshuf-constants.js";
import { AXIS_NAME, baseReason } from "./lshuf-deal-axes.js";
import { cmp, compareBy, sortIds } from "./lshuf-deal-util.js";

const BULLET_OWNER = /__B\d+$/;

// The host builder plays its own mode: HumanFollows "0", a slot-1 builder, and its leader in the game with nothing
// against it (not kept, not left out, known, not an observer).
export function ownOf(input) {
  if (((input.options || {}).HumanFollows || "1") !== "0") return null;
  const b = (input.builders || []).find((x) => x.slot === 1);
  if (!b) return null;
  const l = input.leaders.find((x) => x.type === b.leader);
  if (!l || baseReason(l) != null) return null;
  return { leader: b.leader, civ: b.civ || null };
}

// The input the AI players' deal runs on: the builder kept out of every pool.
export function keepOwn(input, own) {
  if (!own) return input;
  return { ...input, leaders: input.leaders.map((l) => (l.type === own.leader ? { ...l, kept: true } : l)) };
}

// The builder's civilization while it's one of the game's civilizations: kept out of the civilization start terrain
// shuffle (lshuf-deal-biases.js).
export function ownCivOf(ctx) {
  const civ = ctx.own && ctx.own.civ;
  return civ && ctx.input.civs.some((c) => c.type === civ) ? civ : null;
}

// The builder's cards that do something: wholes of leaders with an ability, bullets the mapping lists.
function ownCards(ctx) {
  const b = (ctx.builds || []).find((x) => x.own && x.ok);
  if (!b) return null;
  const wholes = b.wholes.filter((y) => !!(ctx.byType.get(y) || {}).ability);
  const bullets = [];
  for (const id of b.bullets) {
    const from = id.replace(BULLET_OWNER, "");
    const row = (ctx.input.mapping[from] || []).find((r) => r.PieceId === id && r.Kind === "bullet");
    if (ctx.byType.has(from) && row) bullets.push({ id, from, index: Number(row.BulletIndex) || 0 });
  }
  return { b, wholes, bullets, ability: wholes.length > 0 || bullets.length > 0 };
}

function abilityFrom(own, cards) {
  if (cards.wholes.length) return cards.wholes[0];
  const counts = new Map();
  for (const p of cards.bullets) counts.set(p.from, (counts.get(p.from) || 0) + 1);
  let best = null;
  for (const [from, c] of counts) {
    if (best == null || c > best[1] || (c === best[1] && cmp(from, best[0]) < 0)) best = [from, c];
  }
  return best ? best[0] : own;
}

function leaderRow(row, own, cards) {
  const { b } = cards;
  const bias = b.bias != null || b.genericBias != null;
  const axes = [cards.ability && AXIS_NAME.A, b.attrs.length && AXIS_NAME.T, bias && AXIS_NAME.B].filter(Boolean);
  return {
    ...row,
    Status: axes.length ? STATUS.Dealt : STATUS.AsShipped,
    Axes: axes.length ? `|${axes.join("|")}|` : null,
    Reason: REASON.Built,
    AbilityFrom: abilityFrom(own, cards),
    PersonaFrom: b.persona != null ? b.persona : own,
    BiasFrom: b.bias != null ? b.bias : b.genericBias != null ? null : own
  };
}

function pieceRows(own, cards) {
  const items = [
    ...cards.wholes.map((y) => ({ id: pieceId.whole(y), from: y, kind: "whole", index: 0 })),
    ...cards.bullets.map((p) => ({ ...p, kind: "bullet" }))
  ];
  items.sort((x, y) => compareBy([[x.from, y.from], [x.index, y.index], [x.id, y.id]]));
  return items.map((p, i) => ({ LeaderType: own, PieceId: p.id, FromLeaderType: p.from, Kind: p.kind, SortIndex: i }));
}

function attributeRows(own, attrs) {
  const copies = {};
  return attrs.map((trait) => {
    const copy = copies[trait] || 0;
    copies[trait] = copy + 1;
    return { LeaderType: own, TraitType: trait, FromLeaderType: own, Copy: copy };
  });
}

const biasOut = (r, leader, civ) => ({
  TableName: r.TableName, LeaderType: leader, CivilizationType: civ, TargetType: r.TargetType, Score: r.Score,
  Origin: "moved"
});

function biasRows(ctx, rows, own, b) {
  let out = rows;
  if (b.bias != null || b.genericBias != null) out = out.filter((r) => r.LeaderType !== own);
  if (b.bias != null) {
    for (const r of ctx.input.biasRows.filter((x) => x.LeaderType === b.bias)) {
      out.push(biasOut(r, own, r.CivilizationType));
    }
  } else if (b.genericBias != null) {
    const table = biasTableOfTag(b.genericBias);
    const score = GENERIC_BIASES.find(([t]) => t === b.genericBias)[1];
    const target = BIAS_TARGET_COLUMN[table] ? b.genericBias : null;
    out.push(biasOut({ TableName: table, TargetType: target, Score: score }, own, null));
  }
  const civ = ctx.own.civ;
  if (civ != null && b.civBias != null) {
    const source = ctx.input.biasRows.filter((r) => r.LeaderType == null && r.CivilizationType === b.civBias);
    if (source.length) {
      out = out.filter((r) => !(r.LeaderType == null && r.CivilizationType === civ));
      for (const r of source) out.push(biasOut(r, null, civ));
    }
  }
  return out;
}

// The legend nodes of the builder's own ability, and of an absent leader whose cards it took (CONTRACTS 24), hang
// on its dealt trait once it holds copies.
function unlockRows(ctx, axes, rows, { own, cards, copyPath }) {
  if (!copyPath) return rows;
  const owners = {};
  for (const l of sortIds(ctx.majors).map((t) => ctx.byType.get(t))) {
    if (l.ability && !(l.ability in owners)) owners[l.ability] = l.type;
  }
  const tookFrom = new Set([...cards.wholes, ...cards.bullets.map((p) => p.from)]);
  const absent = (y) => axes.A.reason[y] === REASON.NotInGame && tookFrom.has(y);
  return rows.map((r) => {
    const owner = owners[r.FromTraitType];
    if (owner !== own && !(owner != null && absent(owner))) return r;
    return { ...r, ToLeaderType: own, ToTraitType: TRAIT.dealt(own) };
  });
}

// Lays the builder's cards over the AI players' deal.
export function overlayOwn(ctx, axes, result) {
  if (!ctx.own) return result;
  const cards = ownCards(ctx);
  if (!cards) return result;
  const own = ctx.own.leader;
  const { b } = cards;
  const copyPath = cards.ability || b.persona != null;
  return {
    ...result,
    leaders: result.leaders.map((r) => (r.LeaderType === own ? leaderRow(r, own, cards) : r)),
    pieces: cards.ability
      ? [...result.pieces.filter((r) => r.LeaderType !== own), ...pieceRows(own, cards)]
      : result.pieces,
    attributes: b.attrs.length
      ? [...result.attributes.filter((r) => r.LeaderType !== own), ...attributeRows(own, b.attrs)]
      : result.attributes,
    biases: biasRows(ctx, result.biases, own, b),
    unlocks: unlockRows(ctx, axes, result.unlocks, { own, cards, copyPath })
  };
}
