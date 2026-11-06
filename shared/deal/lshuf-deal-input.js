// buildDealInput: reads the tables of CONTRACTS.md section 4.2 through readTable(name) and the config object of
// section 5.2 into one plain object computeDeal() works from. Nothing here depends on row order.
import { BIAS_TABLES, BIAS_TARGET_COLUMN, OPTION_DEFAULTS } from "../lshuf-constants.js";
import { LEADER_TYPE_REQUIREMENT, cmp, groupBy, sortIds } from "./lshuf-deal-util.js";

const BOOL_OPTIONS = ["KeepMine", "ModdedAbilities", "ModdedAttributes", "ModdedBiases"];

function safeRows(readTable, name) {
  try {
    const rows = readTable(name);
    return Array.isArray(rows) ? rows : [];
  } catch (_e) {
    return [];
  }
}

function normalizeOptions(options) {
  const out = { ...OPTION_DEFAULTS };
  for (const name of Object.keys(OPTION_DEFAULTS)) {
    const value = options ? options[name] : undefined;
    if (value == null) continue;
    if (BOOL_OPTIONS.includes(name)) out[name] = value === true || String(value) === "1" ? "1" : "0";
    else out[name] = String(value);
  }
  return out;
}

export function normalizeConfig(config) {
  const c = config || {};
  const seedNum = Number(c.seed);
  const out = Array.isArray(c.out) ? c.out : [];
  return {
    seed: c.seed != null && Number.isInteger(seedNum) ? seedNum : 1,
    options: normalizeOptions(c.options),
    kept: sortIds((c.kept || []).map(String)),
    out: out.map((r) => ({ LeaderType: String(r.LeaderType), Reason: String(r.Reason) })),
    modOK: sortIds((c.modOK || []).map(String))
  };
}

function requirementLookup(read) {
  const typeOf = new Map(read("Requirements").map((r) => [r.RequirementId, r.RequirementType]));
  const bySet = groupBy(read("RequirementSetRequirements"), (r) => r.RequirementSetId);
  const modifiers = new Map(read("Modifiers").map((r) => [r.ModifierId, r]));
  const setHasLeaderType = (setId) =>
    setId != null && (bySet.get(setId) || []).some((r) => typeOf.get(r.RequirementId) === LEADER_TYPE_REQUIREMENT);
  return (modifierId) => {
    const m = modifiers.get(modifierId);
    return !!m && (setHasLeaderType(m.OwnerRequirementSetId) || setHasLeaderType(m.SubjectRequirementSetId));
  };
}

function readLeaders(read, config) {
  const majors = sortIds(read("Leaders").filter((r) => Number(r.IsMajorLeader) === 1).map((r) => r.LeaderType));
  const traitName = new Map(read("Traits").map((r) => [r.TraitType, r.Name]));
  const attrTraits = new Set(read("LShufAttributeTraits").map((r) => r.TraitType));
  const traitsOf = groupBy(read("LeaderTraits"), (r) => r.LeaderType);
  const modsOf = groupBy(read("TraitModifiers"), (r) => r.TraitType);
  const known = new Map(read("LShufKnownLeaders").map((r) => [r.LeaderType, r]));
  const outOf = groupBy(config.out, (r) => r.LeaderType);
  const usesLeaderType = requirementLookup(read);
  return majors.map((type) => {
    const traits = sortIds((traitsOf.get(type) || []).map((r) => r.TraitType));
    const ability = traits.find((t) => traitName.get(t) != null) || null;
    const mods = ability ? sortIds((modsOf.get(ability) || []).map((r) => r.ModifierId)) : [];
    const reasons = sortIds((outOf.get(type) || []).map((r) => r.Reason));
    const k = known.get(type);
    return {
      type,
      ability,
      abilityName: ability ? traitName.get(ability) : null,
      attrs: traits.filter((t) => attrTraits.has(t)),
      mods,
      known: !!k,
      modded: !!k && Number(k.IsModded) === 1,
      kept: config.kept.includes(type),
      outReason: reasons.length ? reasons[0] : null,
      modOK: config.modOK.includes(type),
      leaderTypeReq: mods.some(usesLeaderType)
    };
  });
}

function readMapping(read) {
  const rows = read("LShufMapping").map((r) => ({
    PieceId: r.PieceId,
    LeaderType: r.LeaderType,
    AbilityTrait: r.AbilityTrait,
    Kind: r.Kind,
    BulletIndex: r.BulletIndex == null ? 0 : Number(r.BulletIndex),
    BiasTags: r.BiasTags == null ? null : String(r.BiasTags),
    Value: Number(r.Value == null ? 1 : r.Value),
    Movable: Number(r.Movable == null ? 1 : r.Movable),
    Reviewed: Number(r.Reviewed == null ? 0 : r.Reviewed)
  }));
  rows.sort((a, b) => cmp(a.PieceId, b.PieceId));
  const mapping = {};
  for (const [leader, list] of groupBy(rows, (r) => r.LeaderType)) mapping[leader] = list;
  const mapMods = {};
  for (const [piece, list] of groupBy(read("LShufMappingModifiers"), (r) => r.PieceId)) {
    mapMods[piece] = list
      .map((r) => ({ ModifierId: r.ModifierId, Role: r.Role }))
      .sort((a, b) => cmp(a.ModifierId, b.ModifierId));
  }
  const unlockPiece = {};
  for (const r of read("LShufMappingUnlocks")) {
    if (r.PieceId != null) unlockPiece[`${r.ProgressionTreeNodeType}|${r.TargetType}`] = r.PieceId;
  }
  const reviewed = {};
  for (const r of read("LShufReviewedSets")) reviewed[r.AbilityTrait] = String(r.ModifierSet);
  return { mapping, mapMods, unlockPiece, reviewed };
}

function readUnlocks(read, leaders) {
  const abilities = new Set(leaders.map((l) => l.ability).filter(Boolean));
  const treeOf = new Map(read("ProgressionTreeNodes").map((r) => [r.ProgressionTreeNodeType, r.ProgressionTree]));
  const seen = new Set();
  const out = [];
  for (const r of read("ProgressionTreeNodeUnlocks")) {
    const id = `${r.ProgressionTreeNodeType}|${r.TargetType}`;
    if (!abilities.has(r.RequiredTraitType) || seen.has(id)) continue;
    seen.add(id);
    out.push({
      node: r.ProgressionTreeNodeType,
      target: r.TargetType,
      trait: r.RequiredTraitType,
      tree: treeOf.has(r.ProgressionTreeNodeType) ? treeOf.get(r.ProgressionTreeNodeType) : null
    });
  }
  return out.sort((a, b) => cmp(a.node, b.node) || cmp(a.target, b.target));
}

function readAttributeTrees(read) {
  const treeOfAttr = new Map(read("Attributes").map((r) => [r.AttributeType, r.ProgressionTreeType]));
  return read("LShufAttributeTraits")
    .map((r) => ({
      trait: r.TraitType,
      tree: treeOfAttr.has(r.AttributeType) ? treeOfAttr.get(r.AttributeType) : null
    }))
    .filter((r) => r.tree != null)
    .sort((a, b) => cmp(a.trait, b.trait));
}

function readBiasRows(read) {
  const out = [];
  for (const table of BIAS_TABLES) {
    const col = BIAS_TARGET_COLUMN[table];
    for (const r of read(table)) {
      if (r.LeaderType == null && r.CivilizationType == null) continue;
      out.push({
        TableName: table,
        LeaderType: r.LeaderType == null ? null : r.LeaderType,
        CivilizationType: r.CivilizationType == null ? null : r.CivilizationType,
        TargetType: col && r[col] != null ? r[col] : null,
        Score: Number(r.Score == null ? 0 : r.Score)
      });
    }
  }
  return out;
}

function readCivs(read) {
  const seen = new Map();
  for (const r of read("LegacyCivilizations")) if (!seen.has(r.CivilizationType)) seen.set(r.CivilizationType, r.Age);
  return [...seen.keys()].sort(cmp).map((type) => ({ type, age: seen.get(type) == null ? "" : String(seen.get(type)) }));
}

export function buildDealInput(readTable, config) {
  const cfg = normalizeConfig(config);
  const read = (name) => safeRows(readTable, name);
  const leaders = readLeaders(read, cfg);
  return {
    seed: cfg.seed,
    options: cfg.options,
    leaders,
    ...readMapping(read),
    unlocks: readUnlocks(read, leaders),
    attrTrees: readAttributeTrees(read),
    civs: readCivs(read),
    biasRows: readBiasRows(read)
  };
}
