// Deal step 5: who each leader takes from, the legend-node holders, and LShufResultLeaders, LShufResultPieces,
// LShufResultAttributes, LShufResultUnlocks and LShufResultMeta.
import { REASON, STATUS, TRAIT } from "../../shared/lshuf-constants.js";
import { DEAL_VERSION } from "../../shared/deal/lshuf-deal-util.js";
import { CFG, header, q } from "./sql-util.mjs";

const L = "LShufWork_L.LeaderType";
const donor = (axis, of) => `(SELECT d.Donor FROM LShufWork_Donor d WHERE d.Axis = ${q(axis)} AND d.LeaderType = ${of})`;
const inPool = (axis, of) => `EXISTS (SELECT 1 FROM LShufWork_Pool p WHERE p.Axis = ${q(axis)} AND p.LeaderType = ${of})`;
const level = (axis) => `(SELECT a.Level FROM LShufWork_Axis a WHERE a.Axis = ${q(axis)})`;
const topGiver = (of) => `(SELECT f.Giver FROM LShufWork_Flow f WHERE f.Receiver = ${of} ORDER BY f.C DESC, f.V DESC, f.Giver LIMIT 1)`;
const topReceiver = (of) =>
  `(SELECT f.Receiver FROM LShufWork_Flow f WHERE f.Giver = ${of} ORDER BY f.C DESC, f.V DESC, f.Receiver LIMIT 1)`;
const dealtPrefix = TRAIT.dealt("");

function leaderColumns() {
  return `UPDATE LShufWork_L SET InA = ${inPool("A", L)}, InT = ${inPool("T", L)}, InB = ${inPool("B", L)},
  Changed = COALESCE((SELECT s.Changed FROM LShufWork_Shape s WHERE s.LeaderType = ${L}), 0);
UPDATE LShufWork_L SET AbilityFrom = CASE
  WHEN InA = 1 THEN CASE WHEN ${CFG("IsWhole")} = 1 THEN ${donor("A", L)} ELSE COALESCE(${topGiver(L)}, LeaderType) END
  WHEN ${CFG("OffA")} = 1 AND RA IS NULL THEN NULL ELSE LeaderType END;
UPDATE LShufWork_L SET PersonaFrom = CASE
  WHEN InA = 1 THEN CASE WHEN ${CFG("PRedealt")} = 1 THEN ${donor("P", L)} WHEN ${CFG("Follows")} = 1 THEN AbilityFrom
    ELSE LeaderType END
  WHEN ${CFG("OffA")} = 1 AND RA IS NULL AND ${donor("P", L)} IS NOT NULL THEN ${donor("P", L)} ELSE LeaderType END,
  BiasFrom = CASE WHEN InB = 1 THEN CASE WHEN ${CFG("IsPaired")} = 1 THEN ${donor("B", L)} ELSE NULL END
  WHEN ${CFG("OffB")} = 1 AND RB IS NULL THEN NULL ELSE LeaderType END;
`;
}

function leaders() {
  const why = (axis, inCol, off, r) =>
    `CASE WHEN ${inCol} = 1 THEN NULL WHEN ${CFG(off)} = 1 AND ${r} IS NULL THEN NULL ELSE COALESCE(${r}, ${level(axis)}) END`;
  const axes = `CASE WHEN InA = 1 OR InT = 1 OR InB = 1 THEN '|' || (CASE WHEN InA = 1 THEN 'ABILITY|' ELSE '' END)
    || (CASE WHEN InT = 1 THEN 'ATTRIBUTES|' ELSE '' END) || (CASE WHEN InB = 1 THEN 'BIASES|' ELSE '' END) ELSE NULL END`;
  return `DELETE FROM LShufResultLeaders;
INSERT INTO LShufResultLeaders (LeaderType, Status, Axes, Reason, AbilityFrom, PersonaFrom, BiasFrom)
  SELECT LeaderType, CASE WHEN InA = 1 OR InT = 1 OR InB = 1 THEN ${q(STATUS.Dealt)} ELSE ${q(STATUS.AsShipped)} END, ${axes},
  COALESCE(${why("A", "InA", "OffA", "RA")}, ${why("T", "InT", "OffT", "RT")}, ${why("B", "InB", "OffB", "RB")},
    CASE WHEN Changed = 1 THEN ${q(REASON.ModdedChanged)} END),
  AbilityFrom, PersonaFrom, BiasFrom FROM LShufWork_L;
`;
}

function pieces() {
  const ins = "INSERT INTO LShufResultPieces (LeaderType, PieceId, FromLeaderType, Kind, SortIndex)";
  return `DELETE FROM LShufResultPieces;
${ins} SELECT d.LeaderType, d.Donor || '__WHOLE', d.Donor, 'whole', 0 FROM LShufWork_Donor d
  WHERE d.Axis = 'A' AND ${CFG("IsWhole")} = 1;
${ins} SELECT LeaderType, PieceId, FromLeader, Kind, SortIndex FROM LShufWork_Held;
${ins} SELECT LeaderType, LeaderType || '__WHOLE', LeaderType, 'whole', 0 FROM LShufWork_L
  WHERE InA = 0 AND Ability IS NOT NULL AND NOT (${CFG("OffA")} = 1 AND RA IS NULL);
`;
}

function attributes() {
  const ins = "INSERT INTO LShufResultAttributes (LeaderType, TraitType, FromLeaderType)";
  const attr = "lt.TraitType IN (SELECT TraitType FROM LShufAttributeTraits)";
  return `DELETE FROM LShufResultAttributes;
${ins} SELECT d.LeaderType, lt.TraitType, d.Donor FROM LShufWork_Donor d JOIN LeaderTraits lt ON lt.LeaderType = d.Donor
  WHERE d.Axis = 'T' AND ${CFG("IsPaired")} = 1 AND ${attr};
INSERT INTO LShufResultAttributes (LeaderType, TraitType, FromLeaderType, Copy)
  SELECT d.LeaderType, c.TraitType, c.FromLeader, (SELECT COUNT(*) FROM LShufWork_ADealt d2
      JOIN LShufWork_ACard c2 ON c2.CardId = d2.CardId
      WHERE d2.LeaderType = d.LeaderType AND c2.TraitType = c.TraitType AND d2.Ord < d.Ord)
  FROM LShufWork_ADealt d JOIN LShufWork_ACard c ON c.CardId = d.CardId;
${ins} SELECT LeaderType, ${q(TRAIT.EqualActions)}, NULL FROM LShufWork_L WHERE InT = 0 AND ${CFG("OffT")} = 1 AND RT IS NULL;
${ins} SELECT l.LeaderType, lt.TraitType, l.LeaderType FROM LShufWork_L l JOIN LeaderTraits lt ON lt.LeaderType = l.LeaderType
  WHERE l.InT = 0 AND NOT (${CFG("OffT")} = 1 AND l.RT IS NULL) AND ${attr};
`;
}

function unlocks() {
  const U = "LShufWork_U";
  const ownerL = (col) => `(SELECT l.${col} FROM LShufWork_L l WHERE l.LeaderType = ${U}.Owner)`;
  const override = `(SELECT d.LeaderType FROM LShufMappingUnlocks mu JOIN LShufWork_Dealt d ON d.PieceId = mu.PieceId
    WHERE mu.ProgressionTreeNodeType = ${U}.Node AND mu.TargetType = ${U}.Target AND d.LeaderType IS NOT NULL)`;
  const attrTrait = `(SELECT MIN(at.TraitType) FROM LShufAttributeTraits at JOIN Attributes a ON a.AttributeType = at.AttributeType
    JOIN LeaderTraits lt ON lt.TraitType = at.TraitType AND lt.LeaderType = ${U}.Owner WHERE a.ProgressionTreeType = ${U}.Tree)`;
  const viaAttr = `CASE WHEN AttrTrait IS NULL OR (${CFG("OffT")} = 1 AND ${ownerL("RT")} IS NULL) THEN NULL
    WHEN ${ownerL("InT")} = 1 THEN (SELECT d.LeaderType FROM LShufWork_ADealt d WHERE d.CardId = Owner || '|' || AttrTrait)
    ELSE Owner END`;
  const holderIn = `(SELECT l.InA FROM LShufWork_L l WHERE l.LeaderType = ${U}.Holder)`;
  return `${"CREATE TABLE IF NOT EXISTS LShufWork_U (Node TEXT, Target TEXT, Trait TEXT, Tree TEXT, Owner TEXT, AttrTrait TEXT, Holder TEXT, ToTrait TEXT, PRIMARY KEY (Node, Target));"}
DELETE FROM ${U};
INSERT INTO ${U} (Node, Target, Trait, Tree, Owner) SELECT u.ProgressionTreeNodeType, u.TargetType, u.RequiredTraitType,
  (SELECT n.ProgressionTree FROM ProgressionTreeNodes n WHERE n.ProgressionTreeNodeType = u.ProgressionTreeNodeType),
  (SELECT MIN(l.LeaderType) FROM LShufWork_L l WHERE l.Ability = u.RequiredTraitType)
  FROM ProgressionTreeNodeUnlocks u WHERE u.RequiredTraitType IN (SELECT Ability FROM LShufWork_L WHERE Ability IS NOT NULL);
UPDATE ${U} SET AttrTrait = ${attrTrait};
UPDATE ${U} SET Holder = CASE
  WHEN ${ownerL("InA")} = 1 AND ${CFG("IsWhole")} = 1 THEN (SELECT d.LeaderType FROM LShufWork_Donor d WHERE d.Axis = 'A' AND d.Donor = Owner)
  WHEN ${ownerL("InA")} = 1 THEN COALESCE(${override}, ${viaAttr}, ${topReceiver("Owner")}, Owner)
  WHEN ${CFG("OffA")} = 1 AND ${ownerL("RA")} IS NULL THEN NULL ELSE Owner END;
UPDATE ${U} SET ToTrait = CASE WHEN Holder IS NULL THEN NULL
  WHEN ${ownerL("InA")} = 0 THEN Trait
  WHEN ${holderIn} = 1 THEN CASE WHEN ${CFG("IsWhole")} = 1 AND ${CFG("Follows")} = 1 THEN Trait ELSE ${q(dealtPrefix)} || Holder END
  ELSE COALESCE((SELECT l.Ability FROM LShufWork_L l WHERE l.LeaderType = ${U}.Holder), Trait) END;
DELETE FROM LShufResultUnlocks;
INSERT INTO LShufResultUnlocks (ProgressionTreeNodeType, TargetType, FromTraitType, ToLeaderType, ToTraitType)
  SELECT Node, Target, Trait, Holder, ToTrait FROM ${U};
`;
}

function meta() {
  return `DELETE FROM LShufResultMeta;
INSERT INTO LShufResultMeta (Name, Value) SELECT 'Seed', CAST(Seed AS TEXT) FROM LShufWork_Cfg;
INSERT INTO LShufResultMeta (Name, Value) SELECT 'Mode', Mode FROM LShufWork_Cfg;
INSERT INTO LShufResultMeta (Name, Value) VALUES ('DealVersion', ${q(String(DEAL_VERSION))});
INSERT INTO LShufResultMeta (Name, Value) SELECT 'Fallback_' || CASE Axis WHEN 'A' THEN 'ABILITY' WHEN 'T' THEN 'ATTRIBUTES'
  ELSE 'BIASES' END, ${q(REASON.TooFew)} FROM LShufWork_Axis WHERE Fallback = 1;
`;
}

export function resultsSql() {
  return [header("Deal step 5: result tables"), leaderColumns(), leaders(), pieces(), attributes(), unlocks(), meta()].join("\n");
}
