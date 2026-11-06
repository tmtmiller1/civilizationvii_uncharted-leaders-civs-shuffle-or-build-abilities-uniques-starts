// The ability axis: whole abilities (modes 1 and 2) or pieces (modes 3 and 4), SPEC section 3.
import { PIECE_KIND, pieceId } from "../lshuf-constants.js";
import { SALT } from "../lshuf-key.js";
import {
  BALANCE_SCALE,
  PIECE_STEP_CAP,
  WHOLE_DEFAULT_VALUE,
  cmp,
  compareBy,
  cyclicDonors,
  floorDiv,
  keyMap
} from "./lshuf-deal-util.js";
import { isOffFor } from "./lshuf-deal-axes.js";

const pieceRow = (leader, id, from, kind) => ({ LeaderType: leader, PieceId: id, FromLeaderType: from, Kind: kind });

// A leader goes into the split deal as one whole piece when its mapping isn't complete and reviewed, or (modded)
// when its live ability isn't the reviewed one.
export function changedModdedSet(input, l) {
  const set = input.reviewed[l.ability];
  if (set == null) return true;
  // Entries counted as the SQL counts them: the number of "|" less one.
  const entries = set.split("|").length - 2;
  return entries !== l.mods.length || l.mods.some((m) => !set.includes(`|${m}|`));
}

function splitShape(input, l) {
  const rows = input.mapping[l.type] || [];
  const changed = l.modded && changedModdedSet(input, l);
  const whole =
    rows.length === 0 || changed || rows.some((r) => r.Reviewed !== 1 || r.AbilityTrait !== l.ability);
  const bulletRows = rows.filter((r) => r.Kind === "bullet");
  if (whole) {
    const sum = bulletRows.reduce((s, r) => s + r.Value, 0);
    const value = bulletRows.length ? sum : WHOLE_DEFAULT_VALUE;
    return { whole, changed, pieces: [{ id: pieceId.whole(l.type), from: l.type, kind: "whole", index: 0, value }] };
  }
  const movable = bulletRows.filter((r) => r.Movable === 1);
  const listed = new Set();
  for (const r of rows.filter((x) => (x.Kind === "bullet" && x.Movable === 1) || x.Kind === "agenda")) {
    for (const m of input.mapMods[r.PieceId] || []) listed.add(m.ModifierId);
  }
  const hasRest = bulletRows.length > movable.length || l.mods.some((m) => !listed.has(m));
  const pieces = movable.map((r) => ({ id: r.PieceId, from: l.type, kind: "bullet", index: r.BulletIndex, value: r.Value }));
  return { whole, changed, pieces, hasRest };
}

function deckOrder(ctx, pieces) {
  const ids = pieces.map((p) => p.id).sort(cmp);
  const keys = keyMap(ctx.seed, SALT.Pieces, ids);
  const deck = pieces.map((p) => ({ ...p, key: keys[p.id] }));
  return deck.sort((a, b) =>
    compareBy([
      [ctx.f.balanced ? a.value : 0, ctx.f.balanced ? b.value : 0, true],
      [a.key, b.key],
      [a.id, b.id]
    ])
  );
}

function chooseHolder(ctx, card, pool, slots) {
  let best = null;
  for (const x of pool) {
    const s = slots[x];
    if (s.got >= s.n) continue;
    const cand = [x === card.from ? 1 : 0, ctx.f.balanced ? floorDiv(s.value * BALANCE_SCALE, s.n) : 0, s.key, x];
    if (best == null || compareBy(cand.map((v, i) => [v, best[i]])) < 0) best = cand;
  }
  return best ? best[3] : null;
}

function dealCards(ctx, pool, deck) {
  const keys = keyMap(ctx.seed, SALT.Leaders, pool);
  const slots = {};
  for (const x of pool) slots[x] = { n: 0, got: 0, value: 0, key: keys[x] };
  for (const p of deck) slots[p.from].n += 1;
  const holder = {};
  for (const card of deck.slice(0, PIECE_STEP_CAP)) {
    const x = chooseHolder(ctx, card, pool, slots);
    if (x == null) continue;
    holder[card.id] = x;
    slots[x].got += 1;
    slots[x].value += card.value;
  }
  return holder;
}

// Largest flow first: most pieces, then most value, then id.
function largest(flows) {
  const list = Object.entries(flows).map(([id, f]) => ({ id, ...f }));
  list.sort((a, b) => compareBy([[a.c, b.c, true], [a.v, b.v, true], [a.id, b.id]]));
  return list.length ? list[0].id : null;
}

function addFlow(map, a, b, value) {
  map[a] = map[a] || {};
  map[a][b] = map[a][b] || { c: 0, v: 0 };
  map[a][b].c += 1;
  map[a][b].v += value;
}

function recordHolders(deck, holder, out) {
  const held = {};
  const donors = {};
  const receivers = {};
  for (const p of deck) {
    const x = holder[p.id];
    if (x == null) continue;
    out.receiverOf[p.id] = x;
    (held[x] = held[x] || []).push(p);
    addFlow(donors, x, p.from, p.value);
    addFlow(receivers, p.from, x, p.value);
  }
  return { held, donors, receivers };
}

function dealSplit(ctx, pool, out) {
  const deckPieces = [];
  const shapes = {};
  for (const x of pool) {
    shapes[x] = splitShape(ctx.input, ctx.byType.get(x));
    deckPieces.push(...shapes[x].pieces);
    if (shapes[x].changed) out.changed[x] = true;
  }
  const deck = deckOrder(ctx, deckPieces);
  const holder = dealCards(ctx, pool, deck);
  const { held, donors, receivers } = recordHolders(deck, holder, out);
  for (const x of pool) {
    const list = (held[x] || []).map((p) => ({ ...p, rest: 0 }));
    if (shapes[x].hasRest) {
      list.push({ id: pieceId.rest(x), from: x, kind: PIECE_KIND.Remainder, index: 0, rest: 1 });
    }
    list.sort((a, b) => compareBy([[a.rest, b.rest], [a.from, b.from], [a.index, b.index], [a.id, b.id]]));
    out.pieces[x] = list.map((p, i) => ({ ...pieceRow(x, p.id, p.from, p.kind), SortIndex: i }));
    out.held[x] = list;
    out.abilityFrom[x] = largest(donors[x] || {}) || x;
    out.largestReceiver[x] = largest(receivers[x] || {}) || x;
    out.path[x] = "copy";
  }
}

function dealWhole(ctx, pool, out) {
  const donors = cyclicDonors(ctx.seed, SALT.Leaders, pool);
  for (const x of pool) {
    const y = donors[x];
    out.pieces[x] = [{ ...pieceRow(x, pieceId.whole(y), y, PIECE_KIND.Whole), SortIndex: 0 }];
    out.held[x] = [{ id: pieceId.whole(y), from: y, kind: "whole", index: 0 }];
    out.abilityFrom[x] = y;
    out.wholeHolder[y] = x;
    out.path[x] = ctx.f.follows ? "trait" : "copy";
  }
}

export function dealAbility(ctx, axes) {
  const out = {
    pieces: {},
    held: {},
    abilityFrom: {},
    path: {},
    wholeHolder: {},
    receiverOf: {},
    largestReceiver: {},
    changed: {}
  };
  const A = axes.A;
  if (A.dealt.length && ctx.f.isWhole) dealWhole(ctx, A.dealt, out);
  else if (A.dealt.length && ctx.f.isSplit) dealSplit(ctx, A.dealt, out);
  for (const l of ctx.input.leaders) {
    if (A.dealtSet.has(l.type)) continue;
    if (isOffFor(A, l.type)) {
      out.pieces[l.type] = [];
      out.abilityFrom[l.type] = null;
      continue;
    }
    out.abilityFrom[l.type] = l.type;
    const own = { ...pieceRow(l.type, pieceId.whole(l.type), l.type, PIECE_KIND.Whole), SortIndex: 0 };
    out.pieces[l.type] = l.ability ? [own] : [];
  }
  return out;
}
