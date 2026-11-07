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
import { buildsFor } from "./lshuf-deal-build.js";

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
  const sum = bulletRows.reduce((s, r) => s + r.Value, 0);
  const wholeValue = bulletRows.length ? sum : WHOLE_DEFAULT_VALUE;
  if (whole) {
    const piece = { id: pieceId.whole(l.type), from: l.type, kind: "whole", index: 0, value: wholeValue };
    return { whole, changed, wholeValue, pieces: [piece] };
  }
  const movable = bulletRows.filter((r) => r.Movable === 1);
  const listed = new Set();
  for (const r of rows.filter((x) => (x.Kind === "bullet" && x.Movable === 1) || x.Kind === "agenda")) {
    for (const m of input.mapMods[r.PieceId] || []) listed.add(m.ModifierId);
  }
  const hasRest = bulletRows.length > movable.length || l.mods.some((m) => !listed.has(m));
  const pieces = movable.map((r) => ({ id: r.PieceId, from: l.type, kind: "bullet", index: r.BulletIndex, value: r.Value }));
  return { whole, changed, wholeValue, pieces, hasRest };
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

// Each receiver has as many slots as pieces it put in (its shape), keyed over the whole pool; the builder, when it
// took cards, is no receiver (lshuf-deal-build.js).
function dealCards(ctx, pool, deck, shapes, receivers) {
  const keys = keyMap(ctx.seed, SALT.Leaders, pool);
  const slots = {};
  for (const x of receivers) slots[x] = { n: shapes[x].pieces.length, got: 0, value: 0, key: keys[x] };
  const holder = {};
  for (const card of deck.slice(0, PIECE_STEP_CAP)) {
    const x = chooseHolder(ctx, card, receivers, slots);
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

// The builder's ability picks in the split modes (CONTRACTS 13): a whole card takes every piece of that leader out
// of the deck as one whole piece; a bullet card takes that piece when it's in the deck (its leader is dealt in
// pieces). The taken pieces are the builder's hand, the builder keeps no slot and gets no remainder, and the rest
// of the deck is dealt among the others. Returns { pieces, taken, holder, receivers } for the deal.
function takeBuild(ctx, pool, shapes, deckPieces) {
  const taken = [];
  const holder = {};
  const takers = new Set();
  let pieces = deckPieces;
  for (const build of buildsFor(ctx, { dealtSet: new Set(pool) })) {
    const mine = [];
    for (const y of build.wholes) {
      if (!shapes[y] || !pieces.find((p) => p.from === y)) continue;
      pieces = pieces.filter((p) => p.from !== y);
      mine.push({ id: pieceId.whole(y), from: y, kind: "whole", index: 0, value: shapes[y].wholeValue });
      shapes[y].hasRest = false;
    }
    for (const id of build.bullets) {
      const p = pieces.find((c) => c.id === id);
      if (!p) continue;
      pieces = pieces.filter((c) => c.id !== id);
      mine.push(p);
    }
    if (!mine.length) continue;
    for (const p of mine) holder[p.id] = build.leader;
    shapes[build.leader].hasRest = false;
    takers.add(build.leader);
    taken.push(...mine);
  }
  return { pieces, taken, holder, receivers: pool.filter((x) => !takers.has(x)) };
}

function dealSplit(ctx, pool, out) {
  const deckPieces = [];
  const shapes = {};
  for (const x of pool) {
    shapes[x] = splitShape(ctx.input, ctx.byType.get(x));
    deckPieces.push(...shapes[x].pieces);
    if (shapes[x].changed) out.changed[x] = true;
  }
  const build = takeBuild(ctx, pool, shapes, deckPieces);
  const takenIds = new Set(build.taken.map((p) => p.id));
  // Keys are ranked over every piece, taken ones included, so the deck order matches the SQL's.
  const deck = deckOrder(ctx, [...build.pieces, ...build.taken]).filter((p) => !takenIds.has(p.id));
  const holder = { ...build.holder, ...dealCards(ctx, pool, deck, shapes, build.receivers) };
  const { held, donors, receivers } = recordHolders([...deck, ...build.taken], holder, out);
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

// Each builder's first whole card in the whole modes, in slot order: the builder takes that ability, and whoever
// was to get it takes what the builder was to get. A builder with an AI behavior pick goes down the copy path, so
// the behavior can differ from the ability's (CONTRACTS 13). A builder with bullet cards and no whole card gets
// exactly those bullets (copied; their leaders keep them), leaves the cycle, and the ability it was to take goes
// to whoever was to take its own; its own ability goes to nobody.
function wholeBuild(ctx, pool, donors) {
  const copy = new Set();
  const bullets = new Map();
  const majors = new Set(ctx.majors);
  for (const build of buildsFor(ctx, { dealtSet: new Set(pool) })) {
    const y = build.wholes.find((w) => pool.includes(w));
    if (y != null && donors[build.leader] !== y) {
      const r = pool.find((x) => donors[x] === y);
      donors[r] = donors[build.leader];
      donors[build.leader] = y;
    }
    const mine = y == null ? build.bullets.filter((id) => majors.has(id.replace(BULLET_OWNER, ""))) : [];
    if (mine.length) {
      const r = pool.find((x) => donors[x] === build.leader);
      if (r != null && r !== build.leader) donors[r] = donors[build.leader];
      bullets.set(build.leader, mine);
    }
    if (build.persona != null || mine.length) copy.add(build.leader);
  }
  return { copy, bullets };
}

const BULLET_OWNER = /__B\d+$/;

// The bullets a whole-mode builder took, as its hand: from each bullet's leader, in id order.
function bulletHand(x, ids, out) {
  const list = [...ids].sort(cmp).map((id, i) => {
    const from = id.replace(BULLET_OWNER, "");
    return { id, from, kind: PIECE_KIND.Bullet, index: Number(id.slice(id.lastIndexOf("__B") + 3)) || i };
  });
  out.pieces[x] = list.map((p, i) => ({ ...pieceRow(x, p.id, p.from, p.kind), SortIndex: i }));
  out.held[x] = list;
  const flows = {};
  for (const p of list) flows[p.from] = { c: (flows[p.from] ? flows[p.from].c : 0) + 1, v: 0 };
  out.abilityFrom[x] = largest(flows) || x;
  out.path[x] = "copy";
}

function dealWhole(ctx, pool, out) {
  const donors = cyclicDonors(ctx.seed, SALT.Leaders, pool);
  const { copy: copyBuilders, bullets } = wholeBuild(ctx, pool, donors);
  for (const x of pool) {
    if (bullets.has(x)) {
      bulletHand(x, bullets.get(x), out);
      continue;
    }
    const y = donors[x];
    out.pieces[x] = [{ ...pieceRow(x, pieceId.whole(y), y, PIECE_KIND.Whole), SortIndex: 0 }];
    out.held[x] = [{ id: pieceId.whole(y), from: y, kind: "whole", index: 0 }];
    out.abilityFrom[x] = y;
    out.wholeHolder[y] = x;
    out.path[x] = ctx.f.follows && !copyBuilders.has(x) ? "trait" : "copy";
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
