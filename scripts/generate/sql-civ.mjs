// Deal step 5b: civilization builds (lshuf-deal-civ.js), slot by slot. Each builder's civ (LShufWork_Build.Civ)
// swaps abilities with the first ability card's civ of the same age, swaps civics trees with the first civics
// card's civ the same way (CONTRACTS 18), takes each unique card of the same age, and under Civilization abilities
// = Split takes each bonus card's piece (CONTRACTS 19); a card a lower slot took is gone, a civ a lower slot built
// can't be a swap source, and a part already swapped can't be swapped again. Then the Split deal of the pieces
// nobody took. Writes LShufResultCivPieces and the CivBuilder<n> meta rows.
import { BUILD_WHY, CA_MODE, CC_MODE, CU_MODE } from "../../shared/lshuf-constants.js";
import { SALT } from "../../shared/lshuf-key.js";
import { BALANCE_SCALE, PIECE_STEP_CAP } from "../../shared/deal/lshuf-deal-util.js";
import { CFG, header, key, q, rankUpdate, SLOTS, work } from "./sql-util.mjs";

const ABIL = (civ) => `'CIVABIL_' || ${civ}`;
const UNQ = (type) => `'CIVUNQ_' || ${type}`;
const CIVC = (civ) => `'CIVCIVC_' || ${civ}`;
const TREE_OF = (civ) => `(SELECT i.Tree FROM LShufWork_CivInfo i WHERE i.Civ = ${civ})`;
const TAKEN = (id) => `${id} IN (SELECT PieceId FROM LShufWork_CivTaken)`;
const AGE_OF = (civ) => `(SELECT i.Age FROM LShufWork_CivInfo i WHERE i.Civ = ${civ})`;
const BUILDER = (n) => `(SELECT b.Civ FROM LShufWork_Build b WHERE b.Slot = ${n} AND b.OK = 1 AND b.Civ IN (SELECT Civ FROM LShufWork_CivInfo))`;
const SPLIT = `${CFG("CA")} = ${q(CA_MODE.Split)}`;
const PIECED = (civ) => `${civ} IN (SELECT Civ FROM LShufWork_CivPieced)`;
// A civ's pieces in play (CONTRACTS 19): the mapping's movable bullets of the civ's own age.
const IN_PLAY = (m, i) => `${m}.Kind = 'bullet' AND ${m}.Movable = 1 AND ${m}.Age = ${i}.Age`;
// A civ's own civics tree: any TREE_CIVICS_* tree but an age's main one (CONTRACTS 18).
const CIVIC_TREE = "n.ProgressionTree LIKE 'TREE\\_CIVICS\\_%' ESCAPE '\\' AND n.ProgressionTree NOT LIKE '%\\_MAIN' ESCAPE '\\'";
const UNLOCKED_WHERE = (cond) => `SELECT u.TargetType FROM ProgressionTreeNodeUnlocks u JOIN ProgressionTreeNodes n
    ON n.ProgressionTreeNodeType = u.ProgressionTreeNodeType WHERE ${cond}`;
const CIVIC_UNLOCKED = UNLOCKED_WHERE(CIVIC_TREE);
const MAIN_UNLOCKED = UNLOCKED_WHERE(`NOT (${CIVIC_TREE})`);
// `member` is in the unit family of `base`: the base itself or base_<anything>.
const FAMILY = (member, base) => `(${member} = ${base} OR ${member} LIKE ${base} || '\\_%' ESCAPE '\\')`;
const CIVIC_UNITS = "SELECT UnitType FROM LShufWork_CivicUnit";

// Every civilization's ability and uniques, from the game's own tables (the same list as lshuf-deal-input.js).
function info() {
  return `${work("LShufWork_CivInfo", "Civ TEXT PRIMARY KEY, Age TEXT, Ability TEXT, AbilityName TEXT, Base TEXT, Tree TEXT, TreeReq TEXT")}
INSERT INTO LShufWork_CivInfo (Civ, Age, Ability)
  SELECT ct.CivilizationType, COALESCE((SELECT MIN(lc.Age) FROM LegacyCivilizations lc WHERE lc.CivilizationType = ct.CivilizationType), ''),
    MIN(ct.TraitType)
  FROM CivilizationTraits ct
  WHERE ct.TraitType LIKE 'TRAIT\\_%\\_ABILITY' ESCAPE '\\' AND ct.CivilizationType IN (SELECT CivilizationType FROM Civilizations)
  GROUP BY ct.CivilizationType;
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
INSERT OR IGNORE INTO LShufWork_CivicUnit (UnitType)
  SELECT f.UnitType FROM Units b JOIN LShufWork_CivInfo i ON i.Base = b.TraitType
  JOIN Units f ON f.TraitType = b.TraitType AND ${FAMILY("f.UnitType", "b.UnitType")}
  WHERE NOT EXISTS (SELECT 1 FROM Units p WHERE p.TraitType = b.TraitType AND b.UnitType LIKE p.UnitType || '\\_%' ESCAPE '\\')
    AND EXISTS (SELECT 1 FROM Units m WHERE m.TraitType = b.TraitType AND ${FAMILY("m.UnitType", "b.UnitType")}
      AND m.UnitType IN (${CIVIC_UNLOCKED}))
    AND NOT EXISTS (SELECT 1 FROM Units m WHERE m.TraitType = b.TraitType AND ${FAMILY("m.UnitType", "b.UnitType")}
      AND m.UnitType IN (${MAIN_UNLOCKED}));
-- Unit families and improvements only: buildings and quarters move with the civics tree (CONTRACTS 18).
${work("LShufWork_CivUnique", "Type TEXT PRIMARY KEY, Kind TEXT, Civ TEXT")}
INSERT OR IGNORE INTO LShufWork_CivUnique (Type, Kind, Civ)
  SELECT u.UnitType, 'unit', i.Civ FROM Units u JOIN LShufWork_CivInfo i ON i.Base = u.TraitType
  WHERE NOT EXISTS (SELECT 1 FROM Units p WHERE p.TraitType = u.TraitType AND u.UnitType LIKE p.UnitType || '\\_%' ESCAPE '\\')
    AND u.UnitType NOT IN (${CIVIC_UNITS});
INSERT OR IGNORE INTO LShufWork_CivUnique (Type, Kind, Civ)
  SELECT m.ConstructibleType, 'improvement', i.Civ FROM Improvements m JOIN LShufWork_CivInfo i ON i.Base = m.TraitType
  WHERE m.ConstructibleType NOT IN (SELECT u.TargetType FROM ProgressionTreeNodeUnlocks u
    JOIN ProgressionTreeNodes n ON n.ProgressionTreeNodeType = u.ProgressionTreeNodeType
    WHERE n.ProgressionTree LIKE 'TREE\\_CIVICS\\_%' ESCAPE '\\' AND n.ProgressionTree NOT LIKE '%\\_MAIN' ESCAPE '\\');
`;
}

// Slot n: the ability swap, the civics swap, then the unique takes.
function slot(n) {
  const B = BUILDER(n);
  const builtLower = `SELECT b2.Civ FROM LShufWork_Build b2 WHERE b2.Slot < ${n} AND b2.OK = 1 AND b2.Civ IN (SELECT Civ FROM LShufWork_CivInfo)`;
  return `INSERT INTO LShufWork_CivCSwap (Slot, Builder, Source)
  SELECT ${n}, ${B}, (SELECT MIN(p.Arg) FROM LShufWork_BuildPiece p JOIN LShufWork_CivInfo s ON s.Civ = p.Arg
    WHERE p.Slot = ${n} AND p.Kind = 'civcivics' AND s.Civ <> ${B} AND s.Age = ${AGE_OF(B)} AND s.Tree IS NOT NULL
      AND s.Civ NOT IN (${builtLower}) AND NOT ${TAKEN(CIVC("s.Civ"))})
  WHERE ${B} IS NOT NULL AND ${TREE_OF(B)} IS NOT NULL AND NOT ${TAKEN(CIVC(B))};
DELETE FROM LShufWork_CivCSwap WHERE Slot = ${n} AND (Builder IS NULL OR Source IS NULL);
INSERT OR IGNORE INTO LShufWork_CivTaken (PieceId) SELECT ${CIVC("Builder")} FROM LShufWork_CivCSwap WHERE Slot = ${n};
INSERT OR IGNORE INTO LShufWork_CivTaken (PieceId) SELECT ${CIVC("Source")} FROM LShufWork_CivCSwap WHERE Slot = ${n};
INSERT INTO LShufWork_CivSwap (Slot, Builder, Source)
  SELECT ${n}, ${B}, (SELECT MIN(p.Arg) FROM LShufWork_BuildPiece p JOIN LShufWork_CivInfo s ON s.Civ = p.Arg
    WHERE p.Slot = ${n} AND p.Kind = 'civability' AND s.Civ <> ${B} AND s.Age = ${AGE_OF(B)}
      AND s.Civ NOT IN (${builtLower}) AND NOT ${TAKEN(ABIL("s.Civ"))} AND NOT ${PIECED("s.Civ")})
  WHERE ${B} IS NOT NULL AND NOT ${TAKEN(ABIL(B))} AND NOT ${PIECED(B)};
DELETE FROM LShufWork_CivSwap WHERE Slot = ${n} AND (Builder IS NULL OR Source IS NULL);
INSERT OR IGNORE INTO LShufWork_CivTaken (PieceId) SELECT ${ABIL("Builder")} FROM LShufWork_CivSwap WHERE Slot = ${n};
INSERT OR IGNORE INTO LShufWork_CivTaken (PieceId) SELECT ${ABIL("Source")} FROM LShufWork_CivSwap WHERE Slot = ${n};
INSERT INTO LShufWork_CivTake (Slot, Builder, Type, Source)
  SELECT ${n}, ${B}, u.Type, u.Civ FROM LShufWork_BuildPiece p JOIN LShufWork_CivUnique u ON u.Type = p.Arg
  WHERE p.Slot = ${n} AND p.Kind = 'civunique' AND ${B} IS NOT NULL AND u.Civ <> ${B}
    AND ${AGE_OF("u.Civ")} = ${AGE_OF(B)} AND NOT ${TAKEN(UNQ("u.Type"))};
INSERT OR IGNORE INTO LShufWork_CivTaken (PieceId) SELECT ${UNQ("Type")} FROM LShufWork_CivTake WHERE Slot = ${n};
INSERT INTO LShufWork_CivPTake (Slot, Builder, PieceId, Source, BI)
  SELECT ${n}, ${B}, m.PieceId, m.CivilizationType, m.BulletIndex FROM LShufWork_BuildPiece p
  JOIN LShufCivMapping m ON m.PieceId = p.PieceId JOIN LShufWork_CivInfo s ON s.Civ = m.CivilizationType
  WHERE p.Slot = ${n} AND p.Kind = 'civbullet' AND ${SPLIT} AND ${B} IS NOT NULL AND NOT ${TAKEN(ABIL(B))}
    AND s.Age = ${AGE_OF(B)} AND ${IN_PLAY("m", "s")} AND NOT ${TAKEN(ABIL("s.Civ"))} AND NOT ${TAKEN("m.PieceId")};
INSERT OR IGNORE INTO LShufWork_CivTaken (PieceId) SELECT PieceId FROM LShufWork_CivPTake WHERE Slot = ${n};
INSERT OR IGNORE INTO LShufWork_CivPieced (Civ) SELECT Source FROM LShufWork_CivPTake WHERE Slot = ${n};`;
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
  WHERE ${SPLIT} AND ${IN_PLAY("m", "i")} AND NOT ${TAKEN(ABIL("i.Civ"))};
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

// The shuffle (lshuf-deal-civ.js civShuffle): per age over the unbuilt civs. LShufWork_CivShuf holds one row per
// unbuilt civ with its ability-cycle donor (over civs whose ability no builder took, SALT.CivAbilities) and its
// unique-cycle donor (over every unbuilt civ, SALT.CivUniques). Ranks within an age follow CivilizationType order,
// as cyclicDonors ranks the sorted ids.
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
    + "CRank INTEGER, CK INTEGER, CPos INTEGER, CN INTEGER, CDonor TEXT, ForC INTEGER, HasCivics INTEGER")}
INSERT INTO LShufWork_CivShuf (Civ, Age, ForA, ForU, HasCivics, ForC) SELECT i.Civ, i.Age,
    CASE WHEN ${ca} = ${q(CA_MODE.Swapped)} AND NOT ${TAKEN(ABIL("i.Civ"))} THEN 1 ELSE 0 END,
    CASE WHEN ${cu} = ${q(CU_MODE.Shuffled)} THEN 1 ELSE 0 END,
    CASE WHEN i.Tree IS NOT NULL AND NOT ${TAKEN(CIVC("i.Civ"))} THEN 1 ELSE 0 END,
    CASE WHEN ${cc} = ${q(CC_MODE.Shuffled)} AND i.Tree IS NOT NULL AND NOT ${TAKEN(CIVC("i.Civ"))} THEN 1 ELSE 0 END
  FROM LShufWork_CivInfo i WHERE i.Civ NOT IN (${built});
${cycle("A", SALT.CivAbilities, "ForA")}
${cycle("U", SALT.CivUniques, "ForU")}
${cycle("C", SALT.CivCivics, "ForC")}
UPDATE LShufWork_CivShuf SET UDonor = ADonor WHERE ${cu} = ${q(CU_MODE.Paired)};
UPDATE LShufWork_CivShuf SET CDonor = ADonor WHERE ${cc} = ${q(CC_MODE.Paired)}
  AND ADonor IN (SELECT o.Civ FROM LShufWork_CivShuf o WHERE o.HasCivics = 1);
UPDATE LShufWork_CivShuf SET ADonor = NULL WHERE ADonor = Civ;
UPDATE LShufWork_CivShuf SET UDonor = NULL WHERE UDonor = Civ;
UPDATE LShufWork_CivShuf SET CDonor = NULL WHERE CDonor = Civ;
${work("LShufWork_CivShufU", "Civ TEXT, Type TEXT, Donor TEXT, SortIndex INTEGER, PRIMARY KEY (Civ, Type)")}
INSERT OR IGNORE INTO LShufWork_CivShufU (Civ, Type, Donor) SELECT s.Civ, u.Type, s.UDonor FROM LShufWork_CivShuf s
  JOIN LShufWork_CivUnique u ON u.Civ = s.UDonor WHERE s.UDonor IS NOT NULL AND NOT ${TAKEN(UNQ("u.Type"))};
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
      AND NOT EXISTS (SELECT 1 FROM LShufWork_CivPTake t WHERE t.Slot = b.Slot) THEN ${q(BUILD_WHY.NoPieces)}
    ELSE 'ok' END`;
  return `${rankUpdate("LShufWork_CivTake", "SortIndex", ["Slot"], [["Type"]])}
DELETE FROM LShufResultCivPieces;
${ins} SELECT Builder, ${ABIL("Source")}, Source, 'ability', 0 FROM LShufWork_CivSwap;
${ins} SELECT Source, ${ABIL("Builder")}, Builder, 'ability', 0 FROM LShufWork_CivSwap;
${ins} SELECT Builder, ${CIVC("Source")}, Source, 'civics', 0 FROM LShufWork_CivCSwap;
${ins} SELECT Source, ${CIVC("Builder")}, Builder, 'civics', 0 FROM LShufWork_CivCSwap;
${ins} SELECT Builder, ${UNQ("Type")}, Source, 'unique', SortIndex + 1 FROM LShufWork_CivTake;
${ins} SELECT Civ, ${ABIL("ADonor")}, ADonor, 'ability', 0 FROM LShufWork_CivShuf WHERE ADonor IS NOT NULL;
${ins} SELECT Civ, ${CIVC("CDonor")}, CDonor, 'civics', 0 FROM LShufWork_CivShuf WHERE CDonor IS NOT NULL;
${ins} SELECT Civ, ${UNQ("Type")}, Donor, 'unique', SortIndex + 1 FROM LShufWork_CivShufU;
${ins} SELECT Civ, PieceId, FromCiv, CASE WHEN IsRest = 1 THEN 'remainder' ELSE 'bullet' END, SortIndex FROM LShufWork_CivHeld;
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
    work("LShufWork_CivPieced", "Civ TEXT PRIMARY KEY"),
    SLOTS.map(slot).join("\n"),
    shuffle(),
    split(),
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
  WHERE Kind IN ('unique', 'civics') AND CivilizationType IN (SELECT CivilizationType FROM Civilizations);
INSERT OR IGNORE INTO Traits (TraitType, InternalOnly) SELECT DISTINCT ${trait("CivilizationType")}, 1 FROM LShufResultCivPieces
  WHERE Kind IN ('unique', 'civics') AND ${trait("CivilizationType")} IN (SELECT Type FROM Types);
INSERT OR IGNORE INTO CivilizationTraits (CivilizationType, TraitType) SELECT DISTINCT CivilizationType, ${trait("CivilizationType")}
  FROM LShufResultCivPieces WHERE Kind IN ('unique', 'civics') AND CivilizationType IN (SELECT CivilizationType FROM Civilizations)
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
-- An ability's own modifiers that ask for the civ's base trait (MOD_CIV_WONDER_PRODUCTION_<CIV>) ask for the ability
-- trait instead, so they follow the ability wherever it goes (CONTRACTS 14).
UPDATE RequirementArguments SET Value = Value || '_ABILITY'
  WHERE Name = 'TraitType' AND Value IN (SELECT Base FROM LShufWork_CivInfo) AND Value || '_ABILITY' IN (SELECT TraitType FROM Traits)
    AND RequirementId IN (SELECT rsr.RequirementId FROM RequirementSetRequirements rsr JOIN Modifiers m
      ON m.SubjectRequirementSetId = rsr.RequirementSetId OR m.OwnerRequirementSetId = rsr.RequirementSetId
      JOIN TraitModifiers tm ON tm.ModifierId = m.ModifierId WHERE tm.TraitType = RequirementArguments.Value || '_ABILITY');
${splitApply()}`;
}

// Civilization abilities = Split (CONTRACTS 19): a civ with bonus rows gets TRAIT_LSHUF_CIVA_<C> in place of its
// ability trait, with copies (LSHUF_<C>__<ModifierId>, requirement sets shared) of the modifiers behind each piece
// it holds; the remainder copies the civ's own modifiers the mapping's movable pieces don't list. The copies walk
// the leader copy path's steps (sql-apply.mjs copyModifiers). A requirement that asked for the civ's ability trait
// asks for the new trait, so a home-only bonus still fires.
function splitApply() {
  const CIVA = (civ) => `'TRAIT_LSHUF_CIVA_' || ${civ}`;
  const copyCivs = "SELECT DISTINCT CivilizationType FROM LShufResultCivPieces WHERE Kind IN ('bullet', 'remainder')";
  const ability = (civ) => `(SELECT i.Ability FROM LShufWork_CivInfo i WHERE i.Civ = ${civ})`;
  const listed = `SELECT mm.ModifierId FROM LShufCivMappingModifiers mm JOIN LShufCivMapping m ON m.PieceId = mm.PieceId
      WHERE m.CivilizationType = r.CivilizationType AND ${IN_PLAY("m", "i")}`;
  const newId = (col) => `'LSHUF_' || c.Receiver || '__' || ${col}`;
  const tooltip = "(SELECT i.AbilityName FROM LShufWork_CivInfo i WHERE i.Civ = c.Receiver)";
  return `-- Civilization abilities = Split (CONTRACTS 19): the copy path for every civ holding pieces.
${work("LShufWork_CivCopy", "Receiver TEXT, ModifierId TEXT, PRIMARY KEY (Receiver, ModifierId)")}
INSERT OR IGNORE INTO LShufWork_CivCopy (Receiver, ModifierId)
  SELECT r.CivilizationType, mm.ModifierId FROM LShufResultCivPieces r JOIN LShufCivMappingModifiers mm ON mm.PieceId = r.PieceId
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
  SELECT ${newId("a.ModifierId")}, a.Name, a.Extra, a.SecondExtra, a.Type,
    CASE WHEN a.Name = 'Tooltip' AND ${tooltip} IS NOT NULL THEN ${tooltip} ELSE a.Value END
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
