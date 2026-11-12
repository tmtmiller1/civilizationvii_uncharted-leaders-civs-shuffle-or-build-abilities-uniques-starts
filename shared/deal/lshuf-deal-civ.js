// Civilization builds (CONTRACTS 14, 18 and 21): what each builder's civilization takes from the other civilizations.
// An ability or bonus card can come from any age (Every age); civics and unique cards only from the builder's own.
// An ability card swaps abilities with the source civ; a civics card swaps civics trees the same way (the
// tree, its traditions and the buildings, quarters and improvements it unlocks go together); a unique card moves the
// unique; a bonus card (CONTRACTS 19, Civilization abilities = Split) takes that one piece of a civ's ability; a
// civic card (CONTRACTS 21) moves that one civic, with its traditions and what it unlocks, into the builder's tree.
// Slot by slot: a card a lower slot took is gone, a civ a lower slot built can't be a swap source, and a part
// already swapped can't be swapped again. Writes LShufResultCivPieces rows and a CivBuilder<n> meta row per
// builder. Pure, and the SQL twin (scripts/generate/sql-civ.mjs) walks the same steps in the same order.
import { BUILD, BUILD_WHY, CA_MODE, CC_MODE, CIV_OWN_AGE_PIECES, CU_MODE, pieceWorksIn } from "../lshuf-constants.js";
import { SALT } from "../lshuf-key.js";
import {
  BALANCE_SCALE, PIECE_STEP_CAP, POOL_STEP_CAP, cmp, compareBy, cyclicDonors, floorDiv, keyMap
} from "./lshuf-deal-util.js";

const metaName = (slot) => (slot === 1 ? "CivBuilder" : `CivBuilder${slot}`);

// civ -> { age, ability, tree, uniques: Map type -> kind, nodes: [{ id, node, cost }] }
function civInfo(items, civNodes, riders) {
  const info = new Map();
  addItems(info, items, riders);
  addNodes(info, civNodes, riders);
  return info;
}

function addItems(info, items, riders) {
  for (const i of items) {
    if (!info.has(i.civ)) info.set(i.civ, { age: i.age, ability: null, tree: null, uniques: new Map(), nodes: [] });
    const c = info.get(i.civ);
    if (i.kind === "ability") c.ability = i.trait;
    else if (i.kind === "civics") c.tree = i.type;
    else if (!riders.leadOf.has(BUILD.civUnique(i.type))) c.uniques.set(i.type, i.kind);
  }
  for (const [civ, c] of info) if (c.ability == null) info.delete(civ);
}

// A civ's civics, a bundle as one entry under its lead with its members' costs (CONTRACTS 23 R2).
function addNodes(info, civNodes, riders) {
  const costOf = new Map((civNodes || []).map((n) => [BUILD.civCivic(n.node), Number(n.cost || 0)]));
  for (const n of civNodes || []) {
    const c = info.get(n.civ);
    const id = BUILD.civCivic(n.node);
    if (!c || !c.tree || riders.leadOf.has(id)) continue;
    const cost = (riders.of.get(id) || []).reduce((sum, r) => sum + (costOf.get(r) || 0), costOf.get(id) || 0);
    c.nodes.push({ id, node: n.node, cost });
  }
}

// Riders (CONTRACTS 23 R2, R3): leadOf rider id -> lead id, of lead id -> its rider ids.
function riderMaps(list) {
  const leadOf = new Map();
  const of = new Map();
  for (const r of list || []) {
    leadOf.set(r.rider, r.lead);
    if (!of.has(r.lead)) of.set(r.lead, []);
    of.get(r.lead).push(r.rider);
  }
  return { leadOf, of };
}

// A builder's pick of a rider counts as a pick of its lead (CONTRACTS 23).
const toLead = (riders, id) => riders.leadOf.get(id) || id;

// Taking a lead takes its riders, so nothing can take them apart.
function takeWith(state, riders, id) {
  state.taken.add(id);
  for (const r of riders.of.get(id) || []) state.taken.add(r);
}

// After the deal: one more row per rider of every lead row, as the lead's (CONTRACTS 23).
function riderRows(rows, riders) {
  const out = [];
  for (const r of rows) {
    if (r.Kind !== "unique" && r.Kind !== "civic") continue;
    for (const id of riders.of.get(r.PieceId) || []) {
      if (rows.find((x) => x.CivilizationType === r.CivilizationType && x.PieceId === id)) continue;
      out.push({ ...r, PieceId: id });
    }
  }
  rows.push(...out);
}

function nodeOwner(info, node) {
  for (const [civ, c] of info) if (c.nodes.find((n) => n.node === node)) return civ;
  return null;
}

function ownerOf(info, type) {
  for (const [civ, c] of info) if (c.uniques.has(type)) return civ;
  return null;
}

// The ability swap, and the civics swap (both civs need a civics tree). part: { idOf, kind, has }.
const ABILITY_PART = { idOf: BUILD.civAbility, kind: "ability", has: () => true };
const CIVICS_PART = { idOf: BUILD.civCivics, kind: "civics", has: (c) => c.tree != null };

// Both civs have the part; civics trees only swap within an age, abilities across ages (Every age).
const partsMatch = (S, B, info, part) => part.has(info.get(B)) && part.has(info.get(S))
  && (part !== CIVICS_PART || playAge(info, S) === playAge(info, B));

// The age a civ plays in: a builder's civ plays in the game's age (Test of Time lets a civ from another age start
// here); any other civ in its own. Its own bonus cards still come from its own age's mapping.
const playAge = (info, civ) => info.get(civ).play || info.get(civ).age;

// A civ a lower slot took a bonus from can't swap its ability whole any more (CONTRACTS 19).
function swappable(state, S, B, info, part) {
  if (S == null || S === B || !info.has(S) || state.builtCivs.has(S)) return false;
  if (!partsMatch(S, B, info, part)) return false;
  if (part === ABILITY_PART && (state.pieced.has(S) || state.pieced.has(B))) return false;
  return !state.taken.has(part.idOf(B)) && !state.taken.has(part.idOf(S));
}

function swap(state, S, B, info, part) {
  if (!swappable(state, S, B, info, part)) return [];
  state.taken.add(part.idOf(S));
  state.taken.add(part.idOf(B));
  return [
    { CivilizationType: B, PieceId: part.idOf(S), FromCivilization: S, Kind: part.kind, SortIndex: 0 },
    { CivilizationType: S, PieceId: part.idOf(B), FromCivilization: B, Kind: part.kind, SortIndex: 0 }
  ];
}
const abilitySwap = (state, build, B, info) => swap(state, build.civAbility, B, info, ABILITY_PART);
const civicsSwap = (state, build, B, info) => swap(state, build.civCivics, B, info, CIVICS_PART);

function uniqueTakes(state, build, B, info, riders) {
  const rows = [];
  const ids = [...new Set(build.civUniques.map((t) => toLead(riders, BUILD.civUnique(t))))].sort(cmp);
  for (const id of ids) {
    const type = id.slice(BUILD.civUnique("").length);
    const S = ownerOf(info, type);
    if (S == null || S === B || playAge(info, S) !== playAge(info, B) || state.taken.has(id)) continue;
    takeWith(state, riders, id);
    state.uniqueTakers.add(B);
    rows.push({ CivilizationType: B, PieceId: id, FromCivilization: S, Kind: "unique", SortIndex: rows.length + 1 });
  }
  return rows;
}

// A civic card (CONTRACTS 21), in every mode: the civic moves into the builder's tree when its civ plays the same
// age, nobody took it, and neither tree was swapped whole. A builder with no tree of its own (a civ of another age)
// takes civics too; the apply puts them in the age's Test of Time tree for it.
function civicTakes(state, build, B, info, riders) {
  const rows = [];
  for (const id of [...new Set(build.civCivicNodes.map((n) => toLead(riders, n)))].sort(cmp)) {
    const S = nodeOwner(info, id.slice("CIVNODE_".length));
    if (S == null || S === B || playAge(info, S) !== playAge(info, B) || state.taken.has(id)) continue;
    if (state.taken.has(BUILD.civCivics(S)) || state.taken.has(BUILD.civCivics(B))) continue;
    takeWith(state, riders, id);
    state.nodeTakers.add(B);
    rows.push({ CivilizationType: B, PieceId: id, FromCivilization: S, Kind: "civic", SortIndex: rows.length + 1 });
  }
  return rows;
}

// --- Civilization abilities = Split (CONTRACTS 19) ---

const isSplit = (ctx) => ((ctx.input.options || {}).CivAbilities || CA_MODE.Normal) === CA_MODE.Split;

// A civ's pieces in play: the mapping's movable bullets of the civ's own age, in id order, less the ones the game's
// age leaves with nothing to do (civDead: a civ of another age playing here, Test of Time).
function civPieces(ctx, info, civ) {
  const rows = (ctx.input.civMapping || {})[civ] || [];
  const age = info.get(civ).age;
  const dead = ctx.input.civDead || new Set();
  const gameAge = ctx.input.age || "";
  return rows
    .filter((r) => r.Kind === "bullet" && r.Movable === 1 && r.Age === age && !dead.has(`${r.PieceId}|${gameAge}`))
    .map((r) => ({ id: r.PieceId, from: civ, index: r.BulletIndex, value: r.Value }));
}

// The pieces the random deal hands out: a bound piece (LShufBoundPieces, CONTRACTS 29) isn't one of them; it goes
// with its unique. A builder can still take its card (bulletTakes reads civPieces).
function deckPieces(ctx, info, civ) {
  const bound = ctx.input.boundPieces || new Set();
  return civPieces(ctx, info, civ).filter((p) => !bound.has(p.id));
}

// A civ's ability is in pieces when nobody holds it whole: not swapped by a builder.
const inPieces = (state, civ) => !state.taken.has(BUILD.civAbility(civ));

// The builder's bonus cards (CONTRACTS 19): each takes that one piece when its civ is in the game, the piece is in
// play and nobody holds it, and the builder's own ability is still in pieces. A piece of another age's civ can be
// taken unless it's one of CIV_OWN_AGE_PIECES; an AI builder (slot 2 up) also skips a PIECE_AGES piece that doesn't
// work in its civ's age.
const OWN_AGE = new Set(CIV_OWN_AGE_PIECES);
const ageAllows = (build, id, fromAge, toAge) => (fromAge === toAge || !OWN_AGE.has(id))
  && (build.slot <= 1 || pieceWorksIn(id, toAge));
function bulletTakes(ctx, state, build, B, info) {
  const rows = [];
  if (!isSplit(ctx) || !inPieces(state, B)) return rows;
  for (const id of [...build.civBullets].sort(cmp)) {
    const S = civOfPiece(ctx, id);
    if (S == null || !info.has(S) || !inPieces(state, S)) continue;
    if (!ageAllows(build, id, playAge(info, S), playAge(info, B))) continue;
    const piece = civPieces(ctx, info, S).find((p) => p.id === id);
    if (!piece || state.taken.has(id)) continue;
    state.taken.add(id);
    state.pieced.add(S);
    state.takers.add(B);
    rows.push({ CivilizationType: B, PieceId: id, FromCivilization: S, Kind: "bullet", SortIndex: 0, index: piece.index });
  }
  return rows;
}

function civOfPiece(ctx, id) {
  for (const [civ, rows] of Object.entries(ctx.input.civMapping || {})) {
    if (rows.find((r) => r.PieceId === id)) return civ;
  }
  return null;
}

// The next card goes to a civ of its age with room left: someone else's first, then (Balanced) the lowest value
// per slot so far, then the civ key (lshuf-deal-ability.js chooseHolder).
function chooseCiv(ctx, card, slots) {
  let best = null;
  for (const [x, s] of Object.entries(slots)) {
    if (s.age !== card.age || s.got >= s.n) continue;
    const cand = [x === card.from ? 1 : 0, ctx.f.balanced ? floorDiv(s.value * BALANCE_SCALE, s.n) : 0, s.key, x];
    if (best == null || compareBy(cand.map((v, i) => [v, best[i]])) < 0) best = cand;
  }
  return best ? best[3] : null;
}

// The deck: every piece in play of every civ in pieces, keyed over the whole deck (taken pieces included, so the
// order matches the SQL's), the builders' pieces out, by value (Balanced), key, id.
function civDeck(ctx, info, state, civs) {
  const all = [];
  for (const c of civs) all.push(...deckPieces(ctx, info, c).map((p) => ({ ...p, age: info.get(c).age })));
  const keys = keyMap(ctx.seed, SALT.CivPieces, all.map((p) => p.id).sort(cmp));
  return all
    .filter((p) => !state.taken.has(p.id))
    .map((p) => ({ ...p, key: keys[p.id] }))
    .sort((a, b) => compareBy([
      [ctx.f.balanced ? a.value : 0, ctx.f.balanced ? b.value : 0, true], [a.key, b.key], [a.id, b.id]
    ]));
}

// Each civ in pieces that took no bonus card gets back as many pieces as it put in, then a remainder row for its
// unmovable pieces and unlisted modifiers; a builder that took bonus cards holds exactly those (bulletTakes).
function splitRows(ctx, info, state, rows) {
  if (!isSplit(ctx)) return;
  const civs = [...info.keys()].sort(cmp).filter((c) => inPieces(state, c) && deckPieces(ctx, info, c).length > 0);
  const receivers = civs.filter((c) => !state.takers.has(c));
  const keys = keyMap(ctx.seed, SALT.CivPieces, receivers);
  const slots = {};
  for (const c of receivers) {
    slots[c] = { n: deckPieces(ctx, info, c).length, got: 0, value: 0, key: keys[c], age: info.get(c).age };
  }
  for (const card of civDeck(ctx, info, state, civs).slice(0, PIECE_STEP_CAP)) {
    const x = chooseCiv(ctx, card, slots);
    if (x == null) continue;
    slots[x].got += 1;
    slots[x].value += card.value;
    rows.push({ CivilizationType: x, PieceId: card.id, FromCivilization: card.from, Kind: "bullet", SortIndex: 0,
      index: card.index });
  }
  for (const c of receivers) {
    rows.push({ CivilizationType: c, PieceId: `${c}__REST`, FromCivilization: c, Kind: "remainder", SortIndex: 0,
      index: 0 });
  }
}

// A pool dealt one card at a time, for any kind of piece (the Split deal of CONTRACTS 19 and 21): `items`
// { id, from, age, value, taken } over every piece of the pool's civs, `receivers` civ -> { n, age }. The deck is
// keyed over every item (taken ones included, so the order matches the SQL's), sorted by value (Balanced), key, id;
// the receivers keyed over their ids; the next card goes to a civ of its age with room, someone else's first, then
// (Balanced) the lowest value per slot, then the civ key. Returns [{ id, from, to }].
function dealPool(ctx, items, receivers, salt) {
  const keys = keyMap(ctx.seed, salt, items.map((p) => p.id).sort(cmp));
  const civs = Object.keys(receivers).sort(cmp);
  const civKeys = keyMap(ctx.seed, salt, civs);
  const slots = {};
  for (const c of civs) slots[c] = { ...receivers[c], got: 0, value: 0, key: civKeys[c] };
  const deck = items.filter((p) => !p.taken).map((p) => ({ ...p, key: keys[p.id] })).sort((a, b) => compareBy([
    [ctx.f.balanced ? a.value : 0, ctx.f.balanced ? b.value : 0, true], [a.key, b.key], [a.id, b.id]
  ]));
  const out = [];
  for (const card of deck.slice(0, POOL_STEP_CAP)) {
    const x = chooseCiv(ctx, card, slots);
    if (x == null) continue;
    slots[x].got += 1;
    slots[x].value += card.value;
    out.push({ id: card.id, from: card.from, to: x });
  }
  return out;
}

// Civilization civics = Split (CONTRACTS 21): every civic of every civ with a tree nobody swapped whole goes into
// one pool per age; each civ that took no civic card gets back as many civics as it had. Uniques = Split: the same
// over every unique, each civ that took no unique card getting back as many as it had.
function civicPool(info, state) {
  const civs = [...info.keys()].sort(cmp)
    .filter((c) => info.get(c).nodes.length > 0 && !state.taken.has(BUILD.civCivics(c)));
  const items = civs.flatMap((c) => info.get(c).nodes.map((n) => ({
    id: n.id, from: c, age: playAge(info, c), value: n.cost, taken: state.taken.has(n.id)
  })));
  const receivers = {};
  for (const c of civs) {
    if (!state.nodeTakers.has(c)) receivers[c] = { n: info.get(c).nodes.length, age: playAge(info, c) };
  }
  return { items, receivers, salt: SALT.CivNodes, kind: "civic" };
}

function uniquePool(info, state) {
  const civs = [...info.keys()].sort(cmp).filter((c) => info.get(c).uniques.size > 0);
  const items = civs.flatMap((c) => [...info.get(c).uniques.keys()].sort(cmp).map((type) => ({
    id: BUILD.civUnique(type), from: c, age: playAge(info, c), value: 1, taken: state.taken.has(BUILD.civUnique(type))
  })));
  const receivers = {};
  for (const c of civs) {
    if (!state.uniqueTakers.has(c)) receivers[c] = { n: info.get(c).uniques.size, age: playAge(info, c) };
  }
  return { items, receivers, salt: SALT.CivUniquePieces, kind: "unique" };
}

function poolRows(ctx, info, state, rows) {
  const o = ctx.input.options || {};
  const pools = [];
  if ((o.CivCivics || CC_MODE.Normal) === CC_MODE.Split) pools.push(civicPool(info, state));
  if ((o.CivUniques || CU_MODE.Normal) === CU_MODE.Split) pools.push(uniquePool(info, state));
  for (const pool of pools) {
    const dealt = dealPool(ctx, pool.items, pool.receivers, pool.salt)
      .sort((a, b) => cmp(a.to, b.to) || cmp(a.from, b.from) || cmp(a.id, b.id));
    let civ = null;
    let n = 0;
    for (const d of dealt) {
      n = d.to === civ ? n + 1 : 1;
      civ = d.to;
      rows.push({ CivilizationType: d.to, PieceId: d.id, FromCivilization: d.from, Kind: pool.kind, SortIndex: n });
    }
  }
}

// Held pieces in order: dealt pieces by giver, bullet index and id, the remainder last (the leader deal's order).
function numberPieces(rows) {
  const held = rows.filter((r) => r.Kind === "bullet" || r.Kind === "remainder");
  held.sort((a, b) => compareBy([
    [a.CivilizationType, b.CivilizationType], [a.Kind === "remainder" ? 1 : 0, b.Kind === "remainder" ? 1 : 0],
    [a.FromCivilization, b.FromCivilization], [a.index, b.index], [a.PieceId, b.PieceId]
  ]));
  let civ = null;
  let n = 0;
  for (const r of held) {
    n = r.CivilizationType === civ ? n + 1 : 0;
    civ = r.CivilizationType;
    r.SortIndex = n;
    delete r.index;
  }
}

// The shuffle (CONTRACTS 16 and 18), after the builds, per age over the civs no builder built. Abilities Swapped: a
// cycle over those civs whose ability no builder took, each taking its donor's. Civics Shuffled: the same over the
// civs with a civics tree no builder took (SALT.CivCivics); With the ability: each civ in the ability cycle takes
// its ability donor's civics when the donor has a tree nobody took. Uniques With the ability: each civ in that cycle
// takes its ability donor's uniques; Shuffled: a cycle of its own over every unbuilt civ, each taking its donor's
// whole set; a unique a builder took stays taken. Off: a meta flag, and the apply clears the part for every civ
// that has no row of that kind (builders keep what they took).
const partRow = (part, c, d) => ({
  CivilizationType: c, PieceId: part.idOf(d), FromCivilization: d, Kind: part.kind, SortIndex: 0
});

// A civ's attribute tags (Cultural, Economic... the TRAIT_ATTRIBUTE_* rows, CONTRACTS 30) taken from civ d.
const tagsRow = (c, d) => ({ CivilizationType: c, PieceId: BUILD.civTags(d), FromCivilization: d, Kind: "tags", SortIndex: 0 });

// A whole ability brings its civ's attribute tags along, whether a builder swapped it or the shuffle dealt it.
function abilityTags(rows) {
  for (const r of rows.filter((x) => x.Kind === "ability")) rows.push(tagsRow(r.CivilizationType, r.FromCivilization));
}

// The unbuilt civs, by age, in id order.
function unbuiltByAge(info, state) {
  const ages = new Map();
  for (const civ of [...info.keys()].sort(cmp)) {
    if (state.builtCivs.has(civ)) continue;
    const age = info.get(civ).age;
    if (!ages.has(age)) ages.set(age, []);
    ages.get(age).push(civ);
  }
  return ages;
}

// Each civ takes its unique donor's whole set, less the uniques builders took.
function uniqueRows(info, state, civs, uniqueDonors, rows) {
  for (const c of civs) {
    const d = uniqueDonors[c];
    if (d == null || d === c) continue;
    let n = 0;
    for (const type of [...info.get(d).uniques.keys()].sort(cmp)) {
      const id = BUILD.civUnique(type);
      if (state.taken.has(id)) continue;
      n += 1;
      rows.push({ CivilizationType: c, PieceId: id, FromCivilization: d, Kind: "unique", SortIndex: n });
    }
  }
}

// The civics rows of an age: a cycle of their own (Shuffled) or the ability donors (With the ability), over the
// civs with a tree nobody took.
// The ability cycle walked over the civs that can trade civics: each takes the next such civ along the cycle, so
// every one gives one tree and takes one (a civ without a free tree is stepped over, never left holding two).
export function followCycle(donors, eligible) {
  const out = {};
  const limit = Object.keys(donors).length;
  for (const c of Object.keys(donors)) {
    if (!eligible.has(c)) continue;
    let d = donors[c];
    for (let i = 0; i < limit && d != null && d !== c && !eligible.has(d); i += 1) d = donors[d];
    if (d != null && d !== c && eligible.has(d)) out[c] = d;
  }
  return out;
}

function civicsRows(ctx, info, state, civs, { cc, donors, rows }) {
  const forCivics = civs.filter((c) => info.get(c).tree != null && !state.taken.has(BUILD.civCivics(c)));
  let civicsDonors = {};
  if (cc === CC_MODE.Paired) civicsDonors = followCycle(donors, new Set(forCivics));
  else if (cc === CC_MODE.Shuffled && forCivics.length >= 2) {
    civicsDonors = cyclicDonors(ctx.seed, SALT.CivCivics, forCivics);
  }
  for (const c of civs) {
    const d = civicsDonors[c];
    if (d != null && d !== c && forCivics.includes(d)) rows.push(partRow(CIVICS_PART, c, d));
  }
}

// Abilities in pieces: the attribute tag sets go round a cycle of their own (CONTRACTS 30).
function splitTags(ctx, civs, rows) {
  if (civs.length < 2) return;
  const donors = cyclicDonors(ctx.seed, SALT.CivTags, civs);
  for (const c of civs) if (donors[c] != null && donors[c] !== c) rows.push(tagsRow(c, donors[c]));
}

function shuffleAge(ctx, info, state, civs, { ca, cu, cc, rows }) {
  const forAbility = civs.filter((c) => !state.taken.has(BUILD.civAbility(c)));
  const swapped = ca === CA_MODE.Swapped && forAbility.length >= 2;
  const donors = swapped ? cyclicDonors(ctx.seed, SALT.CivAbilities, forAbility) : {};
  for (const c of forAbility) {
    if (donors[c] != null && donors[c] !== c) rows.push(partRow(ABILITY_PART, c, donors[c]));
  }
  if (ca === CA_MODE.Split) splitTags(ctx, forAbility, rows);
  civicsRows(ctx, info, state, civs, { cc, donors, rows });
  let uniqueDonors = {};
  if (cu === CU_MODE.Paired) uniqueDonors = donors;
  else if (cu === CU_MODE.Shuffled && civs.length >= 2) uniqueDonors = cyclicDonors(ctx.seed, SALT.CivUniques, civs);
  uniqueRows(info, state, civs, uniqueDonors, rows);
}

function civShuffle(ctx, info, state, rows) {
  const o = ctx.input.options || {};
  const ca = o.CivAbilities || CA_MODE.Normal;
  const cu = o.CivUniques || CU_MODE.Normal;
  const cc = o.CivCivics || CC_MODE.Normal;
  const meta = [];
  if (ca === CA_MODE.Off) meta.push({ Name: "CivAbilitiesOff", Value: "1" });
  if (cu === CU_MODE.Off) meta.push({ Name: "CivUniquesOff", Value: "1" });
  if (cc === CC_MODE.Off) meta.push({ Name: "CivCivicsOff", Value: "1" });
  for (const civs of unbuiltByAge(info, state).values()) shuffleAge(ctx, info, state, civs, { ca, cu, cc, rows });
  return meta;
}

// Each applying builder's civ plays in the game's age (playAge), when the deal knows it.
function setPlayAges(ctx, info) {
  if (!ctx.input.age) return;
  for (const b of ctx.builds || []) if (b.ok && info.has(b.civ)) info.get(b.civ).play = ctx.input.age;
}

// One builder's cards, in the order the parts are settled.
const takeAll = (ctx, state, build, B, { info, riders }) => [
  ...abilitySwap(state, build, B, info),
  ...civicsSwap(state, build, B, info),
  ...uniqueTakes(state, build, B, info, riders),
  ...bulletTakes(ctx, state, build, B, info),
  ...civicTakes(state, build, B, info, riders)
];

// One builder: its verdict and rows.
function oneBuild(ctx, state, info, build, riders) {
  const B = build.civ;
  let why = build.ok ? null : build.why;
  if (why == null && (B == null || !info.has(B))) why = BUILD_WHY.NotInGame;
  if (why != null) return { why, mine: [] };
  const mine = takeAll(ctx, state, build, B, { info, riders });
  state.builtCivs.add(B);
  return { why: mine.length ? null : BUILD_WHY.NoPieces, mine };
}

const newState = () => ({
  taken: new Set(), builtCivs: new Set(), pieced: new Set(), takers: new Set(), uniqueTakers: new Set(),
  nodeTakers: new Set()
});

export function dealCivBuilds(ctx) {
  const riders = riderMaps(ctx.input.civRiders);
  const info = civInfo(ctx.input.civItems || [], ctx.input.civNodes || [], riders);
  const state = newState();
  const rows = [];
  const meta = [];
  setPlayAges(ctx, info);
  for (const build of ctx.builds || []) {
    const { why, mine } = oneBuild(ctx, state, info, build, riders);
    rows.push(...mine);
    meta.push({ Name: metaName(build.slot), Value: why == null ? "ok" : why });
  }
  meta.push(...civShuffle(ctx, info, state, rows));
  abilityTags(rows);
  splitRows(ctx, info, state, rows);
  poolRows(ctx, info, state, rows);
  numberPieces(rows);
  riderRows(rows, riders);
  if (isSplit(ctx)) meta.push({ Name: "CivPiecesActive", Value: "1" });
  rows.sort((a, b) => cmp(a.CivilizationType, b.CivilizationType) || cmp(a.PieceId, b.PieceId));
  return { rows, meta };
}
