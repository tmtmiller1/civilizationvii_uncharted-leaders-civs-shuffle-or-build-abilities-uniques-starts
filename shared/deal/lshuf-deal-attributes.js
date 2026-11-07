// The attribute axis. Paired moves the donor's attributes with the package; the other modes deal attribute
// cards: each leader gets back as many as it gave, two of one kind only when nothing else is left. Slots are filled
// in order, each from the first card in the deck that isn't a duplicate (another leader's card first), so the deal
// ends after one pass through the slots whatever mix of 0 to 7 attributes the leaders hold. Swaps then fill what
// they can without a repeat, and a slot still empty takes a leftover card even if it repeats a kind.
import { TRAIT } from "../lshuf-constants.js";
import { SALT } from "../lshuf-key.js";
import { ATTR_FILL_CAP, ATTR_REPAIR_CAP, ATTR_STEP_CAP, cmp, compareBy, cyclicDonors, keyMap } from "./lshuf-deal-util.js";
import { isOffFor } from "./lshuf-deal-axes.js";
import { buildsFor } from "./lshuf-deal-build.js";

export const cardId = (leader, trait) => `${leader}|${trait}`;

function attrRow(leader, trait, from, copy = 0) {
  return { LeaderType: leader, TraitType: trait, FromLeaderType: from, Copy: copy };
}

// The builder's attribute picks (CONTRACTS 13): for each kind ticked, its own card of that kind when it gave one,
// else the first card of that kind in `order`. Null when the builder isn't in the pool or ticked no attribute.
function takeAttrs(ctx, pool, order) {
  const takers = new Map();
  const used = new Set();
  for (const build of buildsFor(ctx, { dealtSet: new Set(pool) })) {
    if (!build.attrs.length) continue;
    const taken = [];
    for (const trait of build.attrs) {
      const open = order.filter((c) => c.trait === trait && !used.has(c.id));
      const card = open.find((c) => c.from === build.leader) || open[0];
      if (!card) continue;
      used.add(card.id);
      taken.push(card);
    }
    takers.set(build.leader, taken);
  }
  return takers.size ? { takers, used } : null;
}

// Swap everything with a builder that ticked attributes: the builder gets its cards and leaves the package cycle,
// so whoever was to take the builder's package takes the builder's donor's instead (minus the taken cards); the
// builder's own untaken cards go to nobody.
// Each taker leaves the cycle in slot order: whoever was to take its package takes its donor's instead.
function leaveCycle(pool, donors, takers) {
  for (const leader of takers.keys()) {
    for (const x of pool) if (x !== leader && donors[x] === leader) donors[x] = donors[leader];
  }
}

function dealPaired(ctx, pool, res) {
  const donors = cyclicDonors(ctx.seed, SALT.Leaders, pool);
  const cards = [];
  for (const x of pool) for (const t of ctx.byType.get(x).attrs) cards.push({ id: cardId(x, t), from: x, trait: t });
  const build = takeAttrs(ctx, pool, cards.sort((a, b) => cmp(a.id, b.id))) || { takers: new Map(), used: new Set() };
  leaveCycle(pool, donors, build.takers);
  for (const x of pool) {
    const copies = {};
    for (const c of build.takers.get(x) || []) {
      // A second card of one kind is copy 1 (CONTRACTS 5.3), in the order the cards were taken.
      const copy = copies[c.trait] || 0;
      copies[c.trait] = copy + 1;
      res.rows.push(attrRow(x, c.trait, c.from, copy));
      res.cardHolder[c.id] = x;
    }
    if (build.takers.has(x)) continue;
    const y = donors[x];
    for (const t of ctx.byType.get(y).attrs) {
      if (build.used.has(cardId(y, t))) continue;
      res.rows.push(attrRow(x, t, y));
      res.cardHolder[cardId(y, t)] = x;
    }
  }
}

function buildDeck(ctx, pool) {
  const cards = [];
  for (const x of pool) for (const t of ctx.byType.get(x).attrs) cards.push({ id: cardId(x, t), from: x, trait: t });
  const ids = cards.map((c) => c.id).sort(cmp);
  const keys = keyMap(ctx.seed, SALT.Attributes, ids);
  cards.sort((a, b) => compareBy([[keys[a.id], keys[b.id]], [a.id, b.id]]));
  return cards.map((c, ord) => ({ ...c, ord }));
}

function buildSlots(ctx, pool, skip) {
  const keys = keyMap(ctx.seed, SALT.AttributeRedraw, pool);
  const slots = [];
  for (const x of pool) {
    if (skip.has(x)) continue;
    ctx.byType.get(x).attrs.forEach((_t, j) => slots.push({ x, j, key: keys[x] }));
  }
  return slots.sort((a, b) => compareBy([[a.j, b.j], [a.key, b.key], [a.x, b.x]]));
}

function pickCard(deck, used, holds, x) {
  let best = null;
  for (const c of deck) {
    if (used.has(c.id) || holds.has(c.trait)) continue;
    const rank = [c.from === x ? 1 : 0, c.ord];
    if (best == null || compareBy([[rank[0], best.rank[0]], [rank[1], best.rank[1]]]) < 0) best = { c, rank };
  }
  return best ? best.c : null;
}

// After the greedy pass, each undealt card (deck order, at most ATTR_REPAIR_CAP tries) looks for a swap: an
// already dealt card (slot order) moves to a leader with an empty slot and the undealt card takes its place, when
// neither leader then holds a kind twice. A card with no such swap stays undealt and its slot empty.
function findSwap(filled, u) {
  const kinds = (x, skip) => filled.filter((f) => f.x === x && f.card && f !== skip).map((f) => f.card.trait);
  for (const c of filled) {
    if (!c.card || c.fixed) continue;
    if (kinds(c.x, c).includes(u.trait)) continue;
    const s = filled.find((e) => !e.card && e.x !== c.x && !kinds(e.x, null).includes(c.card.trait));
    if (s) return [c, s];
  }
  return null;
}

function repair(deck, filled, used) {
  const tried = new Set();
  for (let step = 0; step < ATTR_REPAIR_CAP; step += 1) {
    const u = deck.find((c) => !used.has(c.id) && !tried.has(c.id));
    if (!u) return;
    tried.add(u.id);
    const pair = findSwap(filled, u);
    if (!pair) continue;
    const [c, s] = pair;
    s.card = c.card;
    c.card = u;
    used.add(u.id);
  }
}

// Each slot still empty (slot order, at most ATTR_FILL_CAP) takes the first leftover card in deck order: a kind its
// leader doesn't hold first, then another leader's card first. Only a leftover card repeating a kind is left by now
// in practice, so this is where a leader can end up with two of one kind.
function fill(deck, filled, used) {
  let step = 0;
  for (const f of filled) {
    if (f.card) continue;
    if (step >= ATTR_FILL_CAP) return;
    step += 1;
    const held = new Set(filled.filter((e) => e.x === f.x && e.card).map((e) => e.card.trait));
    let best = null;
    for (const c of deck) {
      if (used.has(c.id)) continue;
      const rank = [held.has(c.trait) ? 1 : 0, c.from === f.x ? 1 : 0, c.ord];
      if (best == null || compareBy(rank.map((r, i) => [r, best.rank[i]])) < 0) best = { c, rank };
    }
    if (!best) continue;
    f.card = best.c;
    used.add(best.c.id);
  }
}

function dealDeck(ctx, pool, res) {
  const deck = buildDeck(ctx, pool);
  const build = takeAttrs(ctx, pool, deck);
  const slots = buildSlots(ctx, pool, build ? build.takers : new Map());
  const used = new Set(build ? build.used : []);
  const holds = {};
  for (const x of pool) holds[x] = new Set();
  // The builder's taken cards come first and never move in the swap pass.
  const filled = [];
  for (const [x, taken] of build ? build.takers : []) for (const card of taken) filled.push({ x, card, fixed: true });
  for (const slot of slots.slice(0, ATTR_STEP_CAP)) {
    const card = pickCard(deck, used, holds[slot.x], slot.x);
    filled.push({ x: slot.x, card });
    if (!card) continue;
    used.add(card.id);
    holds[slot.x].add(card.trait);
  }
  repair(deck, filled, used);
  fill(deck, filled, used);
  const copies = {};
  for (const f of filled) {
    if (!f.card) continue;
    const k = `${f.x}|${f.card.trait}`;
    const copy = copies[k] || 0;
    copies[k] = copy + 1;
    res.cardHolder[f.card.id] = f.x;
    res.rows.push(attrRow(f.x, f.card.trait, f.card.from, copy));
  }
}

// Paired with the ability while abilities are split: each leader takes the attributes of the leader it got the
// most pieces from (its own when it got none); builders take their cards first, and a card they took isn't given
// again.
function dealFromAbility(ctx, pool, res, ability) {
  const cards = [];
  for (const x of pool) for (const t of ctx.byType.get(x).attrs) cards.push({ id: cardId(x, t), from: x, trait: t });
  const build = takeAttrs(ctx, pool, cards.sort((a, b) => cmp(a.id, b.id))) || { takers: new Map(), used: new Set() };
  for (const x of pool) {
    const copies = {};
    for (const c of build.takers.get(x) || []) {
      const copy = copies[c.trait] || 0;
      copies[c.trait] = copy + 1;
      res.rows.push(attrRow(x, c.trait, c.from, copy));
      res.cardHolder[c.id] = x;
    }
    if (build.takers.has(x)) continue;
    const y = ability.abilityFrom[x] || x;
    for (const t of ctx.byType.get(y).attrs) {
      if (build.used.has(cardId(y, t))) continue;
      res.rows.push(attrRow(x, t, y));
    }
  }
}

export function dealAttributes(ctx, axes, ability) {
  const T = axes.T;
  const res = { rows: [], cardHolder: {} };
  if (T.dealt.length && ctx.f.tCycle) dealPaired(ctx, T.dealt, res);
  else if (T.dealt.length && ctx.f.tFromA) dealFromAbility(ctx, T.dealt, res, ability);
  else if (T.dealt.length) dealDeck(ctx, T.dealt, res);
  for (const l of ctx.input.leaders) {
    if (T.dealtSet.has(l.type)) continue;
    if (isOffFor(T, l.type)) {
      res.rows.push(attrRow(l.type, TRAIT.EqualActions, null));
      continue;
    }
    for (const t of l.attrs) {
      res.rows.push(attrRow(l.type, t, l.type));
      res.cardHolder[cardId(l.type, t)] = l.type;
    }
  }
  return res;
}
