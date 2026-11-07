// Deal step 6: write the result into the game tables (CONTRACTS.md section 6). Only a leader's ability row and its
// attribute rows move in LeaderTraits; nothing is deleted from Traits or Modifiers; TraitModifiers gets INSERTs only;
// every insert selects through the parent table, so a row whose parent is missing is skipped.
import { BIAS_TABLES, BIAS_TARGET_COLUMN, TRAIT } from "../../shared/lshuf-constants.js";
import { civApplySql } from "./sql-civ.mjs";
import { BUILD_OF, CFG, header, q } from "./sql-util.mjs";

const DEALT = q(TRAIT.dealt(""));
const PERSONA = q(TRAIT.persona(""));
const COPY_PREFIX = "'LSHUF_'";
const BIAS_PARENT = {
  StartBiasBiomes: ["Biomes", "BiomeType"],
  StartBiasTerrains: ["Terrains", "TerrainType"],
  StartBiasFeatureClasses: ["FeatureClasses", "FeatureClassType"],
  StartBiasResources: ["Resources", "ResourceType"]
};
const ATTR = "SELECT TraitType FROM LShufAttributeTraits";
// Copy path: every split leader, and whole-mode leaders when the personality is kept apart from the ability.
// A builder with an AI behavior pick is a copy leader in the whole modes too (CONTRACTS 13).
const COPY_LEADERS = `SELECT LeaderType FROM LShufWork_L WHERE InA = 1 AND (NOT (${CFG("IsWhole")} = 1 AND ${CFG("Follows")} = 1)
  OR ${BUILD_OF("PersonaPick", "LeaderType")} IS NOT NULL OR COALESCE(${BUILD_OF("BulletBuild", "LeaderType")}, 0) = 1)`;
const PERSONA_LEADERS = `${COPY_LEADERS} UNION SELECT LeaderType FROM LShufWork_L WHERE ${CFG("OffA")} = 1 AND RA IS NULL`;
const agendaMods = (leader) => `SELECT mm.ModifierId FROM LShufMappingModifiers mm JOIN LShufMapping m ON m.PieceId = mm.PieceId
      WHERE m.LeaderType = ${leader} AND (m.Kind = 'agenda' OR mm.Role = 'agenda')`;
const ability = (leader) => `(SELECT lx.Ability FROM LShufWork_L lx WHERE lx.LeaderType = ${leader})`;

// A repeated attribute card (Copy n > 0) goes on TRAIT_LSHUF_EXTRA<n>_<trait>, with copies of that trait's modifiers
// read from the live tables, all but its diplomatic-action unlocks (the first card already grants those). In
// Antiquity the point modifier is EFFECT_DO_NOTHING; Exploration and Modern make it +2 points of the kind at the age's
// start, so the copy does whatever the card does in that age. Only the extra traits this deal uses are made.
// SQL spellings of TRAIT.extraAttribute(trait, n) and extraModifierId(n, modifierId); tests/deal-attribute-repeats.mjs
// checks they match.
const EXTRA = (copy, trait) => `'TRAIT_LSHUF_EXTRA' || ${copy} || '_' || ${trait}`;
const EXTRA_MOD = (copy, mod) => `'LSHUF_EXTRA' || ${copy} || '__' || ${mod}`;
function extraTraits() {
  const used = "SELECT DISTINCT Copy, TraitType FROM LShufResultAttributes WHERE Copy > 0";
  const pointMods = `SELECT x.Copy AS Copy, x.TraitType AS TraitType, m.* FROM (${used}) x
    JOIN TraitModifiers tm ON tm.TraitType = x.TraitType JOIN Modifiers m ON m.ModifierId = tm.ModifierId
    JOIN DynamicModifiers d ON d.ModifierType = m.ModifierType WHERE d.EffectType <> 'EFFECT_DIPLOMACY_GRANT_DIPLOMATIC_ACTION'`;
  return `INSERT OR IGNORE INTO Types (Type, Kind) SELECT ${EXTRA("Copy", "TraitType")}, 'KIND_TRAIT' FROM (${used})
  WHERE TraitType IN (SELECT TraitType FROM Traits);
INSERT OR IGNORE INTO Traits (TraitType, Name, Description, InternalOnly) SELECT ${EXTRA("Copy", "TraitType")}, NULL, NULL, 1
  FROM (${used}) WHERE ${EXTRA("Copy", "TraitType")} IN (SELECT Type FROM Types);
INSERT OR IGNORE INTO Modifiers (ModifierId, ModifierType, NewOnly, OwnerRequirementSetId, OwnerStackLimit, Permanent, RunOnce,
    SubjectRequirementSetId, SubjectStackLimit)
  SELECT ${EXTRA_MOD("p.Copy", "p.ModifierId")}, p.ModifierType, p.NewOnly, p.OwnerRequirementSetId, p.OwnerStackLimit, p.Permanent,
    p.RunOnce, p.SubjectRequirementSetId, p.SubjectStackLimit FROM (${pointMods}) p;
INSERT OR IGNORE INTO ModifierArguments (ModifierId, Name, Extra, SecondExtra, Type, Value)
  SELECT ${EXTRA_MOD("p.Copy", "p.ModifierId")}, a.Name, a.Extra, a.SecondExtra, a.Type, a.Value FROM (${pointMods}) p
  JOIN ModifierArguments a ON a.ModifierId = p.ModifierId
  WHERE ${EXTRA_MOD("p.Copy", "p.ModifierId")} IN (SELECT ModifierId FROM Modifiers);
INSERT OR IGNORE INTO TraitModifiers (ModifierId, TraitType)
  SELECT ${EXTRA_MOD("p.Copy", "p.ModifierId")}, ${EXTRA("p.Copy", "p.TraitType")} FROM (${pointMods}) p
  WHERE ${EXTRA_MOD("p.Copy", "p.ModifierId")} IN (SELECT ModifierId FROM Modifiers)
    AND ${EXTRA("p.Copy", "p.TraitType")} IN (SELECT TraitType FROM Traits);
`;
}

function traits() {
  const addTrait = (list, prefix, name, desc) => `INSERT OR IGNORE INTO Types (Type, Kind) SELECT ${prefix} || LeaderType, 'KIND_TRAIT' FROM (${list});
INSERT OR IGNORE INTO Traits (TraitType, Name, Description, InternalOnly) SELECT ${prefix} || x.LeaderType, ${name}, ${desc}, 1
  FROM (${list}) x WHERE ${prefix} || x.LeaderType IN (SELECT Type FROM Types);`;
  const equalUsed = `EXISTS (SELECT 1 FROM LShufResultAttributes WHERE TraitType = ${q(TRAIT.EqualActions)})`;
  return `${addTrait(COPY_LEADERS, DEALT, ability("x.LeaderType").replace("lx.Ability", "lx.AbilityName"), "'LOC_LSHUF_TRAIT_DEALT_DESCRIPTION'")}
${addTrait(PERSONA_LEADERS, PERSONA, "NULL", "NULL")}
INSERT OR IGNORE INTO Types (Type, Kind) SELECT ${q(TRAIT.EqualActions)}, 'KIND_TRAIT' WHERE ${equalUsed};
INSERT OR IGNORE INTO Traits (TraitType, Name, Description, InternalOnly) SELECT ${q(TRAIT.EqualActions)}, NULL, NULL, 1
  WHERE ${equalUsed} AND ${q(TRAIT.EqualActions)} IN (SELECT Type FROM Types);
INSERT OR IGNORE INTO TraitModifiers (ModifierId, TraitType)
  SELECT DISTINCT tm.ModifierId, ${q(TRAIT.EqualActions)} FROM TraitModifiers tm JOIN Modifiers m ON m.ModifierId = tm.ModifierId
  JOIN DynamicModifiers d ON d.ModifierType = m.ModifierType
  WHERE tm.TraitType IN (${ATTR}) AND d.EffectType = 'EFFECT_DIPLOMACY_GRANT_DIPLOMATIC_ACTION'
    AND ${q(TRAIT.EqualActions)} IN (SELECT TraitType FROM Traits);
`;
}

// The modifiers each copy-path leader gets copies of, from the pieces it holds.
function copies() {
  const live = (src) => `SELECT tm.ModifierId FROM TraitModifiers tm WHERE tm.TraitType = ${ability(src)}`;
  const listed = (src) => `SELECT mm.ModifierId FROM LShufMappingModifiers mm JOIN LShufMapping m ON m.PieceId = mm.PieceId
      WHERE m.LeaderType = ${src} AND ((m.Kind = 'bullet' AND COALESCE(m.Movable, 1) = 1) OR m.Kind = 'agenda')`;
  const ins = "INSERT OR IGNORE INTO LShufWork_Copy (Receiver, ModifierId)";
  return `CREATE TABLE IF NOT EXISTS LShufWork_Copy (Receiver TEXT, ModifierId TEXT, PRIMARY KEY (Receiver, ModifierId));
DELETE FROM LShufWork_Copy;
${ins} SELECT p.LeaderType, tm.ModifierId FROM LShufResultPieces p JOIN TraitModifiers tm ON tm.TraitType = ${ability("p.FromLeaderType")}
  WHERE p.LeaderType IN (${COPY_LEADERS}) AND p.Kind = 'whole' AND tm.ModifierId NOT IN (${agendaMods("p.FromLeaderType")});
${ins} SELECT p.LeaderType, mm.ModifierId FROM LShufResultPieces p JOIN LShufMappingModifiers mm ON mm.PieceId = p.PieceId
  WHERE p.LeaderType IN (${COPY_LEADERS}) AND p.Kind = 'bullet' AND mm.Role IN ('effect', 'hidden')
    AND mm.ModifierId IN (${live("p.FromLeaderType")});
${ins} SELECT p.LeaderType, tm.ModifierId FROM LShufResultPieces p JOIN TraitModifiers tm ON tm.TraitType = ${ability("p.FromLeaderType")}
  WHERE p.LeaderType IN (${COPY_LEADERS}) AND p.Kind = 'remainder' AND tm.ModifierId NOT IN (${listed("p.FromLeaderType")});
DELETE FROM LShufWork_Copy WHERE ModifierId NOT IN (SELECT ModifierId FROM Modifiers);
`;
}

function copyModifiers() {
  const newId = `${COPY_PREFIX} || c.Receiver || '__' || m.ModifierId`;
  const tooltip = `(SELECT l.AbilityName FROM LShufWork_L l WHERE l.LeaderType = c.Receiver)`;
  return `INSERT OR IGNORE INTO Modifiers (ModifierId, ModifierType, NewOnly, OwnerRequirementSetId, OwnerStackLimit, Permanent, RunOnce,
    SubjectRequirementSetId, SubjectStackLimit)
  SELECT ${newId}, m.ModifierType, m.NewOnly, m.OwnerRequirementSetId, m.OwnerStackLimit, m.Permanent, m.RunOnce,
    m.SubjectRequirementSetId, m.SubjectStackLimit FROM LShufWork_Copy c JOIN Modifiers m ON m.ModifierId = c.ModifierId;
INSERT OR IGNORE INTO ModifierArguments (ModifierId, Name, Extra, SecondExtra, Type, Value)
  SELECT ${newId.replace(/m\.ModifierId/g, "a.ModifierId")}, a.Name, a.Extra, a.SecondExtra, a.Type,
    CASE WHEN a.Name = 'Tooltip' AND ${tooltip} IS NOT NULL THEN ${tooltip} ELSE a.Value END
  FROM LShufWork_Copy c JOIN ModifierArguments a ON a.ModifierId = c.ModifierId
  WHERE ${newId.replace(/m\.ModifierId/g, "a.ModifierId")} IN (SELECT ModifierId FROM Modifiers);
INSERT OR IGNORE INTO ModifierStrings (Context, ModifierId, Text)
  SELECT s.Context, ${newId.replace(/m\.ModifierId/g, "s.ModifierId")}, s.Text
  FROM LShufWork_Copy c JOIN ModifierStrings s ON s.ModifierId = c.ModifierId
  WHERE ${newId.replace(/m\.ModifierId/g, "s.ModifierId")} IN (SELECT ModifierId FROM Modifiers);
INSERT OR IGNORE INTO TraitModifiers (ModifierId, TraitType)
  SELECT ${newId.replace(/m\.ModifierId/g, "c.ModifierId")}, ${DEALT} || c.Receiver FROM LShufWork_Copy c
  WHERE ${newId.replace(/m\.ModifierId/g, "c.ModifierId")} IN (SELECT ModifierId FROM Modifiers)
    AND ${DEALT} || c.Receiver IN (SELECT TraitType FROM Traits);
INSERT OR IGNORE INTO TraitModifiers (ModifierId, TraitType)
  SELECT tm.ModifierId, ${PERSONA} || x.LeaderType FROM (${PERSONA_LEADERS}) x
  JOIN LShufWork_L l ON l.LeaderType = x.LeaderType
  JOIN TraitModifiers tm ON tm.TraitType = ${ability("l.PersonaFrom")}
  WHERE tm.ModifierId IN (${agendaMods("l.PersonaFrom")}) AND ${PERSONA} || x.LeaderType IN (SELECT TraitType FROM Traits);
`;
}

function aiLists() {
  const newList = `${COPY_PREFIX} || s.LeaderType || '__' || a.ListType`;
  const sources = `SELECT DISTINCT p.LeaderType, ${ability("p.FromLeaderType")} AS Trait FROM LShufResultPieces p
    WHERE p.LeaderType IN (${COPY_LEADERS})`;
  return `CREATE TABLE IF NOT EXISTS LShufWork_AiSrc (LeaderType TEXT, Trait TEXT, PRIMARY KEY (LeaderType, Trait));
DELETE FROM LShufWork_AiSrc;
INSERT OR IGNORE INTO LShufWork_AiSrc (LeaderType, Trait) SELECT LeaderType, Trait FROM (${sources}) WHERE Trait IS NOT NULL;
INSERT OR IGNORE INTO AiListTypes (ListType) SELECT ${newList} FROM LShufWork_AiSrc s JOIN AiLists a ON a.LeaderType = s.Trait;
INSERT OR IGNORE INTO AiLists (LeaderType, ListType, MaxDifficulty, MinDifficulty, System)
  SELECT ${DEALT} || s.LeaderType, ${newList}, a.MaxDifficulty, a.MinDifficulty, a.System
  FROM LShufWork_AiSrc s JOIN AiLists a ON a.LeaderType = s.Trait WHERE ${newList} IN (SELECT ListType FROM AiListTypes);
INSERT OR IGNORE INTO AiFavoredItems (Favored, Item, ListType, StringVal, Value, MaxDifficulty, MinDifficulty, TooltipString)
  SELECT f.Favored, f.Item, ${newList}, f.StringVal, f.Value, f.MaxDifficulty, f.MinDifficulty, f.TooltipString
  FROM LShufWork_AiSrc s JOIN AiLists a ON a.LeaderType = s.Trait JOIN AiFavoredItems f ON f.ListType = a.ListType
  WHERE ${newList} IN (SELECT ListType FROM AiListTypes);
`;
}

function leaderTraits() {
  const removeAbility = `SELECT LeaderType FROM LShufWork_L WHERE InA = 1 OR (${CFG("OffA")} = 1 AND RA IS NULL)`;
  const removeAttrs = `SELECT LeaderType FROM LShufWork_L WHERE InT = 1 OR (${CFG("OffT")} = 1 AND RT IS NULL)`;
  return `DELETE FROM LeaderTraits WHERE LeaderType IN (${removeAbility})
  AND TraitType = ${ability("LeaderTraits.LeaderType")};
DELETE FROM LeaderTraits WHERE LeaderType IN (${removeAttrs}) AND TraitType IN (${ATTR});
INSERT OR IGNORE INTO LeaderTraits (LeaderType, TraitType) SELECT d.LeaderType, l.Ability FROM LShufWork_Donor d
  JOIN LShufWork_L l ON l.LeaderType = d.Donor
  WHERE d.Axis = 'A' AND ${CFG("IsWhole")} = 1 AND ${CFG("Follows")} = 1 AND l.Ability IN (SELECT TraitType FROM Traits)
    AND d.LeaderType NOT IN (${COPY_LEADERS});
INSERT OR IGNORE INTO LeaderTraits (LeaderType, TraitType) SELECT LeaderType, ${DEALT} || LeaderType FROM (${COPY_LEADERS})
  WHERE ${DEALT} || LeaderType IN (SELECT TraitType FROM Traits);
INSERT OR IGNORE INTO LeaderTraits (LeaderType, TraitType) SELECT LeaderType, ${PERSONA} || LeaderType FROM (${PERSONA_LEADERS})
  WHERE ${PERSONA} || LeaderType IN (SELECT TraitType FROM Traits);
INSERT OR IGNORE INTO LeaderTraits (LeaderType, TraitType) SELECT r.LeaderType, r.TraitType FROM LShufResultAttributes r
  WHERE r.Copy = 0 AND r.LeaderType IN (${removeAttrs}) AND r.TraitType IN (SELECT TraitType FROM Traits)
    AND r.LeaderType IN (SELECT LeaderType FROM Leaders);
INSERT OR IGNORE INTO LeaderTraits (LeaderType, TraitType) SELECT r.LeaderType, ${EXTRA("r.Copy", "r.TraitType")}
  FROM LShufResultAttributes r
  WHERE r.Copy > 0 AND r.LeaderType IN (${removeAttrs}) AND ${EXTRA("r.Copy", "r.TraitType")} IN (SELECT TraitType FROM Traits)
    AND r.LeaderType IN (SELECT LeaderType FROM Leaders);
`;
}

function unlocks() {
  const r = `SELECT 1 FROM LShufResultUnlocks r WHERE r.ProgressionTreeNodeType = ProgressionTreeNodeUnlocks.ProgressionTreeNodeType
    AND r.TargetType = ProgressionTreeNodeUnlocks.TargetType`;
  return `UPDATE ProgressionTreeNodeUnlocks SET RequiredTraitType = (SELECT r.ToTraitType FROM LShufResultUnlocks r
    WHERE r.ProgressionTreeNodeType = ProgressionTreeNodeUnlocks.ProgressionTreeNodeType AND r.TargetType = ProgressionTreeNodeUnlocks.TargetType)
  WHERE RequiredTraitType IN (SELECT Ability FROM LShufWork_L WHERE Ability IS NOT NULL)
    AND EXISTS (${r} AND r.FromTraitType = ProgressionTreeNodeUnlocks.RequiredTraitType AND r.ToTraitType IS NOT NULL
      AND r.ToTraitType <> r.FromTraitType AND r.ToTraitType IN (SELECT TraitType FROM Traits));
`;
}

function biases() {
  const legacyDrop = `SELECT CivilizationType FROM LShufWork_Civ WHERE ${CFG("RollBiases")} = 1 OR Donor <> CivilizationType`;
  const leaders = `SELECT LeaderType FROM LShufWork_Pool WHERE Axis = 'B'
    UNION SELECT LeaderType FROM LShufWork_L WHERE ${CFG("OffB")} = 1 AND RB IS NULL`;
  const dealtB = "(SELECT Dealt FROM LShufWork_Axis WHERE Axis = 'B')";
  return BIAS_TABLES.map((t) => {
    const col = BIAS_TARGET_COLUMN[t];
    const parent = BIAS_PARENT[t];
    const targetOk = col && parent ? ` AND r.TargetType IN (SELECT ${parent[1]} FROM ${parent[0]})` : "";
    return `DELETE FROM ${t} WHERE LeaderType IN (${leaders});
DELETE FROM ${t} WHERE LeaderType IS NULL AND (${CFG("OffB")} = 1 OR (${dealtB} = 1 AND CivilizationType IN (${legacyDrop})));
INSERT OR IGNORE INTO ${t} (CivilizationType, LeaderType${col ? `, ${col}` : ""}, Score)
  SELECT r.CivilizationType, r.LeaderType${col ? ", r.TargetType" : ""}, r.Score FROM LShufResultBiases r
  WHERE r.TableName = ${q(t)} AND r.Origin <> 'shipped'
    AND (r.LeaderType IS NULL OR r.LeaderType IN (SELECT LeaderType FROM Leaders))
    AND (r.CivilizationType IS NULL OR r.CivilizationType IN (SELECT CivilizationType FROM Civilizations))${targetOk};`;
  }).join("\n");
}

function civPriorities() {
  const moved = "SELECT LeaderType FROM LShufWork_L WHERE PersonaFrom IS NOT NULL AND PersonaFrom <> LeaderType";
  return `CREATE TABLE IF NOT EXISTS LShufWork_LCP (Civilization TEXT, Leader TEXT, Priority INTEGER);
DELETE FROM LShufWork_LCP;
INSERT INTO LShufWork_LCP (Civilization, Leader, Priority) SELECT Civilization, Leader, Priority FROM LeaderCivPriorities
  WHERE Leader IN (SELECT PersonaFrom FROM LShufWork_L);
DELETE FROM LeaderCivPriorities WHERE Leader IN (${moved});
INSERT OR IGNORE INTO LeaderCivPriorities (Civilization, Leader, Priority)
  SELECT c.Civilization, l.LeaderType, c.Priority FROM LShufWork_L l JOIN LShufWork_LCP c ON c.Leader = l.PersonaFrom
  WHERE l.LeaderType IN (${moved}) AND c.Civilization IN (SELECT CivilizationType FROM Civilizations);
`;
}

export function applySql() {
  return [
    header("Deal step 6: apply the result to the game tables"),
    traits(),
    extraTraits(),
    copies(),
    copyModifiers(),
    aiLists(),
    leaderTraits(),
    unlocks(),
    biases(),
    civPriorities()
      ,
    civApplySql()
].join("\n");
}
