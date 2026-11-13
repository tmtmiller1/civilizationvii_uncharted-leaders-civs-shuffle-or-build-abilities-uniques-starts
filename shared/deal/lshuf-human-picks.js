// Your share from your own mode (CONTRACTS 33). With "Follow the AI players' settings" unticked, the host plays its
// own Leader mode and Civilization mode: this runs the deal once more over the same input with the leader and
// civilization rows set from those two presets, reads what the host's leader and civilization got, and returns it
// as build card ids. The setup side merges them into slot 1's picks, so the game's deal treats the host as a
// builder and its share loads the same in a saved game and in every later age. Pure: imports only from shared/.
import {
  A_MODE, B_MODE, BIAS_TAG_WORDS, BUILD, BUILD_KIND, CIV_PRESETS, CU_MODE, CC_MODE, CA_MODE, GENERIC_BIASES, PRESETS,
  PRESET_PERSONA, T_MODE, buildKindOf
} from "../lshuf-constants.js";
import { computeDeal } from "./lshuf-deal.js";

// The part a card belongs to; a hand-built card of a part replaces the generated cards of that part.
export function pickPart(id) {
  const kind = buildKindOf(id);
  if (id.startsWith("GBIAS_") || kind === BUILD_KIND.Bias) return "terrain";
  if (kind === BUILD_KIND.CivBias) return "civterrain";
  if (kind === BUILD_KIND.Attribute) return "attributes";
  if (kind === BUILD_KIND.Persona) return "agendas";
  if (kind === BUILD_KIND.CivAbility || kind === BUILD_KIND.CivBullet) return "civability";
  if (kind === BUILD_KIND.CivUnique) return "uniques";
  if (kind === BUILD_KIND.CivCivics || kind === BUILD_KIND.CivCivic) return "civics";
  return "abilities";
}

// Hand-built cards first; a generated card is added only when no hand-built card covers its part.
export function mergePicks(hand, generated) {
  const parts = new Set(hand.map(pickPart));
  const out = [...hand];
  for (const id of generated) if (!parts.has(pickPart(id)) && !out.includes(id)) out.push(id);
  return out;
}

// The deal options a human mode stands for: the leader rows (and agendas) from its preset, the civilization rows
// from the civilization preset, everything else as the setup has it.
export function humanOptions(options, humanMode, humanCivMode) {
  const out = { ...options, HumanFollows: "1" };
  const lp = PRESETS[humanMode];
  if (lp) {
    [out.Abilities, out.Attributes, out.Biases] = lp;
    out.Mode = humanMode;
    if (PRESET_PERSONA[humanMode]) out.Personality = PRESET_PERSONA[humanMode];
  }
  const cp = CIV_PRESETS[humanCivMode];
  if (cp) [out.CivAbilities, out.CivUniques, out.CivCivics] = cp;
  return out;
}

const biasTag = (r) => {
  if (r.TargetType != null) return String(r.TargetType);
  // A table with no target column has one word for its tag (StartBiasRivers -> RIVER and so on).
  const hit = Object.entries(BIAS_TAG_WORDS).find(([, table]) => table === r.TableName);
  return hit ? hit[0] : null;
};

function pieceIds(deal, host) {
  const ids = [];
  for (const p of deal.pieces.filter((x) => x.LeaderType === host)) {
    if (p.Kind === "bullet" || (p.Kind === "whole" && p.FromLeaderType !== host)) ids.push(p.PieceId);
  }
  return ids;
}

const attributeIds = (deal, host) => deal.attributes
  .filter((x) => x.LeaderType === host && x.FromLeaderType != null)
  .map((a) => BUILD.attribute(a.TraitType, Number(a.Copy || 0) + 1));

// Start terrain: the leader whose rows the host took, else (rolled or made from tags) the strongest row's tag as one
// generic card, since a build holds one start terrain card.
function terrainIds(deal, host, row) {
  if (row.BiasFrom != null && row.BiasFrom !== host) return [BUILD.bias(row.BiasFrom)];
  const rows = deal.biases.filter((b) => b.LeaderType === host && (b.Origin === "rolled" || b.Origin === "tags"));
  rows.sort((x, y) => Number(y.Score || 0) - Number(x.Score || 0));
  const tag = rows.map(biasTag).find((t) => t && GENERIC_BIASES.some(([g]) => g === t));
  return tag ? [BUILD.genericBias(tag)] : [];
}

function leaderIds(deal, host, opts) {
  const row = deal.leaders.find((l) => l.LeaderType === host);
  if (!row) return [];
  return [
    ...(opts.Abilities !== A_MODE.Normal ? pieceIds(deal, host) : []),
    ...(opts.Attributes !== T_MODE.Normal ? attributeIds(deal, host) : []),
    ...(row.PersonaFrom != null && row.PersonaFrom !== host ? [BUILD.persona(row.PersonaFrom)] : []),
    ...(opts.Biases !== B_MODE.Normal ? terrainIds(deal, host, row) : [])
  ];
}

const CIV_KINDS = new Set(["ability", "bullet", "unique", "civics", "civic"]);

function civIds(deal, civ, opts) {
  if (!civ) return [];
  const parts = {
    ability: opts.CivAbilities, bullet: opts.CivAbilities, unique: opts.CivUniques, civics: opts.CivCivics,
    civic: opts.CivCivics
  };
  const normal = { ability: CA_MODE.Normal, bullet: CA_MODE.Normal, unique: CU_MODE.Normal, civics: CC_MODE.Normal,
    civic: CC_MODE.Normal };
  return (deal.civPieces || [])
    .filter((r) => r.CivilizationType === civ && CIV_KINDS.has(r.Kind) && r.FromCivilization !== civ)
    .filter((r) => parts[r.Kind] !== normal[r.Kind])
    .map((r) => r.PieceId);
}

// input: buildDealInput(readTable, config) for the setup as it stands. host: { leader, civ } (civ null while Random).
// Returns the card ids, sorted and unique; [] when the host isn't a leader in the input.
export function humanPicks(input, config, humanMode, humanCivMode, host) {
  const leader = host && host.leader;
  if (!leader || !input.leaders.some((l) => l.type === leader)) return [];
  const opts = humanOptions(input.options || (config && config.options) || {}, humanMode, humanCivMode);
  // The host plays its own mode even with "Human players keep their own leader" on, and builds nothing here.
  const leaders = input.leaders.map((l) => (l.type === leader ? { ...l, kept: false } : l));
  const deal = computeDeal({ ...input, options: opts, leaders, builders: [] });
  const ids = [...leaderIds(deal, leader, opts), ...civIds(deal, host.civ || null, opts)];
  return [...new Set(ids)].sort();
}
