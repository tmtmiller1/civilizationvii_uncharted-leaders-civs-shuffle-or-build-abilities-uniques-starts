// Build your own leader (CONTRACTS.md section 13, builder slots): what each builder ticked, sorted into the axes,
// and whether each build applies. The deal modules read `ctx.builds` (slot order); each axis uses only the picks it
// owns, and an axis with no pick of its own deals that builder as usual. A piece ticked for two builders goes to the
// lower slot.
import { BUILD, BUILD_KIND, BUILD_WHY, GENERIC_BIASES, buildKindOf } from "../lshuf-constants.js";
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
    civUniques: [], civCivics: null, civBullets: []
  };
  for (const id of ids) sortOne(picks, id, attrTraits, majors);
  picks.wholes.sort(cmp);
  // Kind by kind, first copy before second, as the SQL takes them.
  picks.attrs.sort((x, y) => cmp(x.trait, y.trait) || x.copy - y.copy);
  picks.attrs = picks.attrs.map((a) => a.trait);
  return picks;
}

// ctx.builds: one per builder slot, in slot order: { slot, leader, civ, ok, why, wholes, bullets, attrs, persona,
// bias, civBias }. ok needs Leader shuffle on, the builder a major in the game with no base reason against it and
// no lower slot building the same leader, and at least one pick left after lower slots took theirs.
export function buildStates(ctx) {
  const majors = new Set(ctx.majors);
  const leaders = new Set();
  const claimed = new Set();
  const out = [];
  for (const b of ctx.input.builders) {
    const l = ctx.byType.get(b.leader);
    let why = null;
    if (!ctx.f.active) why = BUILD_WHY.ModeOff;
    else if (!l || baseReason(l) != null || leaders.has(b.leader)) why = BUILD_WHY.NotInGame;
    const pieces = why == null ? b.pieces.filter((id) => !claimed.has(id)) : [];
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
