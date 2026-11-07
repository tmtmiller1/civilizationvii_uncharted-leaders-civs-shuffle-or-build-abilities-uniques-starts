// Deal step 2: the split modes' pieces and their deal, one unrolled step per card.
import { SALT } from "../../shared/lshuf-key.js";
import { BALANCE_SCALE, PIECE_STEP_CAP, WHOLE_DEFAULT_VALUE } from "../../shared/deal/lshuf-deal-util.js";
import { BUILD_SLOT, CFG, header, key, rankUpdate, SLOTS, work } from "./sql-util.mjs";

const S = "LShufWork_Shape";
const bulletRows = (leader) => `FROM LShufMapping m WHERE m.LeaderType = ${leader} AND m.Kind = 'bullet'`;

function shape() {
  const rs = `(SELECT r.ModifierSet FROM LShufReviewedSets r WHERE r.AbilityTrait = ${S}.Ability)`;
  const changed = `NOT EXISTS (SELECT 1 FROM LShufReviewedSets r WHERE r.AbilityTrait = ${S}.Ability)
    OR length(${rs}) - length(replace(${rs}, '|', '')) - 1 <> NMods
    OR EXISTS (SELECT 1 FROM TraitModifiers tm WHERE tm.TraitType = ${S}.Ability AND instr(${rs}, '|' || tm.ModifierId || '|') = 0)`;
  const listed = `SELECT mm.ModifierId FROM LShufMappingModifiers mm JOIN LShufMapping m ON m.PieceId = mm.PieceId
      WHERE m.LeaderType = ${S}.LeaderType AND ((m.Kind = 'bullet' AND COALESCE(m.Movable, 1) = 1) OR m.Kind = 'agenda')`;
  return `${work(S, "LeaderType TEXT PRIMARY KEY, Ability TEXT, Modded INTEGER, NMods INTEGER, Whole INTEGER, Changed INTEGER, HasRest INTEGER, WholeValue INTEGER")}
INSERT INTO ${S} (LeaderType, Ability, Modded, NMods) SELECT p.LeaderType, l.Ability, l.Modded, l.NMods
  FROM LShufWork_Pool p JOIN LShufWork_L l ON l.LeaderType = p.LeaderType WHERE p.Axis = 'A' AND ${CFG("IsSplit")} = 1;
UPDATE ${S} SET Changed = (Modded = 1 AND (${changed}));
UPDATE ${S} SET Whole = (Changed = 1
  OR NOT EXISTS (SELECT 1 FROM LShufMapping m WHERE m.LeaderType = ${S}.LeaderType)
  OR EXISTS (SELECT 1 FROM LShufMapping m WHERE m.LeaderType = ${S}.LeaderType
    AND (COALESCE(m.Reviewed, 0) <> 1 OR m.AbilityTrait IS NOT ${S}.Ability)));
UPDATE ${S} SET WholeValue = CASE WHEN EXISTS (SELECT 1 ${bulletRows(`${S}.LeaderType`)})
  THEN (SELECT SUM(COALESCE(m.Value, 1)) ${bulletRows(`${S}.LeaderType`)}) ELSE ${WHOLE_DEFAULT_VALUE} END;
UPDATE ${S} SET HasRest = CASE WHEN Whole = 1 THEN 0 ELSE (
  EXISTS (SELECT 1 ${bulletRows(`${S}.LeaderType`)} AND COALESCE(m.Movable, 1) <> 1)
  OR EXISTS (SELECT 1 FROM TraitModifiers tm WHERE tm.TraitType = ${S}.Ability AND tm.ModifierId NOT IN (${listed}))) END;
`;
}

function pieces() {
  return `${work("LShufWork_Pc", "PieceId TEXT PRIMARY KEY, FromLeader TEXT, Kind TEXT, BI INTEGER, Value INTEGER, DV INTEGER, Rank INTEGER, K INTEGER, DeckOrd INTEGER")}
INSERT INTO LShufWork_Pc (PieceId, FromLeader, Kind, BI, Value)
  SELECT LeaderType || '__WHOLE', LeaderType, 'whole', 0, WholeValue FROM ${S} WHERE Whole = 1;
INSERT INTO LShufWork_Pc (PieceId, FromLeader, Kind, BI, Value)
  SELECT m.PieceId, m.LeaderType, 'bullet', COALESCE(m.BulletIndex, 0), COALESCE(m.Value, 1)
  FROM LShufMapping m JOIN ${S} s ON s.LeaderType = m.LeaderType AND s.Whole = 0
  WHERE m.Kind = 'bullet' AND COALESCE(m.Movable, 1) = 1;
${buildTake()}
UPDATE LShufWork_Pc SET DV = CASE WHEN ${CFG("Balanced")} = 1 THEN Value ELSE 0 END;
${rankUpdate("LShufWork_Pc", "Rank", [], [["PieceId"]])}
UPDATE LShufWork_Pc SET K = ${key(SALT.Pieces, "Rank")};
${rankUpdate("LShufWork_Pc", "DeckOrd", [], [["DV", true], ["K"], ["PieceId"]])}
${work("LShufWork_Slot", "LeaderType TEXT PRIMARY KEY, N INTEGER, K INTEGER")}
INSERT INTO LShufWork_Slot (LeaderType, N, K) SELECT p.LeaderType,
  CASE WHEN s.Whole = 1 THEN 1 ELSE (SELECT COUNT(*) ${bulletRows("p.LeaderType")} AND COALESCE(m.Movable, 1) = 1) END, p.K
  FROM LShufWork_Pool p JOIN ${S} s ON s.LeaderType = p.LeaderType WHERE p.Axis = 'A' AND ${CFG("IsSplit")} = 1
    AND p.LeaderType NOT IN (SELECT Builder FROM LShufWork_BuildTake);
${work("LShufWork_Dealt", "PieceId TEXT PRIMARY KEY, LeaderType TEXT, FromLeader TEXT, Value INTEGER")}
CREATE INDEX IF NOT EXISTS LShufWork_Dealt_Leader ON LShufWork_Dealt (LeaderType);
INSERT INTO LShufWork_Dealt (PieceId, LeaderType, FromLeader, Value) SELECT PieceId, Builder, FromLeader, Value
  FROM LShufWork_BuildTake;
`;
}

// The builders' ability picks in the split modes (lshuf-deal-ability.js takeBuild), slot by slot: a whole card takes
// every piece of that leader still in the deck out as one whole piece; a bullet card takes that piece when it's
// still in the deck. The taken pieces are dealt to their builder before the steps run; a builder that took anything
// keeps no slot and no remainder.
function buildTake() {
  const picks = (k, n) => `SELECT p.Arg FROM LShufWork_BuildPiece p WHERE p.Kind = '${k}' AND p.Slot = ${n}`;
  const inA = (n) => `${BUILD_SLOT("Leader", n)} IN (SELECT LeaderType FROM LShufWork_Pool WHERE Axis = 'A')`;
  const left = "EXISTS (SELECT 1 FROM LShufWork_Pc c WHERE c.FromLeader = s.LeaderType AND c.PieceId NOT IN (SELECT PieceId FROM LShufWork_BuildTake))";
  const steps = SLOTS.map((n) => `INSERT OR IGNORE INTO LShufWork_BuildTake (PieceId, Builder, FromLeader, Kind, Value)
  SELECT s.LeaderType || '__WHOLE', ${BUILD_SLOT("Leader", n)}, s.LeaderType, 'whole', s.WholeValue
  FROM ${S} s WHERE ${inA(n)} AND s.LeaderType IN (${picks("whole", n)}) AND ${left};
DELETE FROM LShufWork_Pc WHERE FromLeader IN (SELECT FromLeader FROM LShufWork_BuildTake WHERE Kind = 'whole')
  AND PieceId NOT IN (SELECT PieceId FROM LShufWork_BuildTake);
INSERT OR IGNORE INTO LShufWork_Pc (PieceId, FromLeader, Kind, BI, Value) SELECT PieceId, FromLeader, 'whole', 0, Value
  FROM LShufWork_BuildTake WHERE Kind = 'whole' AND Builder = ${BUILD_SLOT("Leader", n)};
INSERT OR IGNORE INTO LShufWork_BuildTake (PieceId, Builder, FromLeader, Kind, Value)
  SELECT c.PieceId, ${BUILD_SLOT("Leader", n)}, c.FromLeader, 'bullet', c.Value
  FROM LShufWork_Pc c WHERE ${inA(n)} AND c.Kind = 'bullet' AND c.PieceId IN (${picks("bullet", n)});`).join("\n");
  return `${work("LShufWork_BuildTake", "PieceId TEXT PRIMARY KEY, Builder TEXT, FromLeader TEXT, Kind TEXT, Value INTEGER")}
${steps}
UPDATE ${S} SET HasRest = 0 WHERE LeaderType IN (SELECT FromLeader FROM LShufWork_BuildTake WHERE Kind = 'whole')
  OR LeaderType IN (SELECT Builder FROM LShufWork_BuildTake);
`;
}

// The next card in deck order goes to the leader with room left: someone else's first, then (Balanced) the lowest
// value per slot so far, then the leader key.
function stepView() {
  const got = "(SELECT COUNT(*) FROM LShufWork_Dealt d WHERE d.LeaderType = s.LeaderType)";
  const value = "COALESCE((SELECT SUM(d.Value) FROM LShufWork_Dealt d WHERE d.LeaderType = s.LeaderType), 0)";
  return `DROP VIEW IF EXISTS LShufWork_NextPiece;
CREATE VIEW LShufWork_NextPiece AS SELECT c.PieceId AS PieceId, c.FromLeader AS FromLeader, c.Value AS Value,
  s.LeaderType AS LeaderType
  FROM (SELECT p.PieceId, p.FromLeader, p.Value FROM LShufWork_Pc p
    WHERE NOT EXISTS (SELECT 1 FROM LShufWork_Dealt d WHERE d.PieceId = p.PieceId) ORDER BY p.DeckOrd LIMIT 1) c
  LEFT JOIN LShufWork_Slot s ON ${got} < s.N
  ORDER BY CASE WHEN s.LeaderType = c.FromLeader THEN 1 ELSE 0 END,
    CASE WHEN ${CFG("Balanced")} = 1 THEN (${value} * ${BALANCE_SCALE}) / s.N ELSE 0 END, s.K, s.LeaderType
  LIMIT 1;
`;
}

function steps() {
  const one = "INSERT INTO LShufWork_Dealt (PieceId, LeaderType, FromLeader, Value) SELECT PieceId, LeaderType, FromLeader, Value FROM LShufWork_NextPiece;";
  return Array.from({ length: PIECE_STEP_CAP }, () => one).join("\n");
}

function held() {
  return `${work("LShufWork_Held", "LeaderType TEXT, PieceId TEXT, FromLeader TEXT, Kind TEXT, BI INTEGER, IsRest INTEGER, SortIndex INTEGER, PRIMARY KEY (LeaderType, PieceId)")}
INSERT INTO LShufWork_Held (LeaderType, PieceId, FromLeader, Kind, BI, IsRest)
  SELECT d.LeaderType, d.PieceId, d.FromLeader, p.Kind, p.BI, 0
  FROM LShufWork_Dealt d JOIN LShufWork_Pc p ON p.PieceId = d.PieceId WHERE d.LeaderType IS NOT NULL;
INSERT INTO LShufWork_Held (LeaderType, PieceId, FromLeader, Kind, BI, IsRest)
  SELECT LeaderType, LeaderType || '__REST', LeaderType, 'remainder', 0, 1 FROM ${S} WHERE Whole = 0 AND HasRest = 1;
${rankUpdate("LShufWork_Held", "SortIndex", ["LeaderType"], [["IsRest"], ["FromLeader"], ["BI"], ["PieceId"]])}
${work("LShufWork_Flow", "Receiver TEXT, Giver TEXT, C INTEGER, V INTEGER, PRIMARY KEY (Receiver, Giver)")}
INSERT INTO LShufWork_Flow (Receiver, Giver, C, V) SELECT LeaderType, FromLeader, COUNT(*), SUM(Value)
  FROM LShufWork_Dealt WHERE LeaderType IS NOT NULL GROUP BY LeaderType, FromLeader;
`;
}

export function abilitySql() {
  return [header("Deal step 2: split pieces and their deal"), shape(), pieces(), stepView(), steps(), held()].join("\n");
}
