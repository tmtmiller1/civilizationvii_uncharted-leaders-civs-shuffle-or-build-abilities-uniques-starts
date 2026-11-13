// Deal step 5: who each leader takes from, the legend-node holders, and LShufResultLeaders, LShufResultPieces,
// LShufResultAttributes, LShufResultUnlocks and LShufResultMeta.
import { GENERIC_BIASES, REASON, STATUS, TRAIT } from "../../shared/lshuf-constants.js";
import { DEAL_VERSION } from "../../shared/deal/lshuf-deal-util.js";
import { BUILD_OF, CFG, header, IS_BUILDER, q } from "./sql-util.mjs";

const L = "LShufWork_L.LeaderType";
const donor = (axis, of) => `(SELECT d.Donor FROM LShufWork_Donor d WHERE d.Axis = ${q(axis)} AND d.LeaderType = ${of})`;
const inPool = (axis, of) => `EXISTS (SELECT 1 FROM LShufWork_Pool p WHERE p.Axis = ${q(axis)} AND p.LeaderType = ${of})`;
const level = (axis) => `(SELECT a.Level FROM LShufWork_Axis a WHERE a.Axis = ${q(axis)})`;
const topGiver = (of) => `(SELECT f.Giver FROM LShufWork_Flow f WHERE f.Receiver = ${of} ORDER BY f.C DESC, f.V DESC, f.Giver LIMIT 1)`;
const topReceiver = (of) =>
  `(SELECT f.Receiver FROM LShufWork_Flow f WHERE f.Giver = ${of} ORDER BY f.C DESC, f.V DESC, f.Receiver LIMIT 1)`;
const dealtPrefix = TRAIT.dealt("");
// The leader a leader got the most pieces from (itself when none): abilityFrom in the split deal.
const fromAbility = (of) => `COALESCE(${topGiver(of)}, ${of})`;
// A builder with an AI behavior pick goes down the copy path in the whole modes (lshuf-deal-ability.js wholeBuild).
const copyBuilder = (col) =>
  `(${BUILD_OF("PersonaPick", col)} IS NOT NULL OR COALESCE(${BUILD_OF("BulletBuild", col)}, 0) = 1)`;

// The host on its own mode (CONTRACTS 33, lshuf-deal-own.js): its first whole card, else the leader most of its
// bullet cards came from, else itself.
const OWN_BUILD = (col) => `(SELECT b.${col} FROM LShufWork_Build b WHERE b.Own = 1 AND b.OK = 1)`;
const ownAbilityFrom = `COALESCE((SELECT MIN(o.FromLeader) FROM LShufWork_OwnPiece o WHERE o.Kind = 'whole'),
    (SELECT o.FromLeader FROM LShufWork_OwnPiece o WHERE o.Kind = 'bullet' GROUP BY o.FromLeader
      ORDER BY COUNT(*) DESC, o.FromLeader LIMIT 1), LeaderType)`;
const GENERIC_TAGS = GENERIC_BIASES.map(([t]) => q(t)).join(", ");
// Agendas alone (CONTRACTS 33): abilities on Base game, agendas Swap whole, a donor that isn't itself.
const ALONE = (col) => `${CFG("ANormal")} = 1 AND ${CFG("PRedealt")} = 1 AND RA IS NULL
    AND ${donor("P", col)} IS NOT NULL AND ${donor("P", col)} <> ${col}`;

function leaderColumns() {
  return `UPDATE LShufWork_L SET InA = ${inPool("A", L)}, InT = ${inPool("T", L)}, InB = ${inPool("B", L)},
  Changed = COALESCE((SELECT s.Changed FROM LShufWork_Shape s WHERE s.LeaderType = ${L}), 0);
UPDATE LShufWork_L SET AbilityFrom = CASE
  WHEN Own = 1 THEN ${ownAbilityFrom}
  WHEN InA = 1 THEN CASE WHEN ${CFG("IsWhole")} = 1 THEN COALESCE((SELECT bb.FromLeader FROM LShufWork_BBullet bb
      WHERE bb.Leader = ${L} GROUP BY bb.FromLeader ORDER BY COUNT(*) DESC, bb.FromLeader LIMIT 1), ${donor("A", L)})
    ELSE COALESCE(${topGiver(L)}, LeaderType) END
  WHEN ${CFG("OffA")} = 1 AND RA IS NULL THEN NULL ELSE LeaderType END;
UPDATE LShufWork_L SET PersonaFrom = CASE
  WHEN Own = 1 THEN COALESCE(${OWN_BUILD("PersonaPick")}, LeaderType)
  WHEN InA = 1 THEN CASE WHEN ${BUILD_OF("PersonaPick", L)} IS NOT NULL THEN ${BUILD_OF("PersonaPick", L)}
    WHEN ${CFG("PRedealt")} = 1 THEN ${donor("P", L)} WHEN ${CFG("Follows")} = 1 THEN AbilityFrom
    ELSE LeaderType END
  WHEN ${CFG("OffA")} = 1 AND RA IS NULL AND ${donor("P", L)} IS NOT NULL THEN ${donor("P", L)}
  WHEN ${ALONE(L)} THEN COALESCE(${BUILD_OF("PersonaPick", L)}, ${donor("P", L)}) ELSE LeaderType END,
  BiasFrom = CASE WHEN Own = 1 THEN CASE WHEN ${OWN_BUILD("BiasPick")} IS NOT NULL THEN ${OWN_BUILD("BiasPick")}
    WHEN ${OWN_BUILD("GenericBiasPick")} IN (${GENERIC_TAGS}) THEN NULL ELSE LeaderType END
  WHEN InB = 1 THEN CASE WHEN ${BUILD_OF("BiasPick", L)} IS NOT NULL THEN ${BUILD_OF("BiasPick", L)}
    WHEN ${BUILD_OF("GenericBiasPick", L)} IS NOT NULL THEN NULL
    WHEN ${CFG("BCycle")} = 1 THEN ${donor("B", L)}
    WHEN ${CFG("BFromA")} = 1 THEN ${fromAbility(L)} ELSE NULL END
  WHEN ${CFG("OffB")} = 1 AND RB IS NULL THEN NULL ELSE LeaderType END;
UPDATE LShufWork_L SET PCopy = (Own = 0 AND InA = 0 AND ${ALONE(L)} AND PersonaFrom <> LeaderType);
`;
}

function leaders() {
  const why = (axis, inCol, off, r) =>
    `CASE WHEN ${inCol} = 1 THEN NULL WHEN ${CFG(off)} = 1 AND ${r} IS NULL THEN NULL ELSE COALESCE(${r}, ${level(axis)}) END`;
  const axes = `CASE WHEN InA = 1 OR InT = 1 OR InB = 1 THEN '|' || (CASE WHEN InA = 1 THEN 'ABILITY|' ELSE '' END)
    || (CASE WHEN InT = 1 THEN 'ATTRIBUTES|' ELSE '' END) || (CASE WHEN InB = 1 THEN 'BIASES|' ELSE '' END) ELSE NULL END`;
  const ownAxes = `CASE WHEN OA = 1 OR OT = 1 OR OB = 1 THEN '|' || (CASE WHEN OA = 1 THEN 'ABILITY|' ELSE '' END)
    || (CASE WHEN OT = 1 THEN 'ATTRIBUTES|' ELSE '' END) || (CASE WHEN OB = 1 THEN 'BIASES|' ELSE '' END) ELSE NULL END`;
  return `DELETE FROM LShufResultLeaders;
INSERT INTO LShufResultLeaders (LeaderType, Status, Axes, Reason, AbilityFrom, PersonaFrom, BiasFrom)
  SELECT LeaderType, CASE WHEN Own = 1 THEN CASE WHEN OA = 1 OR OT = 1 OR OB = 1 THEN ${q(STATUS.Dealt)} ELSE ${q(STATUS.AsShipped)} END
    WHEN InA = 1 OR InT = 1 OR InB = 1 THEN ${q(STATUS.Dealt)} ELSE ${q(STATUS.AsShipped)} END,
  CASE WHEN Own = 1 THEN ${ownAxes} ELSE ${axes} END,
  CASE WHEN Own = 1 THEN ${q(REASON.Built)} ELSE COALESCE(${why("A", "InA", "OffA", "RA")}, ${why("T", "InT", "OffT", "RT")}, ${why("B", "InB", "OffB", "RB")},
    CASE WHEN ${IS_BUILDER("LeaderType")} THEN ${q(REASON.Built)} END,
    CASE WHEN Changed = 1 THEN ${q(REASON.ModdedChanged)} END) END,
  AbilityFrom, PersonaFrom, BiasFrom FROM LShufWork_L;
`;
}

function pieces() {
  const ins = "INSERT INTO LShufResultPieces (LeaderType, PieceId, FromLeaderType, Kind, SortIndex)";
  return `DELETE FROM LShufResultPieces;
${ins} SELECT d.LeaderType, d.Donor || '__WHOLE', d.Donor, 'whole', 0 FROM LShufWork_Donor d
  WHERE d.Axis = 'A' AND ${CFG("IsWhole")} = 1;
${ins} SELECT LeaderType, PieceId, FromLeader, Kind, SortIndex FROM LShufWork_Held;
${ins} SELECT Leader, PieceId, FromLeader, 'bullet', SortIndex FROM LShufWork_BBullet;
${ins} SELECT LeaderType, LeaderType || '__WHOLE', LeaderType, 'whole', 0 FROM LShufWork_L
  WHERE InA = 0 AND Ability IS NOT NULL AND NOT (${CFG("OffA")} = 1 AND RA IS NULL) AND NOT (Own = 1 AND OA = 1);
${ins} SELECT l.LeaderType, o.PieceId, o.FromLeader, o.Kind, o.SortIndex FROM LShufWork_OwnPiece o
  JOIN LShufWork_L l ON l.Own = 1 AND l.OA = 1;
`;
}

function attributes() {
  const ins = "INSERT INTO LShufResultAttributes (LeaderType, TraitType, FromLeaderType)";
  const attr = "lt.TraitType IN (SELECT TraitType FROM LShufAttributeTraits)";
  return `DELETE FROM LShufResultAttributes;
${ins} SELECT d.LeaderType, lt.TraitType, d.Donor FROM LShufWork_Donor d JOIN LeaderTraits lt ON lt.LeaderType = d.Donor
  WHERE d.Axis = 'T' AND ${CFG("TCycle")} = 1 AND ${attr}
    AND NOT EXISTS (SELECT 1 FROM LShufWork_ATaken t WHERE t.CardId = d.Donor || '|' || lt.TraitType)
    AND COALESCE(${BUILD_OF("HasT", "d.LeaderType")}, 0) = 0;
${ins} SELECT p.LeaderType, lt.TraitType, ${fromAbility("p.LeaderType")} FROM LShufWork_Pool p
  JOIN LeaderTraits lt ON lt.LeaderType = ${fromAbility("p.LeaderType")}
  WHERE p.Axis = 'T' AND ${CFG("TFromA")} = 1 AND ${attr}
    AND NOT EXISTS (SELECT 1 FROM LShufWork_ATaken t WHERE t.CardId = ${fromAbility("p.LeaderType")} || '|' || lt.TraitType)
    AND COALESCE(${BUILD_OF("HasT", "p.LeaderType")}, 0) = 0;
INSERT INTO LShufResultAttributes (LeaderType, TraitType, FromLeaderType, Copy)
  SELECT d.LeaderType, c.TraitType, c.FromLeader, (SELECT COUNT(*) FROM LShufWork_ADealt d2
      JOIN LShufWork_ACardAll c2 ON c2.CardId = d2.CardId
      WHERE d2.LeaderType = d.LeaderType AND c2.TraitType = c.TraitType AND d2.Ord < d.Ord)
  FROM LShufWork_ADealt d JOIN LShufWork_ACardAll c ON c.CardId = d.CardId;
${ins} SELECT LeaderType, ${q(TRAIT.EqualActions)}, NULL FROM LShufWork_L WHERE InT = 0 AND ${CFG("OffT")} = 1 AND RT IS NULL;
${ins} SELECT l.LeaderType, lt.TraitType, l.LeaderType FROM LShufWork_L l JOIN LeaderTraits lt ON lt.LeaderType = l.LeaderType
  WHERE l.InT = 0 AND NOT (${CFG("OffT")} = 1 AND l.RT IS NULL) AND ${attr} AND NOT (l.Own = 1 AND l.OT = 1);
INSERT INTO LShufResultAttributes (LeaderType, TraitType, FromLeaderType, Copy)
  SELECT b.Leader, p.Arg, b.Leader, (SELECT COUNT(*) FROM LShufWork_BuildPiece p2 WHERE p2.Slot = p.Slot AND p2.Kind = 'attr'
      AND p2.Arg = p.Arg AND p2.Copy < p.Copy)
  FROM LShufWork_BuildPiece p JOIN LShufWork_Build b ON b.Slot = p.Slot AND b.Own = 1 AND b.OK = 1
  WHERE p.Kind = 'attr' AND p.Arg IN (SELECT TraitType FROM LShufAttributeTraits);
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
  // An absent leader's ability a builder took (lshuf-deal-unlocks.js absentRow, CONTRACTS 24).
  const absentDonor = `SELECT 1 FROM LShufWork_Donor d WHERE d.Axis = 'A' AND d.Donor = ${U}.Owner`;
  const absentDealt = `SELECT 1 FROM LShufWork_Dealt d WHERE d.FromLeader = ${U}.Owner AND d.LeaderType IS NOT NULL`;
  const pinned = `SELECT 1 FROM LShufMappingUnlocks mu WHERE mu.ProgressionTreeNodeType = ${U}.Node AND mu.TargetType = ${U}.Target
    AND mu.PieceId IS NOT NULL`;
  return `${"CREATE TABLE IF NOT EXISTS LShufWork_U (Node TEXT, Target TEXT, Trait TEXT, Tree TEXT, Owner TEXT, AttrTrait TEXT, Holder TEXT, ToTrait TEXT, PRIMARY KEY (Node, Target));"}
DELETE FROM ${U};
INSERT INTO ${U} (Node, Target, Trait, Tree, Owner) SELECT u.ProgressionTreeNodeType, u.TargetType, u.RequiredTraitType,
  (SELECT n.ProgressionTree FROM ProgressionTreeNodes n WHERE n.ProgressionTreeNodeType = u.ProgressionTreeNodeType),
  (SELECT MIN(l.LeaderType) FROM LShufWork_L l WHERE l.Ability = u.RequiredTraitType)
  FROM ProgressionTreeNodeUnlocks u WHERE u.RequiredTraitType IN (SELECT Ability FROM LShufWork_L WHERE Ability IS NOT NULL);
UPDATE ${U} SET AttrTrait = ${attrTrait};
UPDATE ${U} SET Holder = CASE
  WHEN ${ownerL("InA")} = 0 AND ${CFG("IsWhole")} = 1 AND EXISTS (${absentDonor})
    THEN (SELECT d.LeaderType FROM LShufWork_Donor d WHERE d.Axis = 'A' AND d.Donor = Owner)
  WHEN ${ownerL("InA")} = 0 AND ${CFG("IsWhole")} = 0 AND EXISTS (${absentDealt})
    THEN COALESCE(CASE WHEN EXISTS (${pinned}) THEN ${override} ELSE ${topReceiver("Owner")} END, Owner)
  WHEN ${ownerL("InA")} = 1 AND ${CFG("IsWhole")} = 1 THEN (SELECT d.LeaderType FROM LShufWork_Donor d WHERE d.Axis = 'A' AND d.Donor = Owner)
  WHEN ${ownerL("InA")} = 1 THEN COALESCE(${override}, ${viaAttr}, ${topReceiver("Owner")}, Owner)
  WHEN ${CFG("OffA")} = 1 AND ${ownerL("RA")} IS NULL THEN NULL ELSE Owner END;
-- The host on its own mode with copies (CONTRACTS 33): its own legend nodes, and an absent leader's whose cards it
-- took, go on its dealt trait; a leader whose agendas came from another while its ability stayed keeps its own nodes
-- on its dealt trait too.
UPDATE ${U} SET Holder = (SELECT l.LeaderType FROM LShufWork_L l WHERE l.Own = 1)
  WHERE EXISTS (SELECT 1 FROM LShufWork_L l WHERE l.Own = 1 AND (l.OA = 1 OR l.OP = 1))
    AND (Owner = (SELECT l.LeaderType FROM LShufWork_L l WHERE l.Own = 1)
      OR (${ownerL("RA")} = ${q(REASON.NotInGame)} AND ${ownerL("Ability")} IS NOT NULL
        AND EXISTS (SELECT 1 FROM LShufWork_OwnPiece o WHERE o.FromLeader = ${U}.Owner)));
UPDATE ${U} SET ToTrait = CASE WHEN Holder IS NULL THEN NULL
  WHEN Holder = (SELECT l.LeaderType FROM LShufWork_L l WHERE l.Own = 1 AND (l.OA = 1 OR l.OP = 1))
    AND (Owner = Holder OR ${ownerL("RA")} = ${q(REASON.NotInGame)}) THEN ${q(dealtPrefix)} || Holder
  WHEN ${ownerL("PCopy")} = 1 AND Holder = Owner THEN ${q(dealtPrefix)} || Holder
  WHEN ${ownerL("InA")} = 0 AND Holder = Owner THEN Trait
  WHEN ${holderIn} = 1 THEN CASE WHEN ${CFG("IsWhole")} = 1 AND ${CFG("Follows")} = 1 AND NOT ${copyBuilder("Holder")} THEN Trait
    ELSE ${q(dealtPrefix)} || Holder END
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
INSERT INTO LShufResultMeta (Name, Value) SELECT 'Builder' || CASE WHEN Slot = 1 THEN '' ELSE CAST(Slot AS TEXT) END,
  CASE WHEN OK = 1 THEN 'ok' ELSE Why END FROM LShufWork_Build ORDER BY Slot;
INSERT INTO LShufResultMeta (Name, Value) SELECT 'Fallback_' || CASE Axis WHEN 'A' THEN 'ABILITY' WHEN 'T' THEN 'ATTRIBUTES'
  ELSE 'BIASES' END, ${q(REASON.TooFew)} FROM LShufWork_Axis WHERE Fallback = 1;
`;
}

export function resultsSql() {
  return [header("Deal step 5: result tables"), leaderColumns(), leaders(), pieces(), attributes(), unlocks(), meta()].join("\n");
}
