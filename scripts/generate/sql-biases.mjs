// Deal step 4: start biases. The shape of the shipped rows, rolled rows, rows from bias tags, the civ shuffle, and
// LShufResultBiases.
import {
  BIAS_TABLES, BIAS_TAG_PREFIXES, BIAS_TAG_WORDS, BIAS_TARGET_COLUMN, GENERIC_BIASES, biasTableOfTag
} from "../../shared/lshuf-constants.js";
import { SALT } from "../../shared/lshuf-key.js";
import {
  CIV_ROLL_RANK_BASE,
  ISLAND_TABLE,
  MAX_TAG_BIASES,
  ROLL_RANK_STRIDE,
  SCORE_STEP,
  TAG_SEGMENT_CAP
} from "../../shared/deal/lshuf-deal-util.js";
import { BUILDS_IN, CFG, header, key, q, rankUpdate, work } from "./sql-util.mjs";

const dealtB = "(SELECT Dealt FROM LShufWork_Axis WHERE Axis = 'B')";
// A builder's start terrain card applies (lshuf-deal-biases.js dealLeaders), and its civilization card applies
// (civBuild: the builder's civ is picked by hand and the card's civ has rows). Builders in the bias pool only.
// No LeaderType column inside these subqueries: `col` is often the outer row's bare LeaderType.
// A builder's generic start terrain card (GENERIC_BIASES): one row of the tag's table, the usual score, moved.
function genericRows(ins) {
  return GENERIC_BIASES.map(([tag, score]) => {
    const table = biasTableOfTag(tag);
    const target = BIAS_TARGET_COLUMN[table] ? `'${tag}'` : "NULL";
    return `${ins} SELECT '${table}', b.Leader, NULL, ${target}, ${score}, 'moved' FROM ${BUILDS_IN("B")}
  WHERE b.OK = 1 AND b.GenericBiasPick = '${tag}';`;
  }).join("\n");
}

const topGiverB = (of) => `(SELECT f.Giver FROM LShufWork_Flow f WHERE f.Receiver = ${of} ORDER BY f.C DESC, f.V DESC, f.Giver LIMIT 1)`;
const fromAbility = (of) => `COALESCE(${topGiverB(of)}, ${of})`;
const IN_B = "bb.Leader IN (SELECT pb.LeaderType FROM LShufWork_Pool pb WHERE pb.Axis = 'B')";
const notBiasBuilder = (col) =>
  `NOT EXISTS (SELECT 1 FROM LShufWork_Build bb WHERE bb.OK = 1 AND (bb.BiasPick IS NOT NULL OR bb.GenericBiasPick IS NOT NULL)
    AND ${IN_B} AND bb.Leader = ${col})`;
const CIV_ROWS = (civ) => `EXISTS (SELECT 1 FROM LShufWork_BRow rr WHERE rr.LeaderType IS NULL AND rr.CivilizationType = ${civ})`;
const notCivBuild = (col) => `NOT EXISTS (SELECT 1 FROM LShufWork_Build bb WHERE bb.OK = 1 AND bb.Civ = ${col}
  AND bb.CivBiasPick IS NOT NULL AND ${IN_B} AND ${CIV_ROWS("bb.CivBiasPick")})`;

function snapshot() {
  const parts = BIAS_TABLES.map((t) => {
    const col = BIAS_TARGET_COLUMN[t];
    return `SELECT ${q(t)}, LeaderType, CivilizationType, ${col || "NULL"}, Score FROM ${t}
  WHERE LeaderType IS NOT NULL OR CivilizationType IS NOT NULL`;
  });
  const stat = BIAS_TABLES.map((t, i) => `SELECT ${q(t)}, ${i}, ${BIAS_TARGET_COLUMN[t] ? 1 : 0}`).join(" UNION ALL ");
  const sc = (cond) => `FROM LShufWork_BRow r WHERE r.TableName = LShufWork_BStat.TableName${cond}`;
  const leaderRow = " AND r.LeaderType IS NOT NULL";
  const civRow = " AND r.LeaderType IS NULL AND r.CivilizationType IS NOT NULL";
  return `${work("LShufWork_BRow", "TableName TEXT, LeaderType TEXT, CivilizationType TEXT, TargetType TEXT, Score INTEGER")}
INSERT INTO LShufWork_BRow (TableName, LeaderType, CivilizationType, TargetType, Score)
${parts.join("\nUNION ALL ")};
${work("LShufWork_BStat", "TableName TEXT PRIMARY KEY, Ord INTEGER, HasTarget INTEGER, W INTEGER, Start INTEGER, NT INTEGER, LW INTEGER, LStart INTEGER, LNT INTEGER, LLo INTEGER, LHi INTEGER, CLo INTEGER, CHi INTEGER")}
INSERT INTO LShufWork_BStat (TableName, Ord, HasTarget) ${stat};
UPDATE LShufWork_BStat SET W = (SELECT COUNT(*) ${sc("")}),
  NT = CASE WHEN HasTarget = 1 THEN (SELECT COUNT(DISTINCT r.TargetType) ${sc(" AND r.TargetType IS NOT NULL")}) ELSE 0 END,
  LLo = COALESCE((SELECT MIN(r.Score) ${sc(leaderRow)}), (SELECT MIN(r.Score) ${sc("")})),
  LHi = COALESCE((SELECT MAX(r.Score) ${sc(leaderRow)}), (SELECT MAX(r.Score) ${sc("")})),
  CLo = COALESCE((SELECT MIN(r.Score) ${sc(civRow)}), (SELECT MIN(r.Score) ${sc("")})),
  CHi = COALESCE((SELECT MAX(r.Score) ${sc(civRow)}), (SELECT MAX(r.Score) ${sc("")}));
UPDATE LShufWork_BStat SET Start = COALESCE((SELECT SUM(o.W) FROM LShufWork_BStat o WHERE o.Ord < LShufWork_BStat.Ord), 0);
-- Leaders roll from the leader rows alone, the same in every age (lshuf-deal-bias-stats.js biasStats).
UPDATE LShufWork_BStat SET LW = (SELECT COUNT(*) ${sc(leaderRow)}),
  LNT = CASE WHEN HasTarget = 1 THEN (SELECT COUNT(DISTINCT r.TargetType) ${sc(`${leaderRow} AND r.TargetType IS NOT NULL`)}) ELSE 0 END;
UPDATE LShufWork_BStat SET LStart = COALESCE((SELECT SUM(o.LW) FROM LShufWork_BStat o WHERE o.Ord < LShufWork_BStat.Ord), 0);
${work("LShufWork_BTarget", "TableName TEXT, TargetType TEXT, Rank INTEGER, PRIMARY KEY (TableName, TargetType)")}
INSERT INTO LShufWork_BTarget (TableName, TargetType) SELECT DISTINCT r.TableName, r.TargetType FROM LShufWork_BRow r
  JOIN LShufWork_BStat b ON b.TableName = r.TableName AND b.HasTarget = 1 WHERE r.TargetType IS NOT NULL;
${rankUpdate("LShufWork_BTarget", "Rank", ["TableName"], [["TargetType"]])}
${work("LShufWork_BLTarget", "TableName TEXT, TargetType TEXT, Rank INTEGER, PRIMARY KEY (TableName, TargetType)")}
INSERT INTO LShufWork_BLTarget (TableName, TargetType) SELECT DISTINCT r.TableName, r.TargetType FROM LShufWork_BRow r
  JOIN LShufWork_BStat b ON b.TableName = r.TableName AND b.HasTarget = 1 WHERE r.TargetType IS NOT NULL AND r.LeaderType IS NOT NULL;
${rankUpdate("LShufWork_BLTarget", "Rank", ["TableName"], [["TargetType"]])}
${work("LShufWork_BShape", "Total INTEGER, LTotal INTEGER, LWith INTEGER, L2 INTEGER, CWith INTEGER, C2 INTEGER, CivCount INTEGER")}
INSERT INTO LShufWork_BShape SELECT (SELECT COUNT(*) FROM LShufWork_BRow),
  (SELECT COUNT(*) FROM LShufWork_BRow WHERE LeaderType IS NOT NULL),
  (SELECT COUNT(DISTINCT LeaderType) FROM LShufWork_BRow WHERE LeaderType IS NOT NULL),
  (SELECT COUNT(*) FROM (SELECT LeaderType FROM LShufWork_BRow WHERE LeaderType IS NOT NULL GROUP BY LeaderType HAVING COUNT(*) >= 2)),
  (SELECT COUNT(DISTINCT CivilizationType) FROM LShufWork_BRow WHERE LeaderType IS NULL AND CivilizationType IS NOT NULL),
  (SELECT COUNT(*) FROM (SELECT CivilizationType FROM LShufWork_BRow WHERE LeaderType IS NULL AND CivilizationType IS NOT NULL
    GROUP BY CivilizationType HAVING COUNT(*) >= 2)),
  (SELECT COUNT(*) FROM LShufWork_Civ);
`;
}

function civs() {
  return `${work("LShufWork_Civ", "CivilizationType TEXT PRIMARY KEY, Age TEXT, Rank INTEGER, GRank INTEGER, GK INTEGER, GPos INTEGER, GN INTEGER, Donor TEXT")}
INSERT INTO LShufWork_Civ (CivilizationType, Age) SELECT CivilizationType, COALESCE(MIN(Age), '') FROM LegacyCivilizations
  GROUP BY CivilizationType;
${rankUpdate("LShufWork_Civ", "Rank", [], [["CivilizationType"]])}
${rankUpdate("LShufWork_Civ", "GRank", ["Age"], [["CivilizationType"]])}
UPDATE LShufWork_Civ SET GK = ${key(SALT.CivBiases, "GRank")},
  GN = (SELECT COUNT(*) FROM LShufWork_Civ o WHERE o.Age = LShufWork_Civ.Age);
${rankUpdate("LShufWork_Civ", "GPos", ["Age"], [["GK"], ["CivilizationType"]])}
UPDATE LShufWork_Civ SET Donor = CASE WHEN GN >= 2 THEN (SELECT o.CivilizationType FROM LShufWork_Civ o
  WHERE o.Age = LShufWork_Civ.Age AND o.GPos = (LShufWork_Civ.GPos + 1) % LShufWork_Civ.GN) ELSE CivilizationType END;
`;
}

const shape = (col) => `(SELECT ${col} FROM LShufWork_BShape)`;

function rolls() {
  const leaderCnt = `CASE WHEN ${shape("LWith")} = 0 THEN 1
    WHEN ${key(SALT.Biases, "Base")} % ${shape("LWith")} < ${shape("L2")} THEN 2 ELSE 1 END`;
  const civCnt = `CASE WHEN ${shape("CivCount")} = 0 OR ${shape("CWith")} = 0 THEN 0
    WHEN ${key(SALT.CivBiases, "Base")} % ${shape("CivCount")} >= ${shape("CWith")} THEN 0
    WHEN ${key(SALT.Biases, "Base")} % ${shape("CWith")} < ${shape("C2")} THEN 2 ELSE 1 END`;
  const pick = `${key(SALT.BiasKind, "R")} % CASE WHEN IsCiv = 1 THEN ${shape("Total")} ELSE ${shape("LTotal")} END`;
  const st = (col) => `(SELECT b.${col} FROM LShufWork_BStat b WHERE b.TableName = LShufWork_Roll.TableName)`;
  const lo = `CASE WHEN IsCiv = 1 THEN ${st("CLo")} ELSE ${st("LLo")} END`;
  const hi = `CASE WHEN IsCiv = 1 THEN ${st("CHi")} ELSE ${st("LHi")} END`;
  const roll = `${CFG("RollBiases")} = 1 AND ${dealtB} = 1`;
  return `${work("LShufWork_RSub", "Subj TEXT, IsCiv INTEGER, Base INTEGER, Cnt INTEGER, PRIMARY KEY (Subj, IsCiv)")}
INSERT INTO LShufWork_RSub (Subj, IsCiv, Base) SELECT LeaderType, 0, Rank * ${ROLL_RANK_STRIDE} FROM LShufWork_Pool
  WHERE Axis = 'B' AND ${roll} AND ${shape("LTotal")} > 0 AND ${notBiasBuilder("LeaderType")};
INSERT INTO LShufWork_RSub (Subj, IsCiv, Base) SELECT CivilizationType, 1, ${CIV_ROLL_RANK_BASE} + Rank * ${ROLL_RANK_STRIDE}
  FROM LShufWork_Civ WHERE ${roll} AND ${shape("Total")} > 0;
UPDATE LShufWork_RSub SET Cnt = CASE WHEN IsCiv = 1 THEN ${civCnt} ELSE ${leaderCnt} END;
${work("LShufWork_Roll", "Subj TEXT, IsCiv INTEGER, J INTEGER, R INTEGER, TableName TEXT, TargetType TEXT, Score INTEGER")}
INSERT INTO LShufWork_Roll (Subj, IsCiv, J, R) SELECT Subj, IsCiv, 0, Base FROM LShufWork_RSub WHERE Cnt >= 1;
INSERT INTO LShufWork_Roll (Subj, IsCiv, J, R) SELECT Subj, IsCiv, 1, Base + 1 FROM LShufWork_RSub WHERE Cnt >= 2;
UPDATE LShufWork_Roll SET TableName = (SELECT b.TableName FROM LShufWork_BStat b WHERE IsCiv = 1
  AND b.W > 0 AND ${pick} >= b.Start AND ${pick} < b.Start + b.W) WHERE IsCiv = 1;
UPDATE LShufWork_Roll SET TableName = (SELECT b.TableName FROM LShufWork_BStat b WHERE IsCiv = 0
  AND b.LW > 0 AND ${pick} >= b.LStart AND ${pick} < b.LStart + b.LW) WHERE IsCiv = 0;
UPDATE LShufWork_Roll SET TargetType = CASE WHEN ${st("NT")} > 0 THEN (SELECT t.TargetType FROM LShufWork_BTarget t
  WHERE t.TableName = LShufWork_Roll.TableName AND t.Rank = ${key(SALT.BiasTarget, "LShufWork_Roll.R")} % ${st("NT")}) ELSE NULL END
  WHERE IsCiv = 1;
UPDATE LShufWork_Roll SET TargetType = CASE WHEN ${st("LNT")} > 0 THEN (SELECT t.TargetType FROM LShufWork_BLTarget t
  WHERE t.TableName = LShufWork_Roll.TableName AND t.Rank = ${key(SALT.BiasTarget, "LShufWork_Roll.R")} % ${st("LNT")}) ELSE NULL END
  WHERE IsCiv = 0;
UPDATE LShufWork_Roll SET Score = CASE WHEN TableName = ${q(ISLAND_TABLE)} THEN ${hi}
  ELSE ${lo} + ${SCORE_STEP} * (${key(SALT.BiasScore, "R")} % (((${hi}) - (${lo})) / ${SCORE_STEP} + 1)) END;
DELETE FROM LShufWork_Roll WHERE J = 1 AND EXISTS (SELECT 1 FROM LShufWork_Roll f WHERE f.Subj = LShufWork_Roll.Subj
  AND f.IsCiv = LShufWork_Roll.IsCiv AND f.J = 0 AND f.TableName = LShufWork_Roll.TableName
  AND f.TargetType IS LShufWork_Roll.TargetType);
`;
}

function tagTable(tagExpr) {
  const words = Object.entries(BIAS_TAG_WORDS).map(([w, t]) => `WHEN ${tagExpr} = ${q(w)} THEN ${q(t)}`);
  const prefixes = BIAS_TAG_PREFIXES.map(
    ([p, t]) => `WHEN substr(${tagExpr}, 1, ${p.length}) = ${q(p)} THEN ${q(t)}`
  );
  return `CASE ${[...words, ...prefixes].join(" ")} ELSE NULL END`;
}

// Bullet rows behind the pieces each leader in the bias pool holds (its own rows when its ability wasn't split).
function tagSources() {
  const own = `SELECT p.LeaderType, m.BiasTags AS BiasTags, COALESCE(m.Value, 1) AS Value FROM LShufWork_Pool p
    JOIN LShufMapping m ON m.LeaderType = p.LeaderType AND m.Kind = 'bullet'
    WHERE p.Axis = 'B' AND NOT EXISTS (SELECT 1 FROM LShufWork_Shape s WHERE s.LeaderType = p.LeaderType)
      AND ${notBiasBuilder("p.LeaderType")}`;
  const held = `SELECT h.LeaderType, m.BiasTags AS BiasTags, COALESCE(m.Value, 1) AS Value FROM LShufWork_Pool p
    JOIN LShufWork_Held h ON h.LeaderType = p.LeaderType
    JOIN LShufMapping m ON m.LeaderType = h.FromLeader AND m.Kind = 'bullet'
    WHERE p.Axis = 'B' AND (h.Kind = 'whole' OR (h.Kind = 'remainder' AND COALESCE(m.Movable, 1) <> 1)
      OR (h.Kind = 'bullet' AND m.PieceId = h.PieceId)) AND ${notBiasBuilder("p.LeaderType")}`;
  // A pool leader with no held pieces but a Shape row (dealt in pieces, got none) has no rows, as in the JS.
  return `${work("LShufWork_TSeg", "LeaderType TEXT, Rest TEXT, Value INTEGER")}
INSERT INTO LShufWork_TSeg (LeaderType, Rest, Value) SELECT LeaderType, '|' || BiasTags || '|', Value FROM (
  ${own}
  UNION ALL
  ${held}) WHERE BiasTags IS NOT NULL AND ${CFG("IsMatched")} = 1 AND ${dealtB} = 1;
${work("LShufWork_TTag", "LeaderType TEXT, Tag TEXT, Value INTEGER")}
`;
}

function tagSplit() {
  const next = "instr(substr(Rest, 2), '|')";
  const one = `INSERT INTO LShufWork_TTag (LeaderType, Tag, Value) SELECT LeaderType, substr(Rest, 2, ${next} - 1), Value
  FROM LShufWork_TSeg WHERE ${next} > 1;
UPDATE LShufWork_TSeg SET Rest = substr(Rest, ${next} + 1) WHERE ${next} > 0;`;
  return Array.from({ length: TAG_SEGMENT_CAP }, () => one).join("\n");
}

function tagRows() {
  const st = (col) => `(SELECT b.${col} FROM LShufWork_BStat b WHERE b.TableName = LShufWork_TagV.TableName)`;
  const v = "min(5, max(1, Value))";
  return `${work("LShufWork_TagV", "LeaderType TEXT, Tag TEXT, TableName TEXT, Value INTEGER, Rank INTEGER, Score INTEGER, PRIMARY KEY (LeaderType, Tag)")}
INSERT INTO LShufWork_TagV (LeaderType, Tag, TableName, Value) SELECT LeaderType, Tag, ${tagTable("Tag")}, MAX(Value)
  FROM LShufWork_TTag GROUP BY LeaderType, Tag;
DELETE FROM LShufWork_TagV WHERE TableName IS NULL OR ${st("LW")} = 0;
${rankUpdate("LShufWork_TagV", "Rank", ["LeaderType"], [["Value", true], ["Tag"]])}
DELETE FROM LShufWork_TagV WHERE Rank >= ${MAX_TAG_BIASES};
UPDATE LShufWork_TagV SET Score = CASE WHEN TableName = ${q(ISLAND_TABLE)} THEN ${st("LHi")}
  ELSE ${st("LLo")} + ((${st("LHi")} - ${st("LLo")}) * (${v} - 1)) / 4 END;
`;
}

function results() {
  const legacy = "r.CivilizationType IN (SELECT CivilizationType FROM LShufWork_Civ)";
  const replaced = `r.LeaderType IN (SELECT LeaderType FROM LShufWork_L WHERE (${CFG("OffB")} = 1 AND RB IS NULL))
    OR r.LeaderType IN (SELECT LeaderType FROM LShufWork_Pool WHERE Axis = 'B')`;
  const dropped = `CASE WHEN r.LeaderType IS NOT NULL THEN (${replaced})
    ELSE (${CFG("OffB")} = 1 OR (${dealtB} = 1 AND ${legacy})) END`;
  const ins = "INSERT INTO LShufResultBiases (TableName, LeaderType, CivilizationType, TargetType, Score, Origin)";
  return `DELETE FROM LShufResultBiases;
${ins} SELECT r.TableName, r.LeaderType, r.CivilizationType, r.TargetType, r.Score, 'shipped' FROM LShufWork_BRow r
  WHERE NOT (${dropped}) AND NOT (r.LeaderType IS NULL AND NOT ${notCivBuild("r.CivilizationType")});
${ins} SELECT r.TableName, d.LeaderType, r.CivilizationType, r.TargetType, r.Score, 'moved'
  FROM LShufWork_Donor d JOIN LShufWork_BRow r ON r.LeaderType = d.Donor WHERE d.Axis = 'B' AND ${CFG("BCycle")} = 1
    AND ${notBiasBuilder("d.LeaderType")};
${ins} SELECT r.TableName, p.LeaderType, r.CivilizationType, r.TargetType, r.Score, 'moved'
  FROM LShufWork_Pool p JOIN LShufWork_BRow r ON r.LeaderType = ${fromAbility("p.LeaderType")}
  WHERE p.Axis = 'B' AND ${CFG("BFromA")} = 1 AND ${notBiasBuilder("p.LeaderType")};
${ins} SELECT r.TableName, b.Leader, r.CivilizationType, r.TargetType, r.Score, 'moved'
  FROM ${BUILDS_IN("B")} JOIN LShufWork_BRow r ON r.LeaderType = b.BiasPick WHERE b.OK = 1 AND b.BiasPick IS NOT NULL;
${genericRows(ins)}
${ins} SELECT TableName, CASE WHEN IsCiv = 1 THEN NULL ELSE Subj END, CASE WHEN IsCiv = 1 THEN Subj ELSE NULL END,
  TargetType, Score, 'rolled' FROM LShufWork_Roll WHERE NOT (IsCiv = 1 AND NOT ${notCivBuild("Subj")});
${ins} SELECT TableName, LeaderType, NULL, CASE WHEN (SELECT HasTarget FROM LShufWork_BStat b WHERE b.TableName = t.TableName) = 1
  THEN Tag ELSE NULL END, Score, 'tags' FROM LShufWork_TagV t;
${ins} SELECT r.TableName, NULL, c.CivilizationType, r.TargetType, r.Score,
  CASE WHEN c.Donor = c.CivilizationType THEN 'shipped' ELSE 'moved' END
  FROM LShufWork_Civ c JOIN LShufWork_BRow r ON r.CivilizationType = c.Donor AND r.LeaderType IS NULL
  WHERE ${dealtB} = 1 AND ${CFG("RollBiases")} = 0 AND ${notCivBuild("c.CivilizationType")};
${ins} SELECT r.TableName, NULL, b.Civ, r.TargetType, r.Score, 'moved'
  FROM ${BUILDS_IN("B")} JOIN LShufWork_BRow r ON r.CivilizationType = b.CivBiasPick AND r.LeaderType IS NULL
  WHERE b.OK = 1 AND b.Civ IS NOT NULL AND b.CivBiasPick IS NOT NULL;
`;
}

export function biasesSql() {
  return [
    header("Deal step 4: start biases"),
    civs(),
    snapshot(),
    rolls(),
    tagSources(),
    tagSplit(),
    tagRows(),
    results()
  ].join("\n");
}
