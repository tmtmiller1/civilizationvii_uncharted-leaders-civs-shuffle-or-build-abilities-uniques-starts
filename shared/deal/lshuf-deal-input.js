// buildDealInput: reads the tables of CONTRACTS.md section 4.2 through readTable(name) and the config object of
// section 5.2 into one plain object computeDeal() works from. Nothing here depends on row order.
import {
  A_MODE, B_MODE, BIAS_TABLES, BIAS_TARGET_COLUMN, OPTION_DEFAULTS, PRESETS, T_MODE
} from "../lshuf-constants.js";
import { LEADER_TYPE_REQUIREMENT, cmp, groupBy, sortIds } from "./lshuf-deal-util.js";

const BOOL_OPTIONS = ["KeepMine", "KeepBuiltCiv", "ModdedAbilities", "ModdedAttributes", "ModdedBiases", "HumanFollows"];

function safeRows(readTable, name) {
  try {
    const rows = readTable(name);
    return Array.isArray(rows) ? rows : [];
  } catch (_e) {
    return [];
  }
}

const PART_VALUES = { Abilities: A_MODE, Attributes: T_MODE, Biases: B_MODE };
const PART_INDEX = { Abilities: 0, Attributes: 1, Biases: 2 };

// A part's value: one of its own values stays; anything else (an old save's LSHUF_REDEALT, a missing value) reads
// as the preset's part when Mode is a preset, else Normal (CONTRACTS 15).
function partValue(name, value, mode) {
  const values = Object.values(PART_VALUES[name]);
  if (values.includes(value)) return value;
  const preset = PRESETS[mode];
  return preset ? preset[PART_INDEX[name]] : PART_VALUES[name].Normal;
}

function normalizeOptions(options) {
  const out = { ...OPTION_DEFAULTS };
  for (const name of Object.keys(OPTION_DEFAULTS)) {
    const value = options ? options[name] : undefined;
    if (value == null) continue;
    if (BOOL_OPTIONS.includes(name)) out[name] = value === true || String(value) === "1" ? "1" : "0";
    else out[name] = String(value);
  }
  for (const name of Object.keys(PART_VALUES)) {
    const given = options ? options[name] : undefined;
    out[name] = partValue(name, given == null ? undefined : String(given), out.Mode);
  }
  return out;
}

// Build your own leader: { leader, civ, pieces } with a leader, or null (CONTRACTS section 13).
export function normalizeBuilder(b, slot = 1) {
  if (!b || b.leader == null || String(b.leader) === "") return null;
  return {
    slot: Number(b.slot || slot),
    leader: String(b.leader),
    civ: b.civ == null || String(b.civ) === "" ? null : String(b.civ),
    pieces: sortIds((b.pieces || []).map(String).filter((id) => id !== ""))
  };
}

// config.builders: every builder slot, in slot order; config.builder alone means slot 1 (CONTRACTS 13).
export function normalizeBuilders(c) {
  const list = Array.isArray(c.builders) ? c.builders : [];
  const out = list.map((b, i) => normalizeBuilder(b, i + 1)).filter(Boolean);
  const one = normalizeBuilder(c.builder, 1);
  if (one && !out.find((b) => b.slot === 1)) out.push(one);
  out.sort((a, b) => a.slot - b.slot);
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
    modOK: sortIds((c.modOK || []).map(String)),
    builders: normalizeBuilders(c),
    // The age the game is in (the setup's start age, or the age the database was loaded for); "" when unknown.
    age: c.age == null ? "" : String(c.age)
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
  return { mapping, mapMods, unlockPiece, reviewed, ...readCivMapping(read) };
}

// The civilization mapping (CONTRACTS 19): civMapping[civ] = its bullet rows in id order, civMapMods[piece] = the
// modifiers behind a piece.
function readCivMapping(read) {
  const rows = read("LShufCivMapping").map((r) => ({
    PieceId: String(r.PieceId),
    CivilizationType: String(r.CivilizationType),
    Age: r.Age == null ? "" : String(r.Age),
    AbilityTrait: r.AbilityTrait == null ? null : String(r.AbilityTrait),
    Kind: String(r.Kind),
    BulletIndex: r.BulletIndex == null ? 0 : Number(r.BulletIndex),
    Value: Number(r.Value == null ? 1 : r.Value),
    Movable: Number(r.Movable == null ? 1 : r.Movable)
  }));
  rows.sort((a, b) => cmp(a.PieceId, b.PieceId));
  const civMapping = {};
  for (const [civ, list] of groupBy(rows, (r) => r.CivilizationType)) civMapping[civ] = list;
  const civMapMods = {};
  for (const [piece, list] of groupBy(read("LShufCivMappingModifiers"), (r) => r.PieceId)) {
    civMapMods[piece] = list
      .map((r) => ({ ModifierId: r.ModifierId, Role: r.Role }))
      .sort((a, b) => cmp(a.ModifierId, b.ModifierId));
  }
  let boundPieces = new Set();
  try {
    boundPieces = new Set(read("LShufBoundPieces").map((r) => String(r.PieceId)));
  } catch (_) {
    boundPieces = new Set();
  }
  // The pieces an age leaves with nothing to do (LShufCivPieceDead), as "piece|age".
  let civDead = new Set();
  try {
    civDead = new Set(read("LShufCivPieceDead").map((r) => `${r.PieceId}|${r.Age}`));
  } catch (_) {
    civDead = new Set();
  }
  return { civMapping, civMapMods, boundPieces, civDead };
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

// Each civilization's ability and uniques (CONTRACTS 14): the setup copy's LShufSetup_CivItems where it exists
// (read as "CivItems" through the setup side's table mapping); in the game and the tests, the same list from the
// gameplay tables. Rows: { civ, age, kind, type, trait }, kind 'ability' | 'unit' | 'building' | 'quarter' |
// 'improvement'; a building inside a unique quarter rides with the quarter.
// The youngest age each civ is listed for, and each civ's ability trait (the lowest TRAIT_<X>_ABILITY it holds).
function civAgesAndAbilities(read) {
  const ages = new Map();
  for (const r of read("LegacyCivilizations")) {
    const age = r.Age == null ? "" : String(r.Age);
    if (!ages.has(r.CivilizationType) || cmp(age, ages.get(r.CivilizationType)) < 0) ages.set(r.CivilizationType, age);
  }
  const abilities = new Map();
  for (const r of read("CivilizationTraits")) {
    if (!/^TRAIT_.+_ABILITY$/.test(String(r.TraitType))) continue;
    const have = abilities.get(r.CivilizationType);
    if (have == null || cmp(r.TraitType, have) < 0) abilities.set(r.CivilizationType, r.TraitType);
  }
  return { ages, abilities };
}

// Every type a civilization's own civics tree unlocks (any TREE_CIVICS_* tree but an age's main one), and every
// type some other tree unlocks: { civic, main }.
function unlockedTypes(read) {
  const treeOf = new Map(read("ProgressionTreeNodes").map((n) => [n.ProgressionTreeNodeType, String(n.ProgressionTree || "")]));
  const civic = new Set();
  const main = new Set();
  for (const u of read("ProgressionTreeNodeUnlocks")) {
    const tree = treeOf.get(u.ProgressionTreeNodeType) || "";
    if (tree.startsWith("TREE_CIVICS_") && !tree.endsWith("_MAIN")) civic.add(u.TargetType);
    else main.add(u.TargetType);
  }
  return { civic, main };
}

// A unit family (its base and every base_<x> unit) only the civ's own civics unlock belongs to the civics
// (CONTRACTS 18): it isn't a unique card and stays on the base trait.
// A great person whose class asks for a quarter or constructible that a civ civics tree unlocks (CONTRACTS 23 R1) is
// part of the civics too: only a civ holding that quarter can earn one.
function civicOnlyFamily(base, units, unlocked, gpUnits = new Set()) {
  const family = units.filter((u) => u.TraitType === base.TraitType
    && (u.UnitType === base.UnitType || String(u.UnitType).startsWith(`${base.UnitType}_`)));
  if (family.some((u) => gpUnits.has(u.UnitType))) return true;
  return family.some((u) => unlocked.civic.has(u.UnitType)) && !family.some((u) => unlocked.main.has(u.UnitType));
}

// The static unit-to-civic links; a database without the table (an older setup copy) has none.
function unitLinks(read) {
  try {
    return read("LShufCivUnitLinks") || [];
  } catch {
    return [];
  }
}

// Great person class units tied to a civics-unlocked quarter (its BuildingType1) or constructible (CONTRACTS 23 R1),
// with the type that ties them: Map UnitType -> anchor type.
function civicGreatPeople(read, unlocked) {
  const quarters = new Map(read("UniqueQuarters").map((q) => [q.UniqueQuarterType, q.BuildingType1]));
  const out = new Map();
  for (const g of read("GreatPersonClasses")) {
    const b1 = g.UniqueQuarterType == null ? null : quarters.get(g.UniqueQuarterType);
    if (b1 != null && unlocked.civic.has(b1)) out.set(String(g.UnitType), String(b1));
    else if (g.ConstructibleType != null && unlocked.civic.has(g.ConstructibleType)) {
      out.set(String(g.UnitType), String(g.ConstructibleType));
    }
  }
  // A unit family a civic of the civ's own tree names in a modifier (LShufCivUnitLinks: the Samurai and Kinsei).
  const nodes = new Set(read("ProgressionTreeNodes").map((n) => String(n.ProgressionTreeNodeType)));
  for (const l of unitLinks(read)) if (nodes.has(String(l.NodeType))) out.set(String(l.UnitType), String(l.NodeType));
  return out;
}

// requirement set -> the TraitType arguments of its requirements.
function traitsOfSets(read) {
  const traitOfReq = new Map();
  for (const a of read("RequirementArguments")) if (a.Name === "TraitType") traitOfReq.set(a.RequirementId, a.Value);
  const out = new Map();
  for (const r of read("RequirementSetRequirements")) {
    const trait = traitOfReq.get(r.RequirementId);
    if (!trait) continue;
    if (!out.has(r.RequirementSetId)) out.set(r.RequirementSetId, []);
    out.get(r.RequirementSetId).push(trait);
  }
  return out;
}

// base trait -> the civics tree its reveal modifier names (CONTRACTS 18).
function civTrees(read) {
  const treeOfMod = new Map();
  for (const a of read("ModifierArguments")) {
    if (a.Name === "ProgressionTreeType" && String(a.Value).startsWith("TREE_CIVICS_")) treeOfMod.set(a.ModifierId, a.Value);
  }
  const traitsOf = traitsOfSets(read);
  const out = new Map();
  for (const m of read("Modifiers")) {
    const tree = treeOfMod.get(m.ModifierId);
    if (!tree) continue;
    for (const trait of traitsOf.get(m.SubjectRequirementSetId) || []) if (!out.has(trait)) out.set(trait, tree);
  }
  return out;
}

// The unit families that are unique cards: each family's base, less a great person the game only grants (since 1.5.1
// a civ's great person can't be trained; the ability's grant modifiers carry it) and a family the civics carry.
function unitCardRows(read, units, unlocked) {
  const gpUnits = new Set(civicGreatPeople(read, unlocked).keys());
  const isBase = (r) => !units.some((p) => p.TraitType === r.TraitType && String(r.UnitType).startsWith(`${p.UnitType}_`));
  const grantedGp = new Set(read("GreatPersonClasses").map((g) => String(g.UnitType)));
  const granted = (r) => Number(r.CanTrain) === 0 && grantedGp.has(String(r.UnitType));
  return units.filter((r) => isBase(r) && !granted(r) && !civicOnlyFamily(r, units, unlocked, gpUnits));
}

function civItemsFromTables(read) {
  const { ages, abilities } = civAgesAndAbilities(read);
  const byBase = new Map();
  for (const [civ, trait] of abilities) byBase.set(trait.slice(0, -"_ABILITY".length), civ);
  const out = [];
  const item = (kind, type, trait) => {
    const civ = byBase.get(trait);
    out.push({ civ, age: ages.has(civ) ? ages.get(civ) : "", kind, type, trait });
  };
  for (const [civ, trait] of abilities) out.push({ civ, age: ages.has(civ) ? ages.get(civ) : "", kind: "ability", type: civ, trait });
  // Buildings and quarters unlock from the civ's own civics tree and move with "Unique civics" (CONTRACTS 18), so
  // the uniques here are unit families and improvements.
  const owned = (list) => list.filter((r) => byBase.has(r.TraitType));
  // One card per unit family: a base is a unit no shorter unit of the same trait prefixes (UNIT_LOGIOS, not
  // UNIT_LOGIOS_PLATO); the family moves with its base.
  const unlocked = unlockedTypes(read);
  for (const r of unitCardRows(read, owned(read("Units")), unlocked)) item("unit", r.UnitType, r.TraitType);
  // An improvement the civ's own civics tree unlocks moves with the civics (CONTRACTS 18), as do buildings and
  // quarters; the civics card is the tree the trait's reveal modifier names.
  for (const r of owned(read("Improvements"))) {
    if (!unlocked.civic.has(r.ConstructibleType)) item("improvement", r.ConstructibleType, r.TraitType);
  }
  const trees = civTrees(read);
  for (const [civ, trait] of abilities) {
    const tree = trees.get(trait.slice(0, -"_ABILITY".length));
    if (tree) out.push({ civ, age: ages.has(civ) ? ages.get(civ) : "", kind: "civics", type: tree, trait });
  }
  return out;
}

function readCivItems(read) {
  const copy = read("CivItems");
  const rows = copy.length
    ? copy.map((r) => ({
      civ: String(r.CivilizationType), age: r.Age == null ? "" : String(r.Age), kind: String(r.Kind),
      type: String(r.Type), trait: r.TraitType == null ? null : String(r.TraitType)
    }))
    : civItemsFromTables(read);
  return rows.sort((a, b) => cmp(a.civ, b.civ) || cmp(a.kind, b.kind) || cmp(a.type, b.type));
}

// Each civilization's own civics, one row per node of its civics tree (CONTRACTS 21): the setup copy's
// LShufSetup_CivicNodes where it exists (read as "CivicNodes"), else ProgressionTreeNodes through the civics cards'
// trees. Rows: { civ, node, cost }.
function readCivNodes(read, civItems) {
  const copy = read("CivicNodes");
  let out;
  if (copy.length) {
    out = copy.map((r) => ({ civ: String(r.CivilizationType), node: String(r.NodeType), cost: Number(r.Cost || 0) }));
  } else {
    const civOfTree = new Map(civItems.filter((i) => i.kind === "civics").map((i) => [i.type, i.civ]));
    out = [];
    for (const n of read("ProgressionTreeNodes")) {
      const civ = civOfTree.get(String(n.ProgressionTree));
      if (civ) out.push({ civ, node: String(n.ProgressionTreeNodeType), cost: Number(n.Cost || 0) });
    }
  }
  return out.sort((a, b) => cmp(a.civ, b.civ) || cmp(a.node, b.node));
}

// Items that ride with another (CONTRACTS 23 R2, R3): [{ kind, civ, lead, rider }], ids CIVNODE_ / CIVUNQ_. The setup
// copy's LShufSetup_CivRiders (read as "CivRiders") wherever the copy's civ items are read; else from the gameplay
// tables. Civic bundles: the nodes unlocking a unique quarter's two buildings, and LShufCivLinks pairs, unioned per
// civ, lead the lowest node. Unique bundles: an item only one builder unit builds rides with that unit's card.
function deriveCivRiders(read, civItems, civNodes) {
  return [...civicRiders(read, civNodes), ...uniqueRiders(read, civItems)];
}

// The lowest civ-tree node unlocking each type.
function nodesUnlocking(read, civOfNode) {
  const nodesOf = new Map();
  for (const u of read("ProgressionTreeNodeUnlocks")) {
    if (!civOfNode.has(u.ProgressionTreeNodeType)) continue;
    const have = nodesOf.get(u.TargetType);
    if (have == null || cmp(u.ProgressionTreeNodeType, have) < 0) nodesOf.set(u.TargetType, u.ProgressionTreeNodeType);
  }
  return nodesOf;
}

// Pairs of one civ's nodes that go together: a quarter's two buildings, and the LShufCivLinks rows.
function civicEdges(read, civOfNode) {
  const nodesOf = nodesUnlocking(read, civOfNode);
  const edges = [];
  const pair = (a, b) => {
    if (a != null && b != null && a !== b && civOfNode.get(a) === civOfNode.get(b)) edges.push([a, b]);
  };
  for (const q of read("UniqueQuarters")) pair(nodesOf.get(q.BuildingType1), nodesOf.get(q.BuildingType2));
  for (const l of read("LShufCivLinks")) {
    if (civOfNode.has(l.NodeType) && civOfNode.has(l.NeedsNodeType)) pair(String(l.NodeType), String(l.NeedsNodeType));
  }
  return edges;
}

// Each node labelled with the lowest node of its bundle, as the SQL's lowest-label pass does.
function lowestLabels(nodes, edges) {
  const lead = new Map(nodes.map((n) => [n, n]));
  const lower = (a, b) => (cmp(a, b) <= 0 ? a : b);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [a, b] of edges) {
      const m = lower(lead.get(a), lead.get(b));
      changed = changed || lead.get(a) !== m || lead.get(b) !== m;
      lead.set(a, m);
      lead.set(b, m);
    }
  }
  return lead;
}

function civicRiders(read, civNodes) {
  const civOfNode = new Map(civNodes.map((n) => [n.node, n.civ]));
  const lead = lowestLabels([...civOfNode.keys()], civicEdges(read, civOfNode));
  const out = [];
  for (const [node, l] of lead) {
    if (l !== node) out.push({ kind: "civic", civ: civOfNode.get(node), lead: `CIVNODE_${l}`, rider: `CIVNODE_${node}` });
  }
  return out;
}

// An item only one builder unit builds rides with the card of that unit's family, same civ.
function uniqueRiders(read, civItems) {
  const cards = civItems.filter((i) => i.kind === "unit" || i.kind === "improvement");
  const builds = read("Unit_BuildConstructibles");
  const count = new Map();
  for (const b of builds) count.set(b.ConstructibleType, (count.get(b.ConstructibleType) || 0) + 1);
  const out = [];
  for (const b of builds.filter((x) => count.get(x.ConstructibleType) === 1)) {
    const rider = cards.find((c) => c.type === b.ConstructibleType);
    const unit = String(b.UnitType);
    const leadCard = rider && cards.find((c) => c.kind === "unit" && c.civ === rider.civ && c.type !== rider.type
      && (unit === c.type || unit.startsWith(`${c.type}_`)));
    if (leadCard) out.push({ kind: "unique", civ: rider.civ, lead: `CIVUNQ_${leadCard.type}`, rider: `CIVUNQ_${rider.type}` });
  }
  return out;
}

function readCivRiders(read, civItems, civNodes) {
  const rows = read("CivItems").length
    ? read("CivRiders").map((r) => ({
      kind: String(r.Kind), civ: String(r.CivilizationType), lead: String(r.LeadId), rider: String(r.RiderId)
    }))
    : deriveCivRiders(read, civItems, civNodes);
  return rows.sort((a, b) => cmp(a.rider, b.rider));
}

export function buildDealInput(readTable, config) {
  const cfg = normalizeConfig(config);
  const read = (name) => safeRows(readTable, name);
  const leaders = readLeaders(read, cfg);
  const civItems = readCivItems(read);
  const civNodes = readCivNodes(read, civItems);
  return {
    seed: cfg.seed,
    options: cfg.options,
    age: cfg.age,
    leaders,
    ...readMapping(read),
    unlocks: readUnlocks(read, leaders),
    attrTrees: readAttributeTrees(read),
    attrTraits: sortIds(read("LShufAttributeTraits").map((r) => r.TraitType)),
    civs: readCivs(read),
    biasRows: readBiasRows(read),
    civItems,
    civNodes,
    civRiders: readCivRiders(read, civItems, civNodes),
    builders: cfg.builders
  };
}
