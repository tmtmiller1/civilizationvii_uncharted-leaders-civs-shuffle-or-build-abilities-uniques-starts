// Civilization builds (CONTRACTS 14 and 18): what each builder's civilization takes from the civilizations of its
// own age. An ability card swaps abilities with the source civ; a civics card swaps civics trees the same way (the
// tree, its traditions and the buildings, quarters and improvements it unlocks go together); a unique card moves the
// unique; a bonus card (CONTRACTS 19, Civilization abilities = Split) takes that one piece of a civ's ability.
// Slot by slot: a card a lower slot took is gone, a civ a lower slot built can't be a swap source, and a part
// already swapped can't be swapped again. Writes LShufResultCivPieces rows and a CivBuilder<n> meta row per
// builder. Pure, and the SQL twin (scripts/generate/sql-civ.mjs) walks the same steps in the same order.
import { BUILD, BUILD_WHY, CA_MODE, CC_MODE, CU_MODE } from "../lshuf-constants.js";
import { SALT } from "../lshuf-key.js";
import { BALANCE_SCALE, PIECE_STEP_CAP, cmp, compareBy, cyclicDonors, floorDiv, keyMap } from "./lshuf-deal-util.js";

const metaName = (slot) => (slot === 1 ? "CivBuilder" : `CivBuilder${slot}`);

// civ -> { age, ability, tree, uniques: Map type -> kind }
function civInfo(items) {
  const info = new Map();
  for (const i of items) {
    if (!info.has(i.civ)) info.set(i.civ, { age: i.age, ability: null, tree: null, uniques: new Map() });
    const c = info.get(i.civ);
    if (i.kind === "ability") c.ability = i.trait;
    else if (i.kind === "civics") c.tree = i.type;
    else c.uniques.set(i.type, i.kind);
  }
  for (const [civ, c] of info) if (c.ability == null) info.delete(civ);
  return info;
}

function ownerOf(info, type) {
  for (const [civ, c] of info) if (c.uniques.has(type)) return civ;
  return null;
}

// The ability swap, and the civics swap (both civs need a civics tree). part: { idOf, kind, has }.
const ABILITY_PART = { idOf: BUILD.civAbility, kind: "ability", has: () => true };
const CIVICS_PART = { idOf: BUILD.civCivics, kind: "civics", has: (c) => c.tree != null };

// A civ a lower slot took a bonus from can't swap its ability whole any more (CONTRACTS 19).
function swappable(state, S, B, info, part) {
  if (S == null || S === B || !info.has(S) || state.builtCivs.has(S)) return false;
  if (!part.has(info.get(B)) || !part.has(info.get(S)) || info.get(S).age !== info.get(B).age) return false;
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

function uniqueTakes(state, build, B, info) {
  const rows = [];
  for (const type of [...build.civUniques].sort(cmp)) {
    const S = ownerOf(info, type);
    const id = BUILD.civUnique(type);
    if (S == null || S === B || info.get(S).age !== info.get(B).age || state.taken.has(id)) continue;
    state.taken.add(id);
    rows.push({ CivilizationType: B, PieceId: id, FromCivilization: S, Kind: "unique", SortIndex: rows.length + 1 });
  }
  return rows;
}

// --- Civilization abilities = Split (CONTRACTS 19) ---

const isSplit = (ctx) => ((ctx.input.options || {}).CivAbilities || CA_MODE.Normal) === CA_MODE.Split;

// A civ's pieces in play: the mapping's movable bullets of the civ's own age, in id order.
function civPieces(ctx, info, civ) {
  const rows = (ctx.input.civMapping || {})[civ] || [];
  const age = info.get(civ).age;
  return rows
    .filter((r) => r.Kind === "bullet" && r.Movable === 1 && r.Age === age)
    .map((r) => ({ id: r.PieceId, from: civ, index: r.BulletIndex, value: r.Value }));
}

// A civ's ability is in pieces when nobody holds it whole: not swapped by a builder.
const inPieces = (state, civ) => !state.taken.has(BUILD.civAbility(civ));

// The builder's bonus cards (CONTRACTS 19): each takes that one piece when its civ is in the game and of the
// builder's age, the piece is in play and nobody holds it, and the builder's own ability is still in pieces.
function bulletTakes(ctx, state, build, B, info) {
  const rows = [];
  if (!isSplit(ctx) || !inPieces(state, B)) return rows;
  for (const id of [...build.civBullets].sort(cmp)) {
    const S = civOfPiece(ctx, id);
    if (S == null || !info.has(S) || info.get(S).age !== info.get(B).age || !inPieces(state, S)) continue;
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
  for (const c of civs) all.push(...civPieces(ctx, info, c).map((p) => ({ ...p, age: info.get(c).age })));
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
  const civs = [...info.keys()].sort(cmp).filter((c) => inPieces(state, c) && civPieces(ctx, info, c).length > 0);
  const receivers = civs.filter((c) => !state.takers.has(c));
  const keys = keyMap(ctx.seed, SALT.CivPieces, receivers);
  const slots = {};
  for (const c of receivers) {
    slots[c] = { n: civPieces(ctx, info, c).length, got: 0, value: 0, key: keys[c], age: info.get(c).age };
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
function civicsRows(ctx, info, state, civs, { cc, donors, rows }) {
  const forCivics = civs.filter((c) => info.get(c).tree != null && !state.taken.has(BUILD.civCivics(c)));
  let civicsDonors = {};
  if (cc === CC_MODE.Paired) civicsDonors = donors;
  else if (cc === CC_MODE.Shuffled && forCivics.length >= 2) {
    civicsDonors = cyclicDonors(ctx.seed, SALT.CivCivics, forCivics);
  }
  for (const c of civs) {
    const d = civicsDonors[c];
    if (d != null && d !== c && forCivics.includes(d)) rows.push(partRow(CIVICS_PART, c, d));
  }
}

function shuffleAge(ctx, info, state, civs, { ca, cu, cc, rows }) {
  const forAbility = civs.filter((c) => !state.taken.has(BUILD.civAbility(c)));
  const swapped = ca === CA_MODE.Swapped && forAbility.length >= 2;
  const donors = swapped ? cyclicDonors(ctx.seed, SALT.CivAbilities, forAbility) : {};
  for (const c of forAbility) {
    if (donors[c] != null && donors[c] !== c) rows.push(partRow(ABILITY_PART, c, donors[c]));
  }
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

export function dealCivBuilds(ctx) {
  const info = civInfo(ctx.input.civItems || []);
  const state = { taken: new Set(), builtCivs: new Set(), pieced: new Set(), takers: new Set() };
  const rows = [];
  const meta = [];
  for (const build of ctx.builds || []) {
    let why = build.ok ? null : build.why;
    const B = build.civ;
    if (why == null && (B == null || !info.has(B))) why = BUILD_WHY.NotInGame;
    let mine = [];
    if (why == null) {
      mine = [
        ...abilitySwap(state, build, B, info),
        ...civicsSwap(state, build, B, info),
        ...uniqueTakes(state, build, B, info),
        ...bulletTakes(ctx, state, build, B, info)
      ];
      state.builtCivs.add(B);
      if (!mine.length) why = BUILD_WHY.NoPieces;
    }
    rows.push(...mine);
    meta.push({ Name: metaName(build.slot), Value: why == null ? "ok" : why });
  }
  meta.push(...civShuffle(ctx, info, state, rows));
  splitRows(ctx, info, state, rows);
  numberPieces(rows);
  if (isSplit(ctx)) meta.push({ Name: "CivPiecesActive", Value: "1" });
  rows.sort((a, b) => cmp(a.CivilizationType, b.CivilizationType) || cmp(a.PieceId, b.PieceId));
  return { rows, meta };
}
