// Build your own leader (CONTRACTS.md section 13, builder slots): what each builder ticked, sorted into the axes,
// and whether each build applies. The deal modules read `ctx.builds` (slot order); each axis uses only the picks it
// owns, and an axis with no pick of its own deals that builder as usual. A piece ticked for two builders goes to the
// lower slot.
import { BUILD, BUILD_KIND, BUILD_WHY, GENERIC_BIASES, REASON, buildKindOf } from "../lshuf-constants.js";
import { baseReason } from "./lshuf-deal-axes.js";
import { cmp } from "./lshuf-deal-util.js";

const after = (id, prefix) => id.slice(prefix.length);

// The picks by kind. ids are sorted and unique (normalizeConfig), so "the first" is the lowest id.
const ONE_OF = { [BUILD_KIND.Persona]: ["persona", "PERSONA_"], [BUILD_KIND.Bias]: ["bias", "BIAS_"] };

// One id into the picks, by kind.
function sortTerrain(picks, id) {
  if (id.startsWith("GBIAS_")) {
    const tag = after(id, "GBIAS_");
    if (picks.genericBias == null && GENERIC_BIASES.some(([t]) => t === tag)) picks.genericBias = tag;
    return true;
  }
  if (buildKindOf(id) === BUILD_KIND.CivBias) {
    if (picks.civBias == null) picks.civBias = after(id, "CIVBIAS_");
    return true;
  }
  return false;
}

// Civilization cards (CONTRACTS 14): the first ability card, and every unique card.
function sortCiv(picks, id, kind) {
  if (kind === BUILD_KIND.CivAbility) {
    if (picks.civAbility == null) picks.civAbility = after(id, "CIVABIL_");
    return true;
  }
  if (kind === BUILD_KIND.CivUnique) {
    picks.civUniques.push(after(id, "CIVUNQ_"));
    return true;
  }
  if (kind === BUILD_KIND.CivCivics) {
    if (picks.civCivics == null) picks.civCivics = after(id, "CIVCIVC_");
    return true;
  }
  if (kind === BUILD_KIND.CivBullet) {
    picks.civBullets.push(id);
    return true;
  }
  if (kind === BUILD_KIND.CivCivic) {
    picks.civCivicNodes.push(id);
    return true;
  }
  return false;
}

function sortOne(picks, id, attrTraits, majors) {
  const kind = buildKindOf(id);
  if (sortTerrain(picks, id) || sortCiv(picks, id, kind)) return;
  if (kind === BUILD_KIND.Whole) {
    const leader = id.slice(0, -"__WHOLE".length);
    if (majors.has(leader)) picks.wholes.push(leader);
  } else if (kind === BUILD_KIND.Bullet) picks.bullets.push(id);
  else if (kind === BUILD_KIND.Attribute) {
    const trait = BUILD.attributeTrait(id);
    if (attrTraits.includes(trait)) picks.attrs.push({ trait, copy: BUILD.attributeCopy(id) });
  } else {
    const [field, prefix] = ONE_OF[kind];
    const leader = after(id, prefix);
    if (picks[field] == null && majors.has(leader)) picks[field] = leader;
  }
}

function sortPicks(ids, attrTraits, majors) {
  const picks = {
    wholes: [], bullets: [], attrs: [], persona: null, bias: null, genericBias: null, civBias: null, civAbility: null,
    civUniques: [], civCivics: null, civBullets: [], civCivicNodes: []
  };
  for (const id of ids) sortOne(picks, id, attrTraits, majors);
  picks.wholes.sort(cmp);
  // Kind by kind, first copy before second, as the SQL takes them.
  picks.attrs.sort((x, y) => cmp(x.trait, y.trait) || x.copy - y.copy);
  picks.attrs = picks.attrs.map((a) => a.trait);
  return picks;
}

// The civilization cards that build with Leader shuffle on Base game (CONTRACTS 14): everything on the civ screen
// but its start terrain, which belongs to the start terrain part.
const CIV_ONLY_KINDS = new Set([
  BUILD_KIND.CivAbility, BUILD_KIND.CivBullet, BUILD_KIND.CivUnique, BUILD_KIND.CivCivics, BUILD_KIND.CivCivic
]);
export const isCivOnlyPiece = (id) => CIV_ONLY_KINDS.has(buildKindOf(id));

// ctx.builds: one per builder slot, in slot order: { slot, leader, civ, ok, why, wholes, bullets, attrs, persona,
// bias, civBias }. ok needs the builder a major in the game with no base reason against it and no lower slot
// building the same leader, and at least one pick left after lower slots took theirs. With Leader shuffle on Base
// game only the civilization cards count, and a builder with none of them is ModeOff.
// A human keeping their own leader still builds their civilization while Keep my built civilization is on: that
// builder takes its civilization cards only. A kept builder with no civilization card stays Not in game.
function keptCivBuild(ctx, b) {
  const l = ctx.byType.get(b.leader);
  return ctx.input.options.KeepBuiltCiv === "1" && !!l && baseReason(l) === REASON.Kept && b.pieces.some(isCivOnlyPiece);
}

function builderWhy(ctx, b, civOnly, keptCiv, leaders) {
  const l = ctx.byType.get(b.leader);
  if (civOnly && !b.pieces.some(isCivOnlyPiece)) return BUILD_WHY.ModeOff;
  if (!l || (baseReason(l) != null && !keptCiv) || leaders.has(b.leader)) return BUILD_WHY.NotInGame;
  return null;
}

export function buildStates(ctx) {
  const majors = new Set(ctx.majors);
  const leaders = new Set();
  const claimed = new Set();
  const out = [];
  const civOnly = !ctx.f.active;
  for (const b of ctx.input.builders) {
    // The host on its own mode (CONTRACTS 33): every card counts, whatever the AI rows say (lshuf-deal-own.js).
    if (ctx.own && b.slot === 1 && b.leader === ctx.own.leader) {
      const pieces = b.pieces.filter((id) => !claimed.has(id));
      leaders.add(b.leader);
      for (const id of pieces) claimed.add(id);
      out.push({ slot: b.slot, leader: b.leader, civ: b.civ, ok: true, why: null, own: true,
        ...sortPicks(pieces, ctx.input.attrTraits, majors) });
      continue;
    }
    const keptCiv = keptCivBuild(ctx, b);
    const civPiecesOnly = civOnly || keptCiv;
    let why = builderWhy(ctx, b, civOnly, keptCiv, leaders);
    const counts = (id) => !claimed.has(id) && (!civPiecesOnly || isCivOnlyPiece(id));
    const pieces = why == null ? b.pieces.filter(counts) : [];
    if (why == null && !pieces.length) why = BUILD_WHY.NoPieces;
    if (why == null) {
      leaders.add(b.leader);
      for (const id of pieces) claimed.add(id);
    }
    const picks = sortPicks(pieces, ctx.input.attrTraits, majors);
    out.push({ slot: b.slot, leader: b.leader, civ: b.civ, ok: why == null, why, ...picks });
  }
  return out;
}

// The builds that apply and whose builder is in this axis's pool, in slot order.
export function buildsFor(ctx, state) {
  return (ctx.builds || []).filter((b) => b.ok && state.dealtSet.has(b.leader));
}

export const buildOf = (ctx, leader) => (ctx.builds || []).find((b) => b.ok && b.leader === leader) || null;
export const isBuilder = (ctx, leader) => buildOf(ctx, leader) != null;
