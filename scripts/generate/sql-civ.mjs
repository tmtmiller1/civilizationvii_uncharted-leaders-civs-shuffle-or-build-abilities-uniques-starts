// Deal step 5b: civilization builds (lshuf-deal-civ.js), slot by slot. Each builder's civ (LShufWork_Build.Civ)
// swaps abilities with the first ability card's civ (any age), swaps civics trees with the first civics card's civ
// of the same age (CONTRACTS 18), takes each unique card of the same age, and under Civilization abilities = Split
// takes each bonus card's piece, from any age but CIV_OWN_AGE_PIECES (CONTRACTS 19); a card a lower slot took is
// gone, a civ a lower slot built can't be a swap source, and a part already swapped can't be swapped again. Then the
// Split deal of the pieces nobody took. Writes LShufResultCivPieces and the CivBuilder<n> meta rows.
import { BUILD_WHY, CA_MODE, CC_MODE, CIV_OWN_AGE_PIECES, CU_MODE, PIECE_AGES } from "../../shared/lshuf-constants.js";

import { SALT } from "../../shared/lshuf-key.js";
import { BALANCE_SCALE, PIECE_STEP_CAP, POOL_STEP_CAP } from "../../shared/deal/lshuf-deal-util.js";
import { CFG, header, key, q, rankUpdate, SLOTS, work } from "./sql-util.mjs";

const ABIL = (civ) => `'CIVABIL_' || ${civ}`;
const UNQ = (type) => `'CIVUNQ_' || ${type}`;
const CIVC = (civ) => `'CIVCIVC_' || ${civ}`;
const NODE = (node) => `'CIVNODE_' || ${node}`;
const TAGS = (civ) => `'CIVTAGS_' || ${civ}`;
const TREE_OF = (civ) => `(SELECT i.Tree FROM LShufWork_CivInfo i WHERE i.Civ = ${civ})`;
const TAKEN = (id) => `${id} IN (SELECT PieceId FROM LShufWork_CivTaken)`;
const PLAY_OF = (civ) => `(SELECT COALESCE(i.Play, i.Age) FROM LShufWork_CivInfo i WHERE i.Civ = ${civ})`;

// An AI builder (slot 2 up) skips a PIECE_AGES piece outside its civ's age (lshuf-deal-civ.js bulletTakes).
const LISTED = Object.keys(PIECE_AGES).filter((id) => id.startsWith("CIVILIZATION_"));
const WORKS = LISTED.flatMap((id) => PIECE_AGES[id].map((age) => `${id}|${age}`));
function aiAgeCheck(n, B) {
  if (n === 1) return "";
  return `\n    AND (m.PieceId NOT IN (${LISTED.map(q).join(", ")}) OR m.PieceId || '|' || ${PLAY_OF(B)} IN (${WORKS.map(q).join(", ")}))`;
}
const BUILDER = (n) => `(SELECT b.Civ FROM LShufWork_Build b WHERE b.Slot = ${n} AND b.OK = 1 AND b.Civ IN (SELECT Civ FROM LShufWork_CivInfo))`;
const SPLIT = `${CFG("CA")} = ${q(CA_MODE.Split)}`;
const PIECED = (civ) => `${civ} IN (SELECT Civ FROM LShufWork_CivPieced)`;
// A civ's pieces in play (CONTRACTS 19): the mapping's movable bullets of the civ's own age, less the ones the game's
// age leaves with nothing to do (LShufCivPieceDead: a civ of another age playing here, Test of Time).
const GAME_AGE = "(SELECT Value FROM LShufOptions WHERE Name = 'Age')";
const IN_PLAY = (m, i) => `${m}.Kind = 'bullet' AND ${m}.Movable = 1 AND ${m}.Age = ${i}.Age
    AND ${m}.PieceId NOT IN (SELECT d.PieceId FROM LShufCivPieceDead d WHERE d.Age = ${GAME_AGE})`;
// A civ's own civics tree: any TREE_CIVICS_* tree but an age's main one (CONTRACTS 18).
const CIVIC_TREE = "n.ProgressionTree LIKE 'TREE\\_CIVICS\\_%' ESCAPE '\\' AND n.ProgressionTree NOT LIKE '%\\_MAIN' ESCAPE '\\'";
const UNLOCKED_WHERE = (cond) => `SELECT u.TargetType FROM ProgressionTreeNodeUnlocks u JOIN ProgressionTreeNodes n
    ON n.ProgressionTreeNodeType = u.ProgressionTreeNodeType WHERE ${cond}`;
const CIVIC_UNLOCKED = UNLOCKED_WHERE(CIVIC_TREE);
const MAIN_UNLOCKED = UNLOCKED_WHERE(`NOT (${CIVIC_TREE})`);
// `member` is in the unit family of `base`: the base itself or base_<anything>.
const FAMILY = (member, base) => `(${member} = ${base} OR ${member} LIKE ${base} || '\\_%' ESCAPE '\\')`;
const CIVIC_UNITS = "SELECT UnitType FROM LShufWork_CivicUnit";
// Riders (CONTRACTS 23 R2, R3): an id that rides with a lead, and the lead an id stands for.
const RIDER = (id) => `${id} IN (SELECT Rider FROM LShufWork_CivRider)`;
const LEAD_OF = (id) => `COALESCE((SELECT w.Lead FROM LShufWork_CivRider w WHERE w.Rider = ${id}), ${id})`;
// The node a civ civics tree unlocks a type at (the lowest, if several).
const NODE_OF = (type) => `(SELECT MIN(u.ProgressionTreeNodeType) FROM ProgressionTreeNodeUnlocks u
      JOIN LShufWork_CivNode c ON c.Node = u.ProgressionTreeNodeType WHERE u.TargetType = ${type})`;
// Rounds of the lowest-label pass that unions a civ's civic bundles; a bundle can't be longer than this.
const BUNDLE_ROUNDS = 8;

// Every civilization's ability and uniques, from the game's own tables (the same list as lshuf-deal-input.js).
function info() {
  return `${work("LShufWork_CivInfo", "Civ TEXT PRIMARY KEY, Age TEXT, Play TEXT, Ability TEXT, AbilityName TEXT, Base TEXT, Tree TEXT, TreeReq TEXT")}
INSERT INTO LShufWork_CivInfo (Civ, Age, Ability)
  SELECT ct.CivilizationType, COALESCE((SELECT MIN(lc.Age) FROM LegacyCivilizations lc WHERE lc.CivilizationType = ct.CivilizationType), ''),
    MIN(ct.TraitType)
  FROM CivilizationTraits ct
  WHERE ct.TraitType LIKE 'TRAIT\\_%\\_ABILITY' ESCAPE '\\' AND ct.CivilizationType IN (SELECT CivilizationType FROM Civilizations)
  GROUP BY ct.CivilizationType;
-- A builder's civ plays in the game's age (lshuf-deal-civ.js playAge; Test of Time lets a civ from another age start).
UPDATE LShufWork_CivInfo SET Play = (SELECT Value FROM LShufOptions WHERE Name = 'Age')
  WHERE COALESCE((SELECT Value FROM LShufOptions WHERE Name = 'Age'), '') <> ''
    AND Civ IN (SELECT Civ FROM LShufWork_Build WHERE OK = 1);
UPDATE LShufWork_CivInfo SET Base = substr(Ability, 1, length(Ability) - 8),
  AbilityName = (SELECT t.Name FROM Traits t WHERE t.TraitType = LShufWork_CivInfo.Ability);
-- The civics tree a civ's base trait reveals (CONTRACTS 18): the reveal modifier whose subject requirement asks for the
-- trait, and that requirement's id (its TraitType argument is what moves the tree).
UPDATE LShufWork_CivInfo SET TreeReq = (SELECT MIN(ra.RequirementId) FROM Modifiers m
    JOIN ModifierArguments ma ON ma.ModifierId = m.ModifierId AND ma.Name = 'ProgressionTreeType'
    JOIN RequirementSetRequirements rsr ON rsr.RequirementSetId = m.SubjectRequirementSetId
    JOIN Requirements r ON r.RequirementId = rsr.RequirementId AND r.RequirementType = 'REQUIREMENT_PLAYER_HAS_CIVILIZATION_OR_LEADER_TRAIT'
    JOIN RequirementArguments ra ON ra.RequirementId = r.RequirementId AND ra.Name = 'TraitType'
    WHERE ra.Value = LShufWork_CivInfo.Base AND ma.Value LIKE 'TREE\\_CIVICS\\_%' ESCAPE '\\');
UPDATE LShufWork_CivInfo SET Tree = (SELECT MIN(ma.Value) FROM ModifierArguments ma JOIN Modifiers m ON m.ModifierId = ma.ModifierId
    JOIN RequirementSetRequirements rsr ON rsr.RequirementSetId = m.SubjectRequirementSetId
    WHERE ma.Name = 'ProgressionTreeType' AND rsr.RequirementId = LShufWork_CivInfo.TreeReq) WHERE TreeReq IS NOT NULL;
-- A unit family only the civ's own civics tree unlocks (Mississippi's Watonathi) belongs to the civics (CONTRACTS 18):
-- every member of such a family, so the uniques part leaves it alone and it stays on the base trait.
${work("LShufWork_CivicUnit", "UnitType TEXT PRIMARY KEY")}
-- A great person whose class asks for a quarter (its BuildingType1) or constructible a civ civics tree unlocks belongs
-- to the civics too (CONTRACTS 23 R1): every member of its family, with the type that ties it.
${work("LShufWork_CivicGP", "UnitType TEXT PRIMARY KEY, Anchor TEXT")}
INSERT OR IGNORE INTO LShufWork_CivicGP (UnitType, Anchor)
  SELECT f.UnitType, COALESCE(
      (SELECT q.BuildingType1 FROM UniqueQuarters q WHERE q.UniqueQuarterType = g.UniqueQuarterType AND q.BuildingType1 IN (${CIVIC_UNLOCKED})),
      CASE WHEN g.ConstructibleType IN (${CIVIC_UNLOCKED}) THEN g.ConstructibleType END)
  FROM GreatPersonClasses g JOIN Units b ON ${FAMILY("g.UnitType", "b.UnitType")}
  JOIN LShufWork_CivInfo i ON i.Base = b.TraitType
  JOIN Units f ON f.TraitType = b.TraitType AND ${FAMILY("f.UnitType", "b.UnitType")}
  WHERE NOT EXISTS (SELECT 1 FROM Units p WHERE p.TraitType = b.TraitType AND b.UnitType LIKE p.UnitType || '\\_%' ESCAPE '\\')
    AND COALESCE(
      (SELECT q.BuildingType1 FROM UniqueQuarters q WHERE q.UniqueQuarterType = g.UniqueQuarterType AND q.BuildingType1 IN (${CIVIC_UNLOCKED})),
      CASE WHEN g.ConstructibleType IN (${CIVIC_UNLOCKED}) THEN g.ConstructibleType END) IS NOT NULL;
-- A unit family a civic of the civ's own tree names in a modifier (LShufCivUnitLinks, CONTRACTS 23 R1: Sengoku's
-- Samurai and Kinsei) belongs to that civic the same way; its anchor is the civic.
INSERT OR IGNORE INTO LShufWork_CivicGP (UnitType, Anchor)
  SELECT f.UnitType, l.NodeType FROM LShufCivUnitLinks l JOIN Units b ON b.UnitType = l.UnitType
  JOIN LShufWork_CivInfo i ON i.Base = b.TraitType
  JOIN ProgressionTreeNodes n ON n.ProgressionTreeNodeType = l.NodeType AND n.ProgressionTree = i.Tree
  JOIN Units f ON f.TraitType = b.TraitType AND ${FAMILY("f.UnitType", "b.UnitType")};
INSERT OR IGNORE INTO LShufWork_CivicUnit (UnitType) SELECT UnitType FROM LShufWork_CivicGP;
INSERT OR IGNORE INTO LShufWork_CivicUnit (UnitType)
  SELECT f.UnitType FROM Units b JOIN LShufWork_CivInfo i ON i.Base = b.TraitType
  JOIN Units f ON f.TraitType = b.TraitType AND ${FAMILY("f.UnitType", "b.UnitType")}
  WHERE NOT EXISTS (SELECT 1 FROM Units p WHERE p.TraitType = b.TraitType AND b.UnitType LIKE p.UnitType || '\\_%' ESCAPE '\\')
    AND EXISTS (SELECT 1 FROM Units m WHERE m.TraitType = b.TraitType AND ${FAMILY("m.UnitType", "b.UnitType")}
      AND m.UnitType IN (${CIVIC_UNLOCKED}))
    AND NOT EXISTS (SELECT 1 FROM Units m WHERE m.TraitType = b.TraitType AND ${FAMILY("m.UnitType", "b.UnitType")}
      AND m.UnitType IN (${MAIN_UNLOCKED}));
-- Each civ's own civics, one row per node of its tree (CONTRACTS 21).
${work("LShufWork_CivNode", "Node TEXT PRIMARY KEY, Civ TEXT, Age TEXT, Cost INTEGER")}
INSERT OR IGNORE INTO LShufWork_CivNode (Node, Civ, Age, Cost)
  SELECT n.ProgressionTreeNodeType, i.Civ, i.Age, n.Cost FROM ProgressionTreeNodes n JOIN LShufWork_CivInfo i ON i.Tree = n.ProgressionTree;
-- Unit families and improvements only: buildings and quarters move with the civics tree (CONTRACTS 18).
${work("LShufWork_CivUnique", "Type TEXT PRIMARY KEY, Kind TEXT, Civ TEXT")}
INSERT OR IGNORE INTO LShufWork_CivUnique (Type, Kind, Civ)
  SELECT u.UnitType, 'unit', i.Civ FROM Units u JOIN LShufWork_CivInfo i ON i.Base = u.TraitType
  WHERE NOT EXISTS (SELECT 1 FROM Units p WHERE p.TraitType = u.TraitType AND u.UnitType LIKE p.UnitType || '\\_%' ESCAPE '\\')
    AND u.UnitType NOT IN (${CIVIC_UNITS})
    AND NOT (u.CanTrain = 0 AND u.UnitType IN (SELECT UnitType FROM GreatPersonClasses));
-- Since 1.5.1 a civ's great person can't be trained: the ability grants it (TRAIT_MOD_GRANT_*), so it isn't a card.
INSERT OR IGNORE INTO LShufWork_CivUnique (Type, Kind, Civ)
  SELECT m.ConstructibleType, 'improvement', i.Civ FROM Improvements m JOIN LShufWork_CivInfo i ON i.Base = m.TraitType
  WHERE m.ConstructibleType NOT IN (SELECT u.TargetType FROM ProgressionTreeNodeUnlocks u
    JOIN ProgressionTreeNodes n ON n.ProgressionTreeNodeType = u.ProgressionTreeNodeType
    WHERE n.ProgressionTree LIKE 'TREE\\_CIVICS\\_%' ESCAPE '\\' AND n.ProgressionTree NOT LIKE '%\\_MAIN' ESCAPE '\\');
${riders()}`;
}

// Riders (CONTRACTS 23, lshuf-deal-input.js deriveCivRiders). Civic bundles: the nodes unlocking a unique quarter's two
// buildings and the LShufCivLinks pairs, unioned per civ by a lowest-label pass; every node but the lowest rides with
// it. Unique bundles: an item only one builder unit builds rides with that unit's card.
function riders() {
  const round = `UPDATE LShufWork_CivNodeLead SET Lead = MIN(Lead, COALESCE((SELECT MIN(l.Lead) FROM LShufWork_CivNodeEdge e
    JOIN LShufWork_CivNodeLead l ON l.Node = e.B WHERE e.A = LShufWork_CivNodeLead.Node), Lead));`;
  return `${work("LShufWork_CivNodeEdge", "A TEXT, B TEXT, PRIMARY KEY (A, B)")}
INSERT OR IGNORE INTO LShufWork_CivNodeEdge (A, B) SELECT x.A, x.B FROM
  (SELECT ${NODE_OF("q.BuildingType1")} AS A, ${NODE_OF("q.BuildingType2")} AS B FROM UniqueQuarters q) x
  JOIN LShufWork_CivNode a ON a.Node = x.A JOIN LShufWork_CivNode b ON b.Node = x.B WHERE a.Civ = b.Civ AND x.A <> x.B;
INSERT OR IGNORE INTO LShufWork_CivNodeEdge (A, B) SELECT l.NodeType, l.NeedsNodeType FROM LShufCivLinks l
  JOIN LShufWork_CivNode a ON a.Node = l.NodeType JOIN LShufWork_CivNode b ON b.Node = l.NeedsNodeType
  WHERE a.Civ = b.Civ AND l.NodeType <> l.NeedsNodeType;
INSERT OR IGNORE INTO LShufWork_CivNodeEdge (A, B) SELECT B, A FROM LShufWork_CivNodeEdge;
${work("LShufWork_CivNodeLead", "Node TEXT PRIMARY KEY, Civ TEXT, Lead TEXT")}
INSERT OR IGNORE INTO LShufWork_CivNodeLead (Node, Civ, Lead) SELECT Node, Civ, Node FROM LShufWork_CivNode;
${Array.from({ length: BUNDLE_ROUNDS }, () => round).join("\n")}
${work("LShufWork_CivRider", "Rider TEXT PRIMARY KEY, Kind TEXT, Civ TEXT, Lead TEXT")}
INSERT OR IGNORE INTO LShufWork_CivRider (Rider, Kind, Civ, Lead)
  SELECT ${NODE("Node")}, 'civic', Civ, ${NODE("Lead")} FROM LShufWork_CivNodeLead WHERE Lead <> Node;
INSERT OR IGNORE INTO LShufWork_CivRider (Rider, Kind, Civ, Lead)
  SELECT ${UNQ("iu.Type")}, 'unique', iu.Civ, ${UNQ("lu.Type")} FROM Unit_BuildConstructibles b
  JOIN LShufWork_CivUnique iu ON iu.Type = b.ConstructibleType
  JOIN LShufWork_CivUnique lu ON lu.Kind = 'unit' AND lu.Civ = iu.Civ AND lu.Type <> iu.Type AND ${FAMILY("b.UnitType", "lu.Type")}
  WHERE (SELECT COUNT(*) FROM Unit_BuildConstructibles o WHERE o.ConstructibleType = b.ConstructibleType) = 1;
`;
}

// Slot n: the ability swap, the civics swap, then the unique takes.
function slot(n) {
  const B = BUILDER(n);
  const builtLower = `SELECT b2.Civ FROM LShufWork_Build b2 WHERE b2.Slot < ${n} AND b2.OK = 1 AND b2.Civ IN (SELECT Civ FROM LShufWork_CivInfo)`;
  return `INSERT INTO LShufWork_CivCSwap (Slot, Builder, Source)
  SELECT ${n}, ${B}, (SELECT MIN(p.Arg) FROM LShufWork_BuildPiece p JOIN LShufWork_CivInfo s ON s.Civ = p.Arg
    WHERE p.Slot = ${n} AND p.Kind = 'civcivics' AND s.Civ <> ${B} AND COALESCE(s.Play, s.Age) = ${PLAY_OF(B)} AND s.Tree IS NOT NULL
      AND s.Civ NOT IN (${builtLower}) AND NOT ${TAKEN(CIVC("s.Civ"))})
  WHERE ${B} IS NOT NULL AND ${TREE_OF(B)} IS NOT NULL AND NOT ${TAKEN(CIVC(B))};
DELETE FROM LShufWork_CivCSwap WHERE Slot = ${n} AND (Builder IS NULL OR Source IS NULL);
INSERT OR IGNORE INTO LShufWork_CivTaken (PieceId) SELECT ${CIVC("Builder")} FROM LShufWork_CivCSwap WHERE Slot = ${n};
INSERT OR IGNORE INTO LShufWork_CivTaken (PieceId) SELECT ${CIVC("Source")} FROM LShufWork_CivCSwap WHERE Slot = ${n};
INSERT INTO LShufWork_CivSwap (Slot, Builder, Source)
  SELECT ${n}, ${B}, (SELECT MIN(p.Arg) FROM LShufWork_BuildPiece p JOIN LShufWork_CivInfo s ON s.Civ = p.Arg
    WHERE p.Slot = ${n} AND p.Kind = 'civability' AND s.Civ <> ${B}
      AND s.Civ NOT IN (${builtLower}) AND NOT ${TAKEN(ABIL("s.Civ"))} AND NOT ${PIECED("s.Civ")})
  WHERE ${B} IS NOT NULL AND NOT ${TAKEN(ABIL(B))} AND NOT ${PIECED(B)};
DELETE FROM LShufWork_CivSwap WHERE Slot = ${n} AND (Builder IS NULL OR Source IS NULL);
INSERT OR IGNORE INTO LShufWork_CivTaken (PieceId) SELECT ${ABIL("Builder")} FROM LShufWork_CivSwap WHERE Slot = ${n};
INSERT OR IGNORE INTO LShufWork_CivTaken (PieceId) SELECT ${ABIL("Source")} FROM LShufWork_CivSwap WHERE Slot = ${n};
INSERT INTO LShufWork_CivTake (Slot, Builder, Type, Source)
  SELECT DISTINCT ${n}, ${B}, u.Type, u.Civ FROM LShufWork_BuildPiece p
  JOIN LShufWork_CivUnique u ON ${UNQ("u.Type")} = ${LEAD_OF(UNQ("p.Arg"))}
  WHERE p.Slot = ${n} AND p.Kind = 'civunique' AND ${B} IS NOT NULL AND u.Civ <> ${B} AND NOT ${RIDER(UNQ("u.Type"))}
    AND ${PLAY_OF("u.Civ")} = ${PLAY_OF(B)} AND NOT ${TAKEN(UNQ("u.Type"))};
INSERT OR IGNORE INTO LShufWork_CivTaken (PieceId) SELECT ${UNQ("Type")} FROM LShufWork_CivTake WHERE Slot = ${n};
INSERT OR IGNORE INTO LShufWork_CivTaken (PieceId) SELECT w.Rider FROM LShufWork_CivRider w
  WHERE w.Lead IN (SELECT ${UNQ("Type")} FROM LShufWork_CivTake WHERE Slot = ${n});
INSERT INTO LShufWork_CivPTake (Slot, Builder, PieceId, Source, BI)
  SELECT ${n}, ${B}, m.PieceId, m.CivilizationType, m.BulletIndex FROM LShufWork_BuildPiece p
  JOIN LShufCivMapping m ON m.PieceId = p.PieceId JOIN LShufWork_CivInfo s ON s.Civ = m.CivilizationType
  WHERE p.Slot = ${n} AND p.Kind = 'civbullet' AND ${SPLIT} AND ${B} IS NOT NULL AND NOT ${TAKEN(ABIL(B))}
    AND (COALESCE(s.Play, s.Age) = ${PLAY_OF(B)} OR m.PieceId NOT IN (${CIV_OWN_AGE_PIECES.map(q).join(", ")}))${aiAgeCheck(n, B)} AND ${IN_PLAY("m", "s")} AND NOT ${TAKEN(ABIL("s.Civ"))} AND NOT ${TAKEN("m.PieceId")};
INSERT OR IGNORE INTO LShufWork_CivTaken (PieceId) SELECT PieceId FROM LShufWork_CivPTake WHERE Slot = ${n};
INSERT OR IGNORE INTO LShufWork_CivPieced (Civ) SELECT Source FROM LShufWork_CivPTake WHERE Slot = ${n};
INSERT INTO LShufWork_CivNTake (Slot, Builder, Node, Source)
  SELECT DISTINCT ${n}, ${B}, c.Node, c.Civ FROM LShufWork_BuildPiece p
  JOIN LShufWork_CivNode c ON ${NODE("c.Node")} = ${LEAD_OF(NODE("p.Arg"))}
  WHERE p.Slot = ${n} AND p.Kind = 'civcivic' AND ${B} IS NOT NULL AND c.Civ <> ${B} AND NOT ${RIDER(NODE("c.Node"))}
    AND ${PLAY_OF("c.Civ")} = ${PLAY_OF(B)} AND NOT ${TAKEN(NODE("c.Node"))}
    AND NOT ${TAKEN(CIVC("c.Civ"))} AND NOT ${TAKEN(CIVC(B))};
INSERT OR IGNORE INTO LShufWork_CivTaken (PieceId) SELECT ${NODE("Node")} FROM LShufWork_CivNTake WHERE Slot = ${n};
INSERT OR IGNORE INTO LShufWork_CivTaken (PieceId) SELECT w.Rider FROM LShufWork_CivRider w
  WHERE w.Lead IN (SELECT ${NODE("Node")} FROM LShufWork_CivNTake WHERE Slot = ${n});`;
}

// Civilization abilities = Split (lshuf-deal-civ.js splitRows): the pieces in play of every civ whose ability nobody
// holds whole, keyed over the whole deck, the builders' takes out; each such civ that took no bonus card has as many
// slots as pieces it put in. The next card in deck order goes to a civ of its age with room: someone else's first,
// then (Balanced) the lowest value per slot so far, then the civ key. Then a remainder row per receiver.
function split() {
  const P = "LShufWork_CivPc";
  const got = "(SELECT COUNT(*) FROM LShufWork_CivPDealt d WHERE d.Civ = s.Civ)";
  const value = "COALESCE((SELECT SUM(d.Value) FROM LShufWork_CivPDealt d WHERE d.Civ = s.Civ), 0)";
  const step = "INSERT INTO LShufWork_CivPDealt (PieceId, Civ, FromCiv, Value) SELECT PieceId, Holder, FromCiv, Value FROM LShufWork_CivNextPiece;";
  return `${work(P, "PieceId TEXT PRIMARY KEY, Civ TEXT, Age TEXT, BI INTEGER, Value INTEGER, DV INTEGER, Rank INTEGER, K INTEGER, DeckOrd INTEGER, Taken INTEGER")}
INSERT INTO ${P} (PieceId, Civ, Age, BI, Value, Taken)
  SELECT m.PieceId, m.CivilizationType, m.Age, COALESCE(m.BulletIndex, 0), COALESCE(m.Value, 1), ${TAKEN("m.PieceId")}
  FROM LShufCivMapping m JOIN LShufWork_CivInfo i ON i.Civ = m.CivilizationType
  WHERE ${SPLIT} AND ${IN_PLAY("m", "i")} AND NOT ${TAKEN(ABIL("i.Civ"))}
    AND m.PieceId NOT IN (SELECT PieceId FROM LShufBoundPieces);
UPDATE ${P} SET DV = CASE WHEN ${CFG("Balanced")} = 1 THEN Value ELSE 0 END;
${rankUpdate(P, "Rank", [], [["PieceId"]])}
UPDATE ${P} SET K = ${key(SALT.CivPieces, "Rank")};
${rankUpdate(P, "DeckOrd", [], [["DV", true], ["K"], ["PieceId"]], "Taken = 0")}
${work("LShufWork_CivPSlot", "Civ TEXT PRIMARY KEY, Age TEXT, N INTEGER, Rank INTEGER, K INTEGER")}
INSERT INTO LShufWork_CivPSlot (Civ, Age, N) SELECT Civ, Age, COUNT(*) FROM ${P}
  WHERE Civ NOT IN (SELECT Builder FROM LShufWork_CivPTake) GROUP BY Civ, Age;
${rankUpdate("LShufWork_CivPSlot", "Rank", [], [["Civ"]])}
UPDATE LShufWork_CivPSlot SET K = ${key(SALT.CivPieces, "Rank")};
${work("LShufWork_CivPDealt", "PieceId TEXT PRIMARY KEY, Civ TEXT, FromCiv TEXT, Value INTEGER")}
DROP VIEW IF EXISTS LShufWork_CivNextPiece;
CREATE VIEW LShufWork_CivNextPiece AS SELECT c.PieceId AS PieceId, c.Civ AS FromCiv, c.Value AS Value, s.Civ AS Holder
  FROM (SELECT p.PieceId, p.Civ, p.Age, p.Value FROM ${P} p WHERE p.Taken = 0
    AND NOT EXISTS (SELECT 1 FROM LShufWork_CivPDealt d WHERE d.PieceId = p.PieceId) ORDER BY p.DeckOrd LIMIT 1) c
  LEFT JOIN LShufWork_CivPSlot s ON s.Age = c.Age AND ${got} < s.N
  ORDER BY CASE WHEN s.Civ = c.Civ THEN 1 ELSE 0 END,
    CASE WHEN ${CFG("Balanced")} = 1 THEN (${value} * ${BALANCE_SCALE}) / s.N ELSE 0 END, s.K, s.Civ
  LIMIT 1;
${Array.from({ length: PIECE_STEP_CAP }, () => step).join("\n")}
${work("LShufWork_CivHeld", "Civ TEXT, PieceId TEXT, FromCiv TEXT, BI INTEGER, IsRest INTEGER, SortIndex INTEGER, PRIMARY KEY (Civ, PieceId)")}
INSERT OR IGNORE INTO LShufWork_CivHeld (Civ, PieceId, FromCiv, BI, IsRest) SELECT t.Builder, t.PieceId, t.Source, t.BI, 0 FROM LShufWork_CivPTake t;
INSERT OR IGNORE INTO LShufWork_CivHeld (Civ, PieceId, FromCiv, BI, IsRest) SELECT d.Civ, d.PieceId, d.FromCiv, p.BI, 0
  FROM LShufWork_CivPDealt d JOIN ${P} p ON p.PieceId = d.PieceId WHERE d.Civ IS NOT NULL;
INSERT OR IGNORE INTO LShufWork_CivHeld (Civ, PieceId, FromCiv, BI, IsRest) SELECT Civ, Civ || '__REST', Civ, 0, 1 FROM LShufWork_CivPSlot;
${rankUpdate("LShufWork_CivHeld", "SortIndex", ["Civ"], [["IsRest"], ["FromCiv"], ["BI"], ["PieceId"]])}
`;
}

// A pool dealt one card at a time, for civics or uniques (lshuf-deal-civ.js dealPool): `items` selects PieceId, Civ,
// Age, Value, Taken over every piece of the pool's civs; `receivers` selects Civ, Age, N. The deck is keyed over every
// piece, ordered by value (Balanced), key, id; a card goes to a civ of its age with room, someone else's first, then
// (Balanced) the lowest value per slot, then the civ key. Dealt rows get a SortIndex per civ by giver and id.
function pool(P, salt, items, receivers) {
  const got = `(SELECT COUNT(*) FROM ${P}Dealt d WHERE d.Civ = s.Civ)`;
  const value = `COALESCE((SELECT SUM(d.Value) FROM ${P}Dealt d WHERE d.Civ = s.Civ), 0)`;
  const step = `INSERT INTO ${P}Dealt (PieceId, Civ, FromCiv, Value) SELECT PieceId, Holder, FromCiv, Value FROM ${P}Next;`;
  return `${work(P, "PieceId TEXT PRIMARY KEY, Civ TEXT, Age TEXT, Value INTEGER, DV INTEGER, Rank INTEGER, K INTEGER, DeckOrd INTEGER, Taken INTEGER")}
INSERT OR IGNORE INTO ${P} (PieceId, Civ, Age, Value, Taken) ${items};
UPDATE ${P} SET DV = CASE WHEN ${CFG("Balanced")} = 1 THEN Value ELSE 0 END;
${rankUpdate(P, "Rank", [], [["PieceId"]])}
UPDATE ${P} SET K = ${key(salt, "Rank")};
${rankUpdate(P, "DeckOrd", [], [["DV", true], ["K"], ["PieceId"]], "Taken = 0")}
${work(`${P}Slot`, "Civ TEXT PRIMARY KEY, Age TEXT, N INTEGER, Rank INTEGER, K INTEGER")}
INSERT OR IGNORE INTO ${P}Slot (Civ, Age, N) ${receivers};
${rankUpdate(`${P}Slot`, "Rank", [], [["Civ"]])}
UPDATE ${P}Slot SET K = ${key(salt, "Rank")};
${work(`${P}Dealt`, "PieceId TEXT PRIMARY KEY, Civ TEXT, FromCiv TEXT, Value INTEGER, SortIndex INTEGER")}
DROP VIEW IF EXISTS ${P}Next;
CREATE VIEW ${P}Next AS SELECT c.PieceId AS PieceId, c.Civ AS FromCiv, c.Value AS Value, s.Civ AS Holder
  FROM (SELECT p.PieceId, p.Civ, p.Age, p.Value FROM ${P} p WHERE p.Taken = 0
    AND NOT EXISTS (SELECT 1 FROM ${P}Dealt d WHERE d.PieceId = p.PieceId) ORDER BY p.DeckOrd LIMIT 1) c
  LEFT JOIN ${P}Slot s ON s.Age = c.Age AND ${got} < s.N
  ORDER BY CASE WHEN s.Civ = c.Civ THEN 1 ELSE 0 END,
    CASE WHEN ${CFG("Balanced")} = 1 THEN (${value} * ${BALANCE_SCALE}) / s.N ELSE 0 END, s.K, s.Civ
  LIMIT 1;
${Array.from({ length: POOL_STEP_CAP }, () => step).join("\n")}
DELETE FROM ${P}Dealt WHERE Civ IS NULL;
${rankUpdate(`${P}Dealt`, "SortIndex", ["Civ"], [["FromCiv"], ["PieceId"]])}
`;
}

// Civilization civics = Split (CONTRACTS 21): every civic of every civ with a tree nobody swapped whole, one pool per
// age; each civ that took no civic card gets back as many as it had.
function civicPool() {
  const on = `${CFG("CC")} = ${q(CC_MODE.Split)}`;
  const inPool = `c.Civ IN (SELECT Civ FROM LShufWork_CivInfo) AND NOT ${TAKEN(CIVC("c.Civ"))} AND NOT ${RIDER(NODE("c.Node"))}`;
  // A bundle's value is its members' costs (CONTRACTS 23 R2).
  const cost = `COALESCE(c.Cost, 0) + COALESCE((SELECT SUM(COALESCE(m.Cost, 0)) FROM LShufWork_CivNodeLead l
    JOIN LShufWork_CivNode m ON m.Node = l.Node WHERE l.Lead = c.Node AND l.Node <> c.Node), 0)`;
  return pool("LShufWork_CivNP", SALT.CivNodes,
    `SELECT ${NODE("c.Node")}, c.Civ, ${PLAY_OF("c.Civ")}, ${cost}, CASE WHEN ${TAKEN(NODE("c.Node"))} THEN 1 ELSE 0 END
  FROM LShufWork_CivNode c WHERE ${on} AND ${inPool}`,
    `SELECT c.Civ, ${PLAY_OF("c.Civ")}, COUNT(*) FROM LShufWork_CivNode c WHERE ${on} AND ${inPool}
    AND c.Civ NOT IN (SELECT Builder FROM LShufWork_CivNTake) GROUP BY c.Civ`);
}

// Civilization uniques = Split: every unique, one pool per age; each civ that took no unique card gets back as many
// as it had.
function uniquePool() {
  const on = `${CFG("CU")} = ${q(CU_MODE.Split)}`;
  return pool("LShufWork_CivUP", SALT.CivUniquePieces,
    `SELECT ${UNQ("u.Type")}, u.Civ, ${PLAY_OF("u.Civ")}, 1, CASE WHEN ${TAKEN(UNQ("u.Type"))} THEN 1 ELSE 0 END
  FROM LShufWork_CivUnique u WHERE ${on} AND NOT ${RIDER(UNQ("u.Type"))}`,
    `SELECT u.Civ, ${PLAY_OF("u.Civ")}, COUNT(*) FROM LShufWork_CivUnique u WHERE ${on} AND NOT ${RIDER(UNQ("u.Type"))}
    AND u.Civ NOT IN (SELECT Builder FROM LShufWork_CivTake) GROUP BY u.Civ`);
}

// The shuffle (lshuf-deal-civ.js civShuffle): per age over the unbuilt civs. LShufWork_CivShuf holds one row per
// unbuilt civ with its ability-cycle donor (over civs whose ability no builder took, SALT.CivAbilities) and its
// unique-cycle donor (over every unbuilt civ, SALT.CivUniques). Ranks within an age follow CivilizationType order,
// as cyclicDonors ranks the sorted ids.
// Civics With the ability (lshuf-deal-civ.js followCycle): the ability cycle walked over the civs with a free civics
// tree, each taking the next such civ along it, so nobody holds two trees and nobody is left without one.
const PAIRED_WALK_CAP = 64;
function pairedCivics(cc) {
  const T = "LShufWork_CivShuf";
  const paired = `${cc} = ${q(CC_MODE.Paired)}`;
  const eligible = `SELECT o.Civ FROM ${T} o WHERE o.HasCivics = 1`;
  const step = `UPDATE ${T} SET CDonor = (SELECT o.ADonor FROM ${T} o WHERE o.Civ = ${T}.CDonor)
  WHERE ${paired} AND CDonor IS NOT NULL AND CDonor <> Civ AND CDonor NOT IN (${eligible});`;
  return `UPDATE ${T} SET CDonor = ADonor WHERE ${paired} AND HasCivics = 1 AND ADonor IS NOT NULL;
${Array.from({ length: PAIRED_WALK_CAP }, () => step).join("\n")}
UPDATE ${T} SET CDonor = NULL WHERE ${paired} AND CDonor IS NOT NULL AND (CDonor = Civ OR CDonor NOT IN (${eligible}));`;
}

function shuffle() {
  const ca = CFG("CA");
  const cu = CFG("CU");
  const cc = CFG("CC");
  const built = "SELECT b.Civ FROM LShufWork_Build b WHERE b.OK = 1 AND b.Civ IS NOT NULL";
  const cycle = (prefix, salt, elig) => {
    const T = "LShufWork_CivShuf";
    const peer = `o.Age = ${T}.Age AND o.${elig} = 1`;
    return `UPDATE ${T} SET ${prefix}Rank = (SELECT COUNT(*) FROM ${T} o WHERE ${peer} AND o.Civ < ${T}.Civ) WHERE ${elig} = 1;
UPDATE ${T} SET ${prefix}K = ${key(salt, `${prefix}Rank`)},
  ${prefix}N = (SELECT COUNT(*) FROM ${T} o WHERE ${peer}) WHERE ${elig} = 1;
UPDATE ${T} SET ${prefix}Pos = (SELECT COUNT(*) FROM ${T} o WHERE ${peer}
    AND (o.${prefix}K < ${T}.${prefix}K OR (o.${prefix}K = ${T}.${prefix}K AND o.Civ < ${T}.Civ))) WHERE ${elig} = 1;
UPDATE ${T} SET ${prefix}Donor = (SELECT o.Civ FROM ${T} o WHERE ${peer} AND o.${prefix}Pos = (${T}.${prefix}Pos + 1) % ${T}.${prefix}N)
  WHERE ${elig} = 1 AND ${prefix}N >= 2;`;
  };
  return `${work("LShufWork_CivShuf", "Civ TEXT PRIMARY KEY, Age TEXT, ForA INTEGER, ARank INTEGER, AK INTEGER, APos INTEGER, AN INTEGER, ADonor TEXT, "
    + "URank INTEGER, UK INTEGER, UPos INTEGER, UN INTEGER, UDonor TEXT, ForU INTEGER, "
    + "CRank INTEGER, CK INTEGER, CPos INTEGER, CN INTEGER, CDonor TEXT, ForC INTEGER, HasCivics INTEGER, "
    + "TRank INTEGER, TK INTEGER, TPos INTEGER, TN INTEGER, TDonor TEXT, ForT INTEGER")}
INSERT INTO LShufWork_CivShuf (Civ, Age, ForA, ForT, ForU, HasCivics, ForC) SELECT i.Civ, i.Age,
    CASE WHEN ${ca} = ${q(CA_MODE.Swapped)} AND NOT ${TAKEN(ABIL("i.Civ"))} THEN 1 ELSE 0 END,
    CASE WHEN ${ca} = ${q(CA_MODE.Split)} AND NOT ${TAKEN(ABIL("i.Civ"))} THEN 1 ELSE 0 END,
    CASE WHEN ${cu} = ${q(CU_MODE.Shuffled)} THEN 1 ELSE 0 END,
    CASE WHEN i.Tree IS NOT NULL AND NOT ${TAKEN(CIVC("i.Civ"))} THEN 1 ELSE 0 END,
    CASE WHEN ${cc} = ${q(CC_MODE.Shuffled)} AND i.Tree IS NOT NULL AND NOT ${TAKEN(CIVC("i.Civ"))} THEN 1 ELSE 0 END
  FROM LShufWork_CivInfo i WHERE i.Civ NOT IN (${built});
${cycle("A", SALT.CivAbilities, "ForA")}
${cycle("T", SALT.CivTags, "ForT")}
${cycle("U", SALT.CivUniques, "ForU")}
${cycle("C", SALT.CivCivics, "ForC")}
UPDATE LShufWork_CivShuf SET UDonor = ADonor WHERE ${cu} = ${q(CU_MODE.Paired)};
${pairedCivics(cc)}
UPDATE LShufWork_CivShuf SET ADonor = NULL WHERE ADonor = Civ;
UPDATE LShufWork_CivShuf SET TDonor = NULL WHERE TDonor = Civ;
UPDATE LShufWork_CivShuf SET UDonor = NULL WHERE UDonor = Civ;
UPDATE LShufWork_CivShuf SET CDonor = NULL WHERE CDonor = Civ;
${work("LShufWork_CivShufU", "Civ TEXT, Type TEXT, Donor TEXT, SortIndex INTEGER, PRIMARY KEY (Civ, Type)")}
INSERT OR IGNORE INTO LShufWork_CivShufU (Civ, Type, Donor) SELECT s.Civ, u.Type, s.UDonor FROM LShufWork_CivShuf s
  JOIN LShufWork_CivUnique u ON u.Civ = s.UDonor WHERE s.UDonor IS NOT NULL AND NOT ${TAKEN(UNQ("u.Type"))}
    AND NOT ${RIDER(UNQ("u.Type"))};
${rankUpdate("LShufWork_CivShufU", "SortIndex", ["Civ"], [["Type"]])}
`;
}

function results() {
  const ins = "INSERT OR IGNORE INTO LShufResultCivPieces (CivilizationType, PieceId, FromCivilization, Kind, SortIndex)";
  const why = `CASE WHEN b.OK = 0 THEN b.Why
    WHEN b.Civ IS NULL OR b.Civ NOT IN (SELECT Civ FROM LShufWork_CivInfo) THEN ${q(BUILD_WHY.NotInGame)}
    WHEN NOT EXISTS (SELECT 1 FROM LShufWork_CivSwap s WHERE s.Slot = b.Slot)
      AND NOT EXISTS (SELECT 1 FROM LShufWork_CivCSwap s WHERE s.Slot = b.Slot)
      AND NOT EXISTS (SELECT 1 FROM LShufWork_CivTake t WHERE t.Slot = b.Slot)
      AND NOT EXISTS (SELECT 1 FROM LShufWork_CivPTake t WHERE t.Slot = b.Slot)
      AND NOT EXISTS (SELECT 1 FROM LShufWork_CivNTake t WHERE t.Slot = b.Slot) THEN ${q(BUILD_WHY.NoPieces)}
    ELSE 'ok' END`;
  return `${rankUpdate("LShufWork_CivTake", "SortIndex", ["Slot"], [["Type"]])}
${rankUpdate("LShufWork_CivNTake", "SortIndex", ["Slot"], [["Node"]])}
DELETE FROM LShufResultCivPieces;
${ins} SELECT Builder, ${ABIL("Source")}, Source, 'ability', 0 FROM LShufWork_CivSwap;
${ins} SELECT Source, ${ABIL("Builder")}, Builder, 'ability', 0 FROM LShufWork_CivSwap;
${ins} SELECT Builder, ${CIVC("Source")}, Source, 'civics', 0 FROM LShufWork_CivCSwap;
${ins} SELECT Source, ${CIVC("Builder")}, Builder, 'civics', 0 FROM LShufWork_CivCSwap;
${ins} SELECT Builder, ${UNQ("Type")}, Source, 'unique', SortIndex + 1 FROM LShufWork_CivTake;
${ins} SELECT Civ, ${ABIL("ADonor")}, ADonor, 'ability', 0 FROM LShufWork_CivShuf WHERE ADonor IS NOT NULL;
${ins} SELECT Civ, ${CIVC("CDonor")}, CDonor, 'civics', 0 FROM LShufWork_CivShuf WHERE CDonor IS NOT NULL;
${ins} SELECT Civ, ${UNQ("Type")}, Donor, 'unique', SortIndex + 1 FROM LShufWork_CivShufU;
-- Attribute tags (CONTRACTS 30): a whole ability brings its civ's tags; abilities in pieces deal them round a cycle.
${ins} SELECT CivilizationType, ${TAGS("FromCivilization")}, FromCivilization, 'tags', 0 FROM LShufResultCivPieces WHERE Kind = 'ability';
${ins} SELECT Civ, ${TAGS("TDonor")}, TDonor, 'tags', 0 FROM LShufWork_CivShuf WHERE TDonor IS NOT NULL;
${ins} SELECT Civ, PieceId, FromCiv, CASE WHEN IsRest = 1 THEN 'remainder' ELSE 'bullet' END, SortIndex FROM LShufWork_CivHeld;
${ins} SELECT Builder, ${NODE("Node")}, Source, 'civic', SortIndex + 1 FROM LShufWork_CivNTake;
${ins} SELECT Civ, PieceId, FromCiv, 'civic', SortIndex + 1 FROM LShufWork_CivNPDealt;
${ins} SELECT Civ, PieceId, FromCiv, 'unique', SortIndex + 1 FROM LShufWork_CivUPDealt;
-- Every rider goes with its lead (CONTRACTS 23).
${ins} SELECT r.CivilizationType, w.Rider, r.FromCivilization, r.Kind, r.SortIndex FROM LShufResultCivPieces r
  JOIN LShufWork_CivRider w ON w.Lead = r.PieceId AND w.Kind = r.Kind;
INSERT INTO LShufResultMeta (Name, Value) SELECT 'CivPiecesActive', '1' WHERE ${SPLIT};
INSERT INTO LShufResultMeta (Name, Value) SELECT 'CivAbilitiesOff', '1' WHERE ${CFG("CA")} = ${q(CA_MODE.Off)};
INSERT INTO LShufResultMeta (Name, Value) SELECT 'CivUniquesOff', '1' WHERE ${CFG("CU")} = ${q(CU_MODE.Off)};
INSERT INTO LShufResultMeta (Name, Value) SELECT 'CivCivicsOff', '1' WHERE ${CFG("CC")} = ${q(CC_MODE.Off)};
INSERT INTO LShufResultMeta (Name, Value)
  SELECT 'CivBuilder' || CASE WHEN b.Slot = 1 THEN '' ELSE CAST(b.Slot AS TEXT) END, ${why} FROM LShufWork_Build b ORDER BY b.Slot;
`;
}

export function civSql() {
  return [
    header("Deal step 5b: civilization builds"),
    info(),
    work("LShufWork_CivTaken", "PieceId TEXT PRIMARY KEY"),
    work("LShufWork_CivSwap", "Slot INTEGER, Builder TEXT, Source TEXT"),
    work("LShufWork_CivCSwap", "Slot INTEGER, Builder TEXT, Source TEXT"),
    work("LShufWork_CivTake", "Slot INTEGER, Builder TEXT, Type TEXT, Source TEXT, SortIndex INTEGER"),
    work("LShufWork_CivPTake", "Slot INTEGER, Builder TEXT, PieceId TEXT PRIMARY KEY, Source TEXT, BI INTEGER"),
    work("LShufWork_CivNTake", "Slot INTEGER, Builder TEXT, Node TEXT PRIMARY KEY, Source TEXT, SortIndex INTEGER"),
    work("LShufWork_CivPieced", "Civ TEXT PRIMARY KEY"),
    SLOTS.map(slot).join("\n"),
    shuffle(),
    split(),
    civicPool(),
    uniquePool(),
    results()
  ].join("\n");
}

// Deal step 6 (after the leader apply): the swaps and moves in the game's tables. Every statement selects through
// its parent table, so a civilization or type a player's database lacks is skipped.
export function civApplySql() {
  const trait = (civ) => `'TRAIT_LSHUF_CIV_' || ${civ}`;
  const unique = "SELECT PieceId FROM LShufResultCivPieces WHERE Kind = 'unique'";
  const newTrait = (type) => `(SELECT ${trait("r.CivilizationType")} FROM LShufResultCivPieces r WHERE r.Kind = 'unique' AND r.PieceId = ${UNQ(type)})`;
  const move = (table, col) => `UPDATE ${table} SET TraitType = ${newTrait(col)}
  WHERE ${UNQ(col)} IN (${unique}) AND ${newTrait(col)} IN (SELECT TraitType FROM Traits);`;
  // Everything a civ's civics tree unlocks (and so moves with the civics, CONTRACTS 18): its traditions, and the
  // buildings, quarters and improvements of its base trait that any civ civics tree unlocks.
  const civicUnlocked = CIVIC_UNLOCKED;
  // keep: the rows that belong to the civics and stay where they are (CONTRACTS 18).
  const offMove = (table, col, keep) => `UPDATE ${table} SET TraitType = 'TRAIT_LSHUF_NONE'
  WHERE ${CFG("CU")} = ${q(CU_MODE.Off)} AND 'TRAIT_LSHUF_NONE' IN (SELECT TraitType FROM Traits)
    AND TraitType IN (SELECT Base FROM LShufWork_CivInfo) AND ${UNQ(col)} NOT IN (${unique}) AND ${col} NOT IN (${keep});`;
  // Unique civics (CONTRACTS 18) move as the civ's base trait (TRAIT_<D>): the game's Traditions table can't be
  // written (its CultureSlotAllowances foreign key is a mismatch, so any UPDATE fails), and the tree's reveal, the
  // traditions, the buildings, quarters and improvements the tree unlocks all hang on that trait. The units and any
  // main-tree improvement stay with the uniques: they go onto the giver's own TRAIT_LSHUF_CIV_<D> first. A unit family
  // only the civ's own civics unlock stays on the base trait and goes with it.
  const civicsGivers = `SELECT d.Civ FROM LShufWork_CivInfo d WHERE d.Civ IN (SELECT FromCivilization FROM LShufResultCivPieces WHERE Kind = 'civics')
    OR (${CFG("CC")} = ${q(CC_MODE.Off)} AND d.Tree IS NOT NULL)`;
  const giverBases = `SELECT d.Base FROM LShufWork_CivInfo d WHERE d.Civ IN (${civicsGivers})`;
  const ownOfBase = (col) => `(SELECT ${trait("d.Civ")} FROM LShufWork_CivInfo d WHERE d.Base = ${col})`;
  const rescue = (table, col, extra = "") => `UPDATE ${table} SET ${col} = ${ownOfBase(col)}
  WHERE ${col} IN (${giverBases}) AND ${ownOfBase(col)} IN (SELECT TraitType FROM Traits)${extra};`;
  const newHolder = `(SELECT r.CivilizationType FROM LShufResultCivPieces r JOIN LShufWork_CivInfo d ON d.Civ = r.FromCivilization
    WHERE r.Kind = 'civics' AND d.Base = CivilizationTraits.TraitType AND d.Civ = CivilizationTraits.CivilizationType)`;
  return `-- Civilization builds (CONTRACTS 14): ability swaps, then the moved uniques on a trait of the builder civ's own.
${work("LShufWork_CivTraitSwap", "Civ TEXT, OldTrait TEXT, NewTrait TEXT, PRIMARY KEY (Civ, OldTrait)")}
INSERT OR IGNORE INTO LShufWork_CivTraitSwap (Civ, OldTrait, NewTrait)
  SELECT r.CivilizationType, i.Ability, s.Ability FROM LShufResultCivPieces r
  JOIN LShufWork_CivInfo i ON i.Civ = r.CivilizationType JOIN LShufWork_CivInfo s ON s.Civ = r.FromCivilization
  WHERE r.Kind = 'ability';
UPDATE CivilizationTraits SET TraitType = (SELECT w.NewTrait FROM LShufWork_CivTraitSwap w
    WHERE w.Civ = CivilizationTraits.CivilizationType AND w.OldTrait = CivilizationTraits.TraitType)
  WHERE EXISTS (SELECT 1 FROM LShufWork_CivTraitSwap w WHERE w.Civ = CivilizationTraits.CivilizationType
    AND w.OldTrait = CivilizationTraits.TraitType AND w.NewTrait IN (SELECT TraitType FROM Traits));
INSERT OR IGNORE INTO Types (Type, Kind) SELECT DISTINCT ${trait("CivilizationType")}, 'KIND_TRAIT' FROM LShufResultCivPieces
  WHERE Kind IN ('unique', 'civics', 'civic') AND CivilizationType IN (SELECT CivilizationType FROM Civilizations);
INSERT OR IGNORE INTO Traits (TraitType, InternalOnly) SELECT DISTINCT ${trait("CivilizationType")}, 1 FROM LShufResultCivPieces
  WHERE Kind IN ('unique', 'civics', 'civic') AND ${trait("CivilizationType")} IN (SELECT Type FROM Types);
INSERT OR IGNORE INTO CivilizationTraits (CivilizationType, TraitType) SELECT DISTINCT CivilizationType, ${trait("CivilizationType")}
  FROM LShufResultCivPieces WHERE Kind IN ('unique', 'civics', 'civic') AND CivilizationType IN (SELECT CivilizationType FROM Civilizations)
    AND ${trait("CivilizationType")} IN (SELECT TraitType FROM Traits);
UPDATE Units SET TraitType = (SELECT ${trait("r.CivilizationType")} FROM LShufResultCivPieces r WHERE r.Kind = 'unique'
    AND (r.PieceId = ${UNQ("Units.UnitType")} OR Units.UnitType LIKE substr(r.PieceId, 8) || '\\_%' ESCAPE '\\'))
  WHERE EXISTS (SELECT 1 FROM LShufResultCivPieces r WHERE r.Kind = 'unique'
    AND (r.PieceId = ${UNQ("Units.UnitType")} OR Units.UnitType LIKE substr(r.PieceId, 8) || '\\_%' ESCAPE '\\')
    AND ${trait("r.CivilizationType")} IN (SELECT TraitType FROM Traits));
${move("Improvements", "ConstructibleType")}
-- The main-tree nodes that unlock a moved unique (its whole family) ask for the new civ's trait instead of the source's.
UPDATE ProgressionTreeNodeUnlocks SET RequiredTraitType = (SELECT ${trait("r.CivilizationType")} FROM LShufResultCivPieces r
    JOIN LShufWork_CivInfo s ON s.Civ = r.FromCivilization
    WHERE r.Kind = 'unique' AND s.Base = ProgressionTreeNodeUnlocks.RequiredTraitType
      AND (r.PieceId = ${UNQ("ProgressionTreeNodeUnlocks.TargetType")}
        OR ProgressionTreeNodeUnlocks.TargetType LIKE substr(r.PieceId, 8) || '\\_%' ESCAPE '\\'))
  WHERE EXISTS (SELECT 1 FROM LShufResultCivPieces r JOIN LShufWork_CivInfo s ON s.Civ = r.FromCivilization
    WHERE r.Kind = 'unique' AND s.Base = ProgressionTreeNodeUnlocks.RequiredTraitType
      AND (r.PieceId = ${UNQ("ProgressionTreeNodeUnlocks.TargetType")}
        OR ProgressionTreeNodeUnlocks.TargetType LIKE substr(r.PieceId, 8) || '\\_%' ESCAPE '\\')
      AND ${trait("r.CivilizationType")} IN (SELECT TraitType FROM Traits));
-- Civilization abilities Off for everyone (CONTRACTS 16): every civ's ability trait row goes, except a civ that took one.
DELETE FROM CivilizationTraits WHERE ${CFG("CA")} = ${q(CA_MODE.Off)}
  AND TraitType IN (SELECT Ability FROM LShufWork_CivInfo)
  AND CivilizationType NOT IN (SELECT CivilizationType FROM LShufResultCivPieces WHERE Kind = 'ability');
-- Civilization uniques Off for everyone: every unique goes onto a trait no civ holds, except the ones builders took.
INSERT OR IGNORE INTO Types (Type, Kind) SELECT 'TRAIT_LSHUF_NONE', 'KIND_TRAIT' WHERE ${CFG("CU")} = ${q(CU_MODE.Off)};
INSERT OR IGNORE INTO Traits (TraitType, InternalOnly) SELECT 'TRAIT_LSHUF_NONE', 1 WHERE 'TRAIT_LSHUF_NONE' IN (SELECT Type FROM Types);
${offMove("Units", "UnitType", CIVIC_UNITS)}
${offMove("Improvements", "ConstructibleType", civicUnlocked)}
-- Unique civics (CONTRACTS 18): every civ that gives its civics (or loses them to Off) gets a trait of its own for
-- its units and main-tree improvements, then its base trait goes to the receiver.
INSERT OR IGNORE INTO Types (Type, Kind) SELECT ${trait("Civ")}, 'KIND_TRAIT' FROM LShufWork_CivInfo WHERE Civ IN (${civicsGivers});
INSERT OR IGNORE INTO Traits (TraitType, InternalOnly) SELECT ${trait("Civ")}, 1 FROM LShufWork_CivInfo
  WHERE Civ IN (${civicsGivers}) AND ${trait("Civ")} IN (SELECT Type FROM Types);
INSERT OR IGNORE INTO CivilizationTraits (CivilizationType, TraitType) SELECT Civ, ${trait("Civ")} FROM LShufWork_CivInfo
  WHERE Civ IN (${civicsGivers}) AND Civ IN (SELECT CivilizationType FROM Civilizations) AND ${trait("Civ")} IN (SELECT TraitType FROM Traits);
${rescue("Units", "TraitType", ` AND UnitType NOT IN (${CIVIC_UNITS})`)}
${rescue("Improvements", "TraitType", ` AND ConstructibleType NOT IN (${civicUnlocked})`)}
${rescue("ProgressionTreeNodeUnlocks", "RequiredTraitType")}
${rescue("ProgressionTreeNodeUnlocks", "NotTraitType")}
UPDATE CivilizationTraits SET CivilizationType = ${newHolder}
  WHERE ${newHolder} IN (SELECT CivilizationType FROM Civilizations);
-- Civilization civics Off for everyone: the base trait of every civ whose civics didn't move goes to nobody.
DELETE FROM CivilizationTraits WHERE ${CFG("CC")} = ${q(CC_MODE.Off)} AND TraitType IN (${giverBases})
  AND TraitType NOT IN (SELECT d.Base FROM LShufWork_CivInfo d WHERE d.Civ IN (SELECT FromCivilization FROM LShufResultCivPieces WHERE Kind = 'civics'));
-- Civics in pieces (CONTRACTS 21): a moved civic goes into its new civ's tree as the tree stands after the whole
-- swaps; a civ with no tree of its own (another age's civ, which holds TRAIT_ANACHRONISTIC_CIV) gets it in the age's
-- Test of Time tree, gated on the civ's own trait. Prerequisites that would cross trees go. What the civic unlocks
-- (buildings, improvements, units) goes onto the new civ's own trait, as a taken unique does.
${work("LShufWork_CivFinalTree", "Civ TEXT PRIMARY KEY, Tree TEXT")}
INSERT OR IGNORE INTO LShufWork_CivFinalTree (Civ, Tree) SELECT i.Civ, COALESCE(
    (SELECT d.Tree FROM LShufResultCivPieces r JOIN LShufWork_CivInfo d ON d.Civ = r.FromCivilization
      WHERE r.Kind = 'civics' AND r.CivilizationType = i.Civ),
    i.Tree,
    CASE WHEN EXISTS (SELECT 1 FROM CivilizationTraits ct WHERE ct.CivilizationType = i.Civ AND ct.TraitType = 'TRAIT_ANACHRONISTIC_CIV')
      THEN (SELECT MIN(ProgressionTreeType) FROM ProgressionTrees WHERE ProgressionTreeType LIKE 'TREE\\_CIVICS\\_%\\_TEST\\_OF\\_TIME' ESCAPE '\\') END)
  FROM LShufWork_CivInfo i;
${work("LShufWork_CivMoved", "Node TEXT PRIMARY KEY, Civ TEXT, Tree TEXT, OwnTrait TEXT")}
INSERT OR IGNORE INTO LShufWork_CivMoved (Node, Civ, Tree, OwnTrait)
  SELECT substr(r.PieceId, 9), r.CivilizationType, f.Tree, ${trait("r.CivilizationType")} FROM LShufResultCivPieces r
  JOIN LShufWork_CivFinalTree f ON f.Civ = r.CivilizationType
  WHERE r.Kind = 'civic' AND f.Tree IN (SELECT ProgressionTreeType FROM ProgressionTrees)
    AND substr(r.PieceId, 9) IN (SELECT ProgressionTreeNodeType FROM ProgressionTreeNodes);
UPDATE ProgressionTreeNodes SET ProgressionTree = (SELECT m.Tree FROM LShufWork_CivMoved m WHERE m.Node = ProgressionTreeNodes.ProgressionTreeNodeType)
  WHERE ProgressionTreeNodeType IN (SELECT Node FROM LShufWork_CivMoved);
DELETE FROM ProgressionTreePrereqs WHERE (Node IN (SELECT Node FROM LShufWork_CivMoved) OR PrereqNode IN (SELECT Node FROM LShufWork_CivMoved))
  AND (SELECT a.ProgressionTree FROM ProgressionTreeNodes a WHERE a.ProgressionTreeNodeType = ProgressionTreePrereqs.Node)
    <> (SELECT b.ProgressionTree FROM ProgressionTreeNodes b WHERE b.ProgressionTreeNodeType = ProgressionTreePrereqs.PrereqNode);
INSERT OR IGNORE INTO ProgressionTreeNodeTraits (ProgressionTreeNodeType, RequiredTraitType)
  SELECT m.Node, m.OwnTrait FROM LShufWork_CivMoved m JOIN LShufWork_CivInfo i ON i.Civ = m.Civ
  WHERE i.Tree IS NULL AND m.OwnTrait IN (SELECT TraitType FROM Traits);
UPDATE ProgressionTreeNodeUnlocks SET RequiredTraitType = (SELECT m.OwnTrait FROM LShufWork_CivMoved m WHERE m.Node = ProgressionTreeNodeUnlocks.ProgressionTreeNodeType)
  WHERE ProgressionTreeNodeType IN (SELECT Node FROM LShufWork_CivMoved) AND RequiredTraitType IN (SELECT Base FROM LShufWork_CivInfo)
    AND (SELECT m.OwnTrait FROM LShufWork_CivMoved m WHERE m.Node = ProgressionTreeNodeUnlocks.ProgressionTreeNodeType) IN (SELECT TraitType FROM Traits);
UPDATE Buildings SET TraitType = (SELECT MIN(m.OwnTrait) FROM LShufWork_CivMoved m JOIN ProgressionTreeNodeUnlocks u ON u.ProgressionTreeNodeType = m.Node
    WHERE u.TargetType = Buildings.ConstructibleType)
  WHERE TraitType IN (SELECT Base FROM LShufWork_CivInfo) AND ConstructibleType IN (SELECT u.TargetType FROM ProgressionTreeNodeUnlocks u
    JOIN LShufWork_CivMoved m ON m.Node = u.ProgressionTreeNodeType WHERE m.OwnTrait IN (SELECT TraitType FROM Traits));
UPDATE Improvements SET TraitType = (SELECT MIN(m.OwnTrait) FROM LShufWork_CivMoved m JOIN ProgressionTreeNodeUnlocks u ON u.ProgressionTreeNodeType = m.Node
    WHERE u.TargetType = Improvements.ConstructibleType)
  WHERE TraitType IN (SELECT Base FROM LShufWork_CivInfo) AND ConstructibleType IN (SELECT u.TargetType FROM ProgressionTreeNodeUnlocks u
    JOIN LShufWork_CivMoved m ON m.Node = u.ProgressionTreeNodeType WHERE m.OwnTrait IN (SELECT TraitType FROM Traits));
UPDATE Units SET TraitType = (SELECT MIN(m.OwnTrait) FROM LShufWork_CivMoved m JOIN ProgressionTreeNodeUnlocks u ON u.ProgressionTreeNodeType = m.Node
    WHERE ${FAMILY("Units.UnitType", "u.TargetType")})
  WHERE TraitType IN (SELECT Base FROM LShufWork_CivInfo) AND EXISTS (SELECT 1 FROM ProgressionTreeNodeUnlocks u
    JOIN LShufWork_CivMoved m ON m.Node = u.ProgressionTreeNodeType WHERE ${FAMILY("Units.UnitType", "u.TargetType")} AND m.OwnTrait IN (SELECT TraitType FROM Traits));
-- A great person tied to a quarter or constructible (CONTRACTS 23 R1) goes onto the trait that now carries it.
UPDATE Units SET TraitType = ${GP_ANCHOR_TRAIT}
  WHERE UnitType IN (SELECT UnitType FROM LShufWork_CivicGP) AND TraitType IN (SELECT Base FROM LShufWork_CivInfo)
    AND ${GP_ANCHOR_TRAIT} LIKE 'TRAIT\\_LSHUF\\_CIV\\_%' ESCAPE '\\' AND ${GP_ANCHOR_TRAIT} IN (SELECT TraitType FROM Traits);
UPDATE UniqueQuarters SET TraitType = (SELECT b.TraitType FROM Buildings b WHERE b.ConstructibleType = UniqueQuarters.BuildingType1)
  WHERE (SELECT b.TraitType FROM Buildings b WHERE b.ConstructibleType = UniqueQuarters.BuildingType1) LIKE 'TRAIT\\_LSHUF\\_CIV\\_%' ESCAPE '\\'
    AND (SELECT b.TraitType FROM Buildings b WHERE b.ConstructibleType = UniqueQuarters.BuildingType1)
      = (SELECT b.TraitType FROM Buildings b WHERE b.ConstructibleType = UniqueQuarters.BuildingType2);
-- The civics-tree reveal of Exploration and Modern (MOD_REVEAL_CIV_CULTURE_TREE_<CIV>) sits on the ability but asks
-- for the base trait. It moves onto the base trait, which carries the civics (CONTRACTS 18), so the tree opens for
-- whoever holds them: a builder holding only other civs' bonus cards, or a civ whose ability went elsewhere.
${work("LShufWork_CivReveal", "ModifierId TEXT PRIMARY KEY, Ability TEXT, Base TEXT")}
INSERT OR IGNORE INTO LShufWork_CivReveal (ModifierId, Ability, Base)
  SELECT tm.ModifierId, i.Ability, i.Base FROM TraitModifiers tm JOIN LShufWork_CivInfo i ON i.Ability = tm.TraitType
  JOIN Modifiers m ON m.ModifierId = tm.ModifierId JOIN DynamicModifiers dm ON dm.ModifierType = m.ModifierType
  WHERE dm.EffectType = 'EFFECT_PLAYER_REVEAL_CULTURE_TREE' AND i.Base IN (SELECT TraitType FROM Traits) AND ${CIV_DEAL_RAN()};
INSERT OR IGNORE INTO TraitModifiers (TraitType, ModifierId) SELECT Base, ModifierId FROM LShufWork_CivReveal;
DELETE FROM TraitModifiers WHERE EXISTS (SELECT 1 FROM LShufWork_CivReveal v
  WHERE v.Ability = TraitModifiers.TraitType AND v.ModifierId = TraitModifiers.ModifierId);
-- An ability's own modifiers that ask for the civ's base trait (MOD_CIV_WONDER_PRODUCTION_<CIV>) ask for the ability
-- trait instead, so they follow the ability wherever it goes (CONTRACTS 14).
UPDATE RequirementArguments SET Value = Value || '_ABILITY'
  WHERE Name = 'TraitType' AND Value IN (SELECT Base FROM LShufWork_CivInfo) AND Value || '_ABILITY' IN (SELECT TraitType FROM Traits)
    AND RequirementId IN (SELECT rsr.RequirementId FROM RequirementSetRequirements rsr JOIN Modifiers m
      ON m.SubjectRequirementSetId = rsr.RequirementSetId OR m.OwnerRequirementSetId = rsr.RequirementSetId
      JOIN TraitModifiers tm ON tm.ModifierId = m.ModifierId WHERE tm.TraitType = RequirementArguments.Value || '_ABILITY');
${splitApply()}
${boundApply()}
${wonderApply()}
${ruleApply()}
${tagsApply()}`;
}

// The trait an R1 unit's anchor sits on now (CONTRACTS 23 R1): its quarter's building, its constructible, or the
// civic it belongs to when that civic moved.
const GP_ANCHOR_TRAIT = `(SELECT COALESCE((SELECT b.TraitType FROM Buildings b WHERE b.ConstructibleType = g.Anchor),
    (SELECT m.TraitType FROM Improvements m WHERE m.ConstructibleType = g.Anchor),
    (SELECT v.OwnTrait FROM LShufWork_CivMoved v WHERE v.Node = g.Anchor))
  FROM LShufWork_CivicGP g WHERE g.UnitType = Units.UnitType)`;

// Bound modifiers (CONTRACTS 23 R4), last: each sits only on the trait its unit, building or quarter is on now, its
// copies included. A modifier or anchor a database lacks is left alone, and so is a game the civ deal didn't touch.
// A modifier bound only through its piece (ByPiece) stays where the copy path put it when a builder took that
// piece's own card (CONTRACTS 29): the builder holds the bonus, and the unique's holder doesn't get it as well.
function boundApply() {
  return `-- Bound modifiers (CONTRACTS 23 R4): a unique's own rules go wherever the unique went.
${work("LShufWork_Bound", "ModifierId TEXT PRIMARY KEY, Trait TEXT")}
INSERT OR IGNORE INTO LShufWork_Bound (ModifierId, Trait) SELECT b.ModifierId, COALESCE(
    (SELECT u.TraitType FROM Units u WHERE u.UnitType = b.AnchorType),
    (SELECT x.TraitType FROM Buildings x WHERE x.ConstructibleType = b.AnchorType),
    (SELECT q.TraitType FROM UniqueQuarters q WHERE q.UniqueQuarterType = b.AnchorType))
  FROM LShufBoundModifiers b WHERE b.ModifierId IN (SELECT ModifierId FROM Modifiers)
    AND (b.ByPiece IS NULL OR b.ByPiece NOT IN (SELECT PieceId FROM LShufResultCivPieces WHERE Kind = 'bullet'))
    AND (EXISTS (SELECT 1 FROM LShufResultCivPieces) OR ${CFG("CA")} = ${q(CA_MODE.Off)} OR ${CFG("CU")} = ${q(CU_MODE.Off)}
      OR ${CFG("CC")} = ${q(CC_MODE.Off)});
DELETE FROM LShufWork_Bound WHERE Trait IS NULL OR Trait NOT IN (SELECT TraitType FROM Traits);
DELETE FROM TraitModifiers WHERE ModifierId IN (SELECT ModifierId FROM LShufWork_Bound)
  OR (ModifierId LIKE 'LSHUF\\_%' ESCAPE '\\' AND EXISTS (SELECT 1 FROM LShufWork_Bound b
    WHERE substr(TraitModifiers.ModifierId, -(length(b.ModifierId) + 2)) = '__' || b.ModifierId));
INSERT OR IGNORE INTO TraitModifiers (ModifierId, TraitType) SELECT ModifierId, Trait FROM LShufWork_Bound;
`;
}

// The civ deal touched this game (as boundApply reads it): a game it didn't touch stays as shipped.
const CIV_DEAL_RAN = () => `(EXISTS (SELECT 1 FROM LShufResultCivPieces) OR ${CFG("CA")} = ${q(CA_MODE.Off)}
      OR ${CFG("CU")} = ${q(CU_MODE.Off)} OR ${CFG("CC")} = ${q(CC_MODE.Off)})`;
// A modifier id or one of its copies (LSHUF_<civ>__<id>) in a TraitModifiers row.
const IS_OR_COPY = (col, id) => `(${col} = ${id} OR (${col} LIKE 'LSHUF\\_%' ESCAPE '\\'
      AND substr(${col}, -(length(${id}) + 2)) = '__' || ${id}))`;

// Favored-wonder pieces (CONTRACTS 31): the game's "+30% towards <wonder>" is an EFFECT_CITY_ADJUST_FAVORED_WONDER_
// PRODUCTION that asks for the civilization's own base trait, and it raises whichever wonder the holder favors. When
// the civ deal runs, every trait row carrying one (or a copy) carries instead a modifier of the mod's own that names
// the giver's favored wonder (CivilizationFavoredWonders), with the same percent and no requirement. At home it does
// what the game's did; anywhere else it raises the wonder its text names. Read live, so another mod's favored wonder
// or percent comes along; a wonder this age's database lacks leaves the game's modifier where it is.
function wonderApply() {
  const T = "LShufWork_Wonder";
  const TYPE = "'LSHUF_WONDER_PRODUCTION_TYPE'";
  return `-- Favored-wonder pieces (CONTRACTS 31).
${work(T, "ModifierId TEXT PRIMARY KEY, Civ TEXT, Wonder TEXT, Pct TEXT, NewId TEXT")}
INSERT OR IGNORE INTO ${T} (ModifierId, Civ, Wonder, Pct, NewId)
  SELECT mm.ModifierId, m.CivilizationType, fw.FavoredWonderType, a.Value, 'LSHUF_WONDER__' || m.CivilizationType
  FROM LShufCivMappingModifiers mm JOIN LShufCivMapping m ON m.PieceId = mm.PieceId
  JOIN Modifiers mo ON mo.ModifierId = mm.ModifierId
  JOIN DynamicModifiers d ON d.ModifierType = mo.ModifierType AND d.EffectType = 'EFFECT_CITY_ADJUST_FAVORED_WONDER_PRODUCTION'
  JOIN CivilizationFavoredWonders fw ON fw.CivilizationType = m.CivilizationType
  JOIN ModifierArguments a ON a.ModifierId = mm.ModifierId AND a.Name = 'Percent'
  WHERE fw.FavoredWonderType IN (SELECT ConstructibleType FROM Constructibles) AND ${CIV_DEAL_RAN()};
INSERT OR IGNORE INTO Types (Type, Kind) SELECT ${TYPE}, 'KIND_MODIFIER' WHERE EXISTS (SELECT 1 FROM ${T});
INSERT OR IGNORE INTO DynamicModifiers (ModifierType, CollectionType, EffectType)
  SELECT ${TYPE}, 'COLLECTION_PLAYER_CITIES', 'EFFECT_CITY_ADJUST_CONSTRUCTIBLE_PRODUCTION' WHERE ${TYPE} IN (SELECT Type FROM Types);
INSERT OR IGNORE INTO Modifiers (ModifierId, ModifierType)
  SELECT NewId, ${TYPE} FROM ${T} WHERE ${TYPE} IN (SELECT ModifierType FROM DynamicModifiers);
INSERT OR IGNORE INTO ModifierArguments (ModifierId, Name, Value)
  SELECT NewId, 'ConstructibleType', Wonder FROM ${T} WHERE NewId IN (SELECT ModifierId FROM Modifiers);
INSERT OR IGNORE INTO ModifierArguments (ModifierId, Name, Value)
  SELECT NewId, 'Percent', Pct FROM ${T} WHERE NewId IN (SELECT ModifierId FROM Modifiers);
INSERT OR IGNORE INTO TraitModifiers (TraitType, ModifierId)
  SELECT tm.TraitType, w.NewId FROM TraitModifiers tm JOIN ${T} w ON ${IS_OR_COPY("tm.ModifierId", "w.ModifierId")}
  WHERE w.NewId IN (SELECT ModifierId FROM Modifiers);
DELETE FROM TraitModifiers WHERE EXISTS (SELECT 1 FROM ${T} w WHERE w.NewId IN (SELECT ModifierId FROM Modifiers)
  AND ${IS_OR_COPY("TraitModifiers.ModifierId", "w.ModifierId")});
`;
}

// Rule pieces (CONTRACTS 31): a bonus the game implements outside the ability, as an exception in its own rows
// (Assyria's "Codices are not awarded from Technologies" is the codex rewards' NotTraitType TRAIT_ASSYRIA and a
// requirement that the player isn't TRAIT_ASSYRIA). When the civ deal runs, those rows name a marker trait
// (TRAIT_LSHUF_RULE_<piece>) instead, held by whoever holds the piece: its bullet's holder, else the holder of its
// civ's whole ability, else its own civ; nobody with Civilization abilities Off.
function ruleApply() {
  const T = "LShufWork_Rule";
  const markerFor = (homeCol, targetCol) => `(SELECT w.Marker FROM ${T} w JOIN LShufCivRulePieces p ON p.PieceId = w.PieceId
    WHERE p.TargetModifier = ${targetCol} AND p.HomeTrait = ${homeCol} AND w.Marker IN (SELECT TraitType FROM Traits))`;
  return `-- Rule pieces (CONTRACTS 31).
${work(T, "PieceId TEXT PRIMARY KEY, Marker TEXT, Holder TEXT")}
INSERT OR IGNORE INTO ${T} (PieceId, Marker, Holder)
  SELECT DISTINCT p.PieceId, 'TRAIT_LSHUF_RULE_' || p.PieceId,
    CASE WHEN ${CFG("CA")} = ${q(CA_MODE.Off)} THEN NULL ELSE COALESCE(
      (SELECT r.CivilizationType FROM LShufResultCivPieces r WHERE r.PieceId = p.PieceId AND r.Kind = 'bullet'),
      (SELECT r.CivilizationType FROM LShufResultCivPieces r WHERE r.Kind = 'ability' AND r.FromCivilization = m.CivilizationType),
      m.CivilizationType) END
  FROM LShufCivRulePieces p JOIN LShufCivMapping m ON m.PieceId = p.PieceId
  WHERE p.HomeTrait IN (SELECT TraitType FROM Traits) AND ${CIV_DEAL_RAN()};
INSERT OR IGNORE INTO Types (Type, Kind) SELECT Marker, 'KIND_TRAIT' FROM ${T};
INSERT OR IGNORE INTO Traits (TraitType, InternalOnly) SELECT Marker, 1 FROM ${T} WHERE Marker IN (SELECT Type FROM Types);
INSERT OR IGNORE INTO CivilizationTraits (CivilizationType, TraitType) SELECT Holder, Marker FROM ${T}
  WHERE Holder IN (SELECT CivilizationType FROM Civilizations) AND Marker IN (SELECT TraitType FROM Traits);
UPDATE ProgressionTreeNodeUnlocks SET NotTraitType = ${markerFor("ProgressionTreeNodeUnlocks.NotTraitType", "ProgressionTreeNodeUnlocks.TargetType")}
  WHERE ${markerFor("ProgressionTreeNodeUnlocks.NotTraitType", "ProgressionTreeNodeUnlocks.TargetType")} IS NOT NULL;
UPDATE RequirementArguments SET Value = (SELECT w.Marker FROM ${T} w JOIN LShufCivRulePieces p ON p.PieceId = w.PieceId
    JOIN Modifiers mo ON mo.ModifierId = p.TargetModifier
    JOIN RequirementSetRequirements rsr ON rsr.RequirementSetId IN (mo.SubjectRequirementSetId, mo.OwnerRequirementSetId)
    WHERE rsr.RequirementId = RequirementArguments.RequirementId AND p.HomeTrait = RequirementArguments.Value
      AND w.Marker IN (SELECT TraitType FROM Traits) LIMIT 1)
  WHERE Name = 'TraitType' AND EXISTS (SELECT 1 FROM ${T} w JOIN LShufCivRulePieces p ON p.PieceId = w.PieceId
    JOIN Modifiers mo ON mo.ModifierId = p.TargetModifier
    JOIN RequirementSetRequirements rsr ON rsr.RequirementSetId IN (mo.SubjectRequirementSetId, mo.OwnerRequirementSetId)
    WHERE rsr.RequirementId = RequirementArguments.RequirementId AND p.HomeTrait = RequirementArguments.Value
      AND w.Marker IN (SELECT TraitType FROM Traits));
`;
}

// Attribute tags (CONTRACTS 30): each civ with a 'tags' row plays with its giver's plain TRAIT_ATTRIBUTE_* rows (the
// ones the attribute quests read) in place of its own. Test of Time tags (TRAIT_ATTRIBUTE_<KIND>_TOT_<AGE>, with a
// _TALL/_WIDE or _HAPPINESS/_INFLUENCE variant) exist only for the ages a civ isn't native to, so they're rebuilt:
// for each age the receiver had them in, one per kind of the giver's, with the giver's variant of that kind.
const TAG_KINDS = ["CULTURAL", "ECONOMIC", "EXPANSIONIST", "MILITARISTIC", "POLITICAL", "SCIENTIFIC"];
const TAG_VARIANTS = [["EXPANSIONIST", "TALL"], ["EXPANSIONIST", "WIDE"], ["POLITICAL", "HAPPINESS"], ["POLITICAL", "INFLUENCE"]];
const TAG = "'TRAIT\\_ATTRIBUTE\\_%' ESCAPE '\\'";
const TOT = "'%\\_TOT\\_%' ESCAPE '\\'";

function tagsApply() {
  const kinds = TAG_KINDS.map((k) => `(${q(k)})`).join(", ");
  const variants = TAG_VARIANTS.map(([k, v]) => `(${q(k)}, ${q(v)})`).join(", ");
  return `-- Attribute tags (CONTRACTS 30).
${work("LShufWork_CivTagOwn", "Civ TEXT, Trait TEXT, PRIMARY KEY (Civ, Trait)")}
INSERT OR IGNORE INTO LShufWork_CivTagOwn (Civ, Trait) SELECT CivilizationType, TraitType FROM CivilizationTraits
  WHERE TraitType LIKE ${TAG} AND CivilizationType IN (SELECT FromCivilization FROM LShufResultCivPieces WHERE Kind = 'tags'
    UNION SELECT CivilizationType FROM LShufResultCivPieces WHERE Kind = 'tags');
${work("LShufWork_CivTagKind", "Kind TEXT PRIMARY KEY")}
INSERT OR IGNORE INTO LShufWork_CivTagKind (Kind) VALUES ${kinds};
${work("LShufWork_CivTagVar", "Kind TEXT, Variant TEXT, PRIMARY KEY (Kind, Variant)")}
INSERT OR IGNORE INTO LShufWork_CivTagVar (Kind, Variant) VALUES ${variants};
-- The ages each receiver has Test of Time tags for, read before its rows go.
${work("LShufWork_CivTagAge", "Civ TEXT, Age TEXT, PRIMARY KEY (Civ, Age)")}
INSERT OR IGNORE INTO LShufWork_CivTagAge (Civ, Age) SELECT DISTINCT o.Civ, substr(o.Trait, length('TRAIT_ATTRIBUTE_' || k.Kind || '_TOT_') + 1, 2)
  FROM LShufWork_CivTagOwn o JOIN LShufWork_CivTagKind k ON o.Trait LIKE 'TRAIT\\_ATTRIBUTE\\_' || k.Kind || '\\_TOT\\_%' ESCAPE '\\'
  WHERE o.Civ IN (SELECT CivilizationType FROM LShufResultCivPieces WHERE Kind = 'tags');
DELETE FROM CivilizationTraits WHERE TraitType LIKE ${TAG}
  AND CivilizationType IN (SELECT CivilizationType FROM LShufResultCivPieces WHERE Kind = 'tags');
-- The giver's plain tags.
INSERT OR IGNORE INTO CivilizationTraits (CivilizationType, TraitType)
  SELECT r.CivilizationType, o.Trait FROM LShufResultCivPieces r JOIN LShufWork_CivTagOwn o ON o.Civ = r.FromCivilization
  WHERE r.Kind = 'tags' AND o.Trait NOT LIKE ${TOT} AND r.CivilizationType IN (SELECT CivilizationType FROM Civilizations);
-- Test of Time tags for the receiver's ages, by the giver's kinds.
INSERT OR IGNORE INTO CivilizationTraits (CivilizationType, TraitType)
  SELECT r.CivilizationType, 'TRAIT_ATTRIBUTE_' || k.Kind || '_TOT_' || a.Age FROM LShufResultCivPieces r
  JOIN LShufWork_CivTagOwn o ON o.Civ = r.FromCivilization JOIN LShufWork_CivTagKind k ON o.Trait = 'TRAIT_ATTRIBUTE_' || k.Kind
  JOIN LShufWork_CivTagAge a ON a.Civ = r.CivilizationType
  WHERE r.Kind = 'tags' AND r.CivilizationType IN (SELECT CivilizationType FROM Civilizations)
    AND 'TRAIT_ATTRIBUTE_' || k.Kind || '_TOT_' || a.Age IN (SELECT TraitType FROM Traits);
INSERT OR IGNORE INTO CivilizationTraits (CivilizationType, TraitType)
  SELECT r.CivilizationType, 'TRAIT_ATTRIBUTE_' || v.Kind || '_TOT_' || a.Age || '_' || v.Variant FROM LShufResultCivPieces r
  JOIN LShufWork_CivTagVar v ON EXISTS (SELECT 1 FROM LShufWork_CivTagOwn o WHERE o.Civ = r.FromCivilization
      AND (o.Trait = 'TRAIT_ATTRIBUTE_' || v.Kind || '_' || v.Variant
        OR o.Trait LIKE 'TRAIT\\_ATTRIBUTE\\_' || v.Kind || '\\_TOT\\_%\\_' || v.Variant ESCAPE '\\'))
  JOIN LShufWork_CivTagAge a ON a.Civ = r.CivilizationType
  WHERE r.Kind = 'tags' AND r.CivilizationType IN (SELECT CivilizationType FROM Civilizations)
    AND 'TRAIT_ATTRIBUTE_' || v.Kind || '_TOT_' || a.Age || '_' || v.Variant IN (SELECT TraitType FROM Traits);
`;
}

// Civilization abilities = Split (CONTRACTS 19): a civ with bonus rows gets TRAIT_LSHUF_CIVA_<C> in place of its
// ability trait, with copies (LSHUF_<C>__<ModifierId>, requirement sets shared) of the modifiers behind each piece
// it holds (its own, or the ones the game's age attaches in their place); the remainder copies the civ's own
// modifiers the mapping's movable pieces don't list. A copy keeps its Tooltip, so a yield line names the ability
// the bonus came from ("Siglo de Oro (Coastal)" on a civ dealt Spain's coastal yields). The copies walk
// the leader copy path's steps (sql-apply.mjs copyModifiers). A requirement that asked for the civ's ability trait
// asks for the new trait, so a home-only bonus still fires.
function splitApply() {
  const CIVA = (civ) => `'TRAIT_LSHUF_CIVA_' || ${civ}`;
  const copyCivs = "SELECT DISTINCT CivilizationType FROM LShufResultCivPieces WHERE Kind IN ('bullet', 'remainder')";
  const ability = (civ) => `(SELECT i.Ability FROM LShufWork_CivInfo i WHERE i.Civ = ${civ})`;
  // A piece's modifiers: its own and the ones another age attaches in their place (LShufCivMappingAgeModifiers).
  const PIECE_MODS = `(SELECT PieceId, ModifierId, Role FROM LShufCivMappingModifiers
      UNION SELECT PieceId, ModifierId, Role FROM LShufCivMappingAgeModifiers)`;
  const listed = `SELECT mm.ModifierId FROM ${PIECE_MODS} mm JOIN LShufCivMapping m ON m.PieceId = mm.PieceId
      WHERE m.CivilizationType = r.CivilizationType AND ${IN_PLAY("m", "i")}`;
  const newId = (col) => `'LSHUF_' || c.Receiver || '__' || ${col}`;
  return `-- Civilization abilities = Split (CONTRACTS 19): the copy path for every civ holding pieces.
${work("LShufWork_CivCopy", "Receiver TEXT, ModifierId TEXT, PRIMARY KEY (Receiver, ModifierId)")}
INSERT OR IGNORE INTO LShufWork_CivCopy (Receiver, ModifierId)
  SELECT r.CivilizationType, mm.ModifierId FROM LShufResultCivPieces r JOIN ${PIECE_MODS} mm ON mm.PieceId = r.PieceId
  WHERE r.Kind = 'bullet' AND mm.Role IN ('effect', 'hidden')
    AND mm.ModifierId IN (SELECT tm.ModifierId FROM TraitModifiers tm WHERE tm.TraitType = ${ability("r.FromCivilization")});
INSERT OR IGNORE INTO LShufWork_CivCopy (Receiver, ModifierId)
  SELECT r.CivilizationType, tm.ModifierId FROM LShufResultCivPieces r JOIN LShufWork_CivInfo i ON i.Civ = r.CivilizationType
  JOIN TraitModifiers tm ON tm.TraitType = i.Ability
  WHERE r.Kind = 'remainder' AND tm.ModifierId NOT IN (${listed});
DELETE FROM LShufWork_CivCopy WHERE ModifierId NOT IN (SELECT ModifierId FROM Modifiers);
INSERT OR IGNORE INTO Types (Type, Kind) SELECT ${CIVA("Civ")}, 'KIND_TRAIT' FROM LShufWork_CivInfo WHERE Civ IN (${copyCivs});
INSERT OR IGNORE INTO Traits (TraitType, Name, Description, InternalOnly)
  SELECT ${CIVA("i.Civ")}, i.AbilityName, 'LOC_LSHUF_TRAIT_CIV_DEALT_DESCRIPTION', 1 FROM LShufWork_CivInfo i
  WHERE i.Civ IN (${copyCivs}) AND ${CIVA("i.Civ")} IN (SELECT Type FROM Types);
UPDATE CivilizationTraits SET TraitType = ${CIVA("CivilizationType")}
  WHERE CivilizationType IN (${copyCivs}) AND TraitType = ${ability("CivilizationTraits.CivilizationType")}
    AND ${CIVA("CivilizationType")} IN (SELECT TraitType FROM Traits);
INSERT OR IGNORE INTO Modifiers (ModifierId, ModifierType, NewOnly, OwnerRequirementSetId, OwnerStackLimit, Permanent, RunOnce,
    SubjectRequirementSetId, SubjectStackLimit)
  SELECT ${newId("m.ModifierId")}, m.ModifierType, m.NewOnly, m.OwnerRequirementSetId, m.OwnerStackLimit, m.Permanent, m.RunOnce,
    m.SubjectRequirementSetId, m.SubjectStackLimit FROM LShufWork_CivCopy c JOIN Modifiers m ON m.ModifierId = c.ModifierId;
INSERT OR IGNORE INTO ModifierArguments (ModifierId, Name, Extra, SecondExtra, Type, Value)
  SELECT ${newId("a.ModifierId")}, a.Name, a.Extra, a.SecondExtra, a.Type, a.Value
  FROM LShufWork_CivCopy c JOIN ModifierArguments a ON a.ModifierId = c.ModifierId
  WHERE ${newId("a.ModifierId")} IN (SELECT ModifierId FROM Modifiers);
INSERT OR IGNORE INTO ModifierStrings (Context, ModifierId, Text)
  SELECT s.Context, ${newId("s.ModifierId")}, s.Text FROM LShufWork_CivCopy c JOIN ModifierStrings s ON s.ModifierId = c.ModifierId
  WHERE ${newId("s.ModifierId")} IN (SELECT ModifierId FROM Modifiers);
INSERT OR IGNORE INTO TraitModifiers (ModifierId, TraitType)
  SELECT ${newId("c.ModifierId")}, ${CIVA("c.Receiver")} FROM LShufWork_CivCopy c
  WHERE ${newId("c.ModifierId")} IN (SELECT ModifierId FROM Modifiers) AND ${CIVA("c.Receiver")} IN (SELECT TraitType FROM Traits);
UPDATE RequirementArguments SET Value = ${CIVA("(SELECT i.Civ FROM LShufWork_CivInfo i WHERE i.Ability = RequirementArguments.Value)")}
  WHERE Name = 'TraitType' AND Value IN (SELECT i.Ability FROM LShufWork_CivInfo i WHERE i.Civ IN (${copyCivs}))
    AND RequirementId IN (SELECT rsr.RequirementId FROM RequirementSetRequirements rsr JOIN Modifiers m
      ON m.SubjectRequirementSetId = rsr.RequirementSetId OR m.OwnerRequirementSetId = rsr.RequirementSetId
      JOIN TraitModifiers tm ON tm.ModifierId = m.ModifierId WHERE tm.TraitType = RequirementArguments.Value);
`;
}
