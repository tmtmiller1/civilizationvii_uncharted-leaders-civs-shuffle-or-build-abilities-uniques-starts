// Deal step 1: the config row, every major leader with its ability and checks, the axis states and the pools.
import {
  A_MODE, B_MODE, BUILD_SLOTS, BUILD_WHY, DEALING, MODE_CUSTOM, ONOFF, OPTION_DEFAULTS, PERSONA, PRESETS, REASON, T_MODE
} from "../../shared/lshuf-constants.js";
import { SALT } from "../../shared/lshuf-key.js";
import { LEADER_TYPE_REQUIREMENT } from "../../shared/deal/lshuf-deal-util.js";
import { BUILD_SLOT, CFG, header, key, q, rankUpdate, SLOTS, work } from "./sql-util.mjs";

const opt = (name) => `COALESCE((SELECT Value FROM LShufOptions WHERE Name = ${q(name)}), ${q(OPTION_DEFAULTS[name])})`;
// A part without a row is NULL here and reads as the preset's part (partExpr), not as Normal.
const raw = (name) => `(SELECT Value FROM LShufOptions WHERE Name = ${q(name)})`;

// The three parts (CONTRACTS 15), each read as its own value, else (an old save's LSHUF_REDEALT, no row) the preset's
// part when Mode is a preset, else Normal; then the flags the steps branch on, derived the way partFlags() derives
// them in lshuf-deal-axes.js. Mode is the preset the parts make, or LSHUF_MODE_CUSTOM.
const PART_SQL = {
  Abilities: ["ab", A_MODE, 0],
  Attributes: ["at", T_MODE, 1],
  Biases: ["bi", B_MODE, 2]
};
function partExpr(name) {
  const [col, values, index] = PART_SQL[name];
  const own = Object.values(values).map(q).join(", ");
  const byPreset = Object.entries(PRESETS).map(([mode, parts]) => `WHEN m = ${q(mode)} THEN ${q(parts[index])}`).join(" ");
  return `CASE WHEN ${col} IN (${own}) THEN ${col} ${byPreset} ELSE ${q(values.Normal)} END`;
}
function modeExpr() {
  const cases = Object.entries(PRESETS)
    .map(([mode, [a, t, b]]) => `WHEN pa = ${q(a)} AND pt = ${q(t)} AND pb = ${q(b)} THEN ${q(mode)}`).join(" ");
  return `CASE ${cases} ELSE ${q(MODE_CUSTOM)} END`;
}

function config() {
  const off = q(ONOFF.Off);
  const live = (col, normal) => `(${col} <> ${q(normal)} AND ${col} <> ${off})`;
  const follows = `pb IN (${q(B_MODE.Paired)}, ${q(B_MODE.Matched)})`;
  return `${work(
    "LShufWork_Cfg",
    "Seed INTEGER, Mode TEXT, IsPaired INTEGER, IsFull INTEGER, IsMatched INTEGER, IsWhole INTEGER, IsSplit INTEGER, " +
      "Active INTEGER, RollBiases INTEGER, Balanced INTEGER, Follows INTEGER, PRedealt INTEGER, " +
      "OffA INTEGER, OffT INTEGER, OffB INTEGER, MA TEXT, MT TEXT, MB TEXT, " +
      "PA TEXT, PT TEXT, PB TEXT, ANormal INTEGER, TNormal INTEGER, BNormal INTEGER, " +
      "TCycle INTEGER, TFromA INTEGER, BCycle INTEGER, BFromA INTEGER, CA TEXT, CU TEXT, CC TEXT"
  )}
INSERT INTO LShufWork_Cfg SELECT s, ${modeExpr()},
  pt = ${q(T_MODE.Paired)} AND pa = ${q(A_MODE.Whole)},
  pa = ${q(A_MODE.Whole)} AND pt = ${q(T_MODE.Random)} AND pb = ${q(B_MODE.Rolled)},
  pb = ${q(B_MODE.Matched)} AND pa = ${q(A_MODE.Split)},
  pa = ${q(A_MODE.Whole)}, pa = ${q(A_MODE.Split)},
  ${live("pa", A_MODE.Normal)} OR ${live("pt", T_MODE.Normal)} OR ${live("pb", B_MODE.Normal)},
  pb = ${q(B_MODE.Rolled)} OR (${follows} AND pa NOT IN (${q(A_MODE.Whole)}, ${q(A_MODE.Split)})),
  dl <> ${q(DEALING.Chance)}, pe NOT IN (${q(PERSONA.Stays)}, ${q(PERSONA.Redealt)}), pe = ${q(PERSONA.Redealt)},
  pa = ${off}, pt = ${off}, pb = ${off}, ma, mt, mb,
  pa, pt, pb, pa = ${q(A_MODE.Normal)}, pt = ${q(T_MODE.Normal)}, pb = ${q(B_MODE.Normal)},
  pt = ${q(T_MODE.Paired)} AND pa = ${q(A_MODE.Whole)}, pt = ${q(T_MODE.Paired)} AND pa = ${q(A_MODE.Split)},
  ${follows} AND pa = ${q(A_MODE.Whole)}, pb = ${q(B_MODE.Paired)} AND pa = ${q(A_MODE.Split)}, ca, cu, cc
FROM (SELECT s, m, dl, pe, ma, mt, mb, ca, cu, cc, ${partExpr("Abilities")} AS pa, ${partExpr("Attributes")} AS pt,
    ${partExpr("Biases")} AS pb FROM
  (SELECT COALESCE((SELECT MIN(Seed) FROM LShufSeed), 1) AS s, ${opt("Mode")} AS m, ${opt("Dealing")} AS dl,
  ${opt("Personality")} AS pe, ${raw("Abilities")} AS ab, ${raw("Attributes")} AS at, ${raw("Biases")} AS bi,
  ${opt("ModdedAbilities")} AS ma, ${opt("ModdedAttributes")} AS mt, ${opt("ModdedBiases")} AS mb,
  ${opt("CivAbilities")} AS ca, ${opt("CivUniques")} AS cu, ${opt("CivCivics")} AS cc) i) o;
`;
}

function leaders() {
  const L = "LShufWork_L.LeaderType";
  const ab = "LShufWork_L.Ability";
  return `${work(
    "LShufWork_L",
    "LeaderType TEXT PRIMARY KEY, Ability TEXT, AbilityName TEXT, NAttr INTEGER, NMods INTEGER, Known INTEGER, " +
      "Modded INTEGER, Kept INTEGER, OutReason TEXT, ModOK INTEGER, LTReq INTEGER, Base TEXT, RA TEXT, RT TEXT, RB TEXT, " +
      "InA INTEGER, InT INTEGER, InB INTEGER, Changed INTEGER, AbilityFrom TEXT, PersonaFrom TEXT, BiasFrom TEXT"
  )}
INSERT INTO LShufWork_L (LeaderType) SELECT DISTINCT LeaderType FROM Leaders WHERE IsMajorLeader = 1;
UPDATE LShufWork_L SET Ability = (SELECT MIN(lt.TraitType) FROM LeaderTraits lt JOIN Traits t ON t.TraitType = lt.TraitType
  WHERE lt.LeaderType = ${L} AND t.Name IS NOT NULL);
UPDATE LShufWork_L SET
  AbilityName = (SELECT t.Name FROM Traits t WHERE t.TraitType = ${ab}),
  NAttr = (SELECT COUNT(DISTINCT lt.TraitType) FROM LeaderTraits lt
    WHERE lt.LeaderType = ${L} AND lt.TraitType IN (SELECT TraitType FROM LShufAttributeTraits)),
  NMods = (SELECT COUNT(DISTINCT tm.ModifierId) FROM TraitModifiers tm WHERE tm.TraitType = ${ab}),
  Known = EXISTS (SELECT 1 FROM LShufKnownLeaders k WHERE k.LeaderType = ${L}),
  Modded = EXISTS (SELECT 1 FROM LShufKnownLeaders k WHERE k.LeaderType = ${L} AND k.IsModded = 1),
  Kept = EXISTS (SELECT 1 FROM LShufKept k WHERE k.LeaderType = ${L}),
  OutReason = (SELECT MIN(o.Reason) FROM LShufOut o WHERE o.LeaderType = ${L}),
  ModOK = EXISTS (SELECT 1 FROM LShufModOK k WHERE k.LeaderType = ${L}),
  LTReq = EXISTS (SELECT 1 FROM TraitModifiers tm JOIN Modifiers m ON m.ModifierId = tm.ModifierId
    JOIN RequirementSetRequirements rs ON rs.RequirementSetId IN (m.OwnerRequirementSetId, m.SubjectRequirementSetId)
    JOIN Requirements r ON r.RequirementId = rs.RequirementId
    WHERE tm.TraitType = ${ab} AND r.RequirementType = ${q(LEADER_TYPE_REQUIREMENT)});
UPDATE LShufWork_L SET Base = CASE
  WHEN Known = 0 THEN ${q(REASON.Unknown)} WHEN Kept = 1 THEN ${q(REASON.Kept)}
  WHEN OutReason IS NOT NULL THEN OutReason WHEN NMods = 0 AND NAttr = 0 THEN ${q(REASON.Observer)}
  WHEN Modded = 1 AND ModOK = 0 THEN ${q(REASON.ModdedNotOK)} WHEN Modded = 1 AND LTReq = 1 THEN ${q(REASON.ModdedLeaderType)}
  ELSE NULL END;
UPDATE LShufWork_L SET
  RA = COALESCE(Base, CASE WHEN Modded = 1 AND ${CFG("MA")} <> '1' THEN ${q(REASON.ModdedOff)} END),
  RT = COALESCE(Base, CASE WHEN Modded = 1 AND ${CFG("MT")} <> '1' THEN ${q(REASON.ModdedOff)} END),
  RB = COALESCE(Base, CASE WHEN Modded = 1 AND ${CFG("MB")} <> '1' THEN ${q(REASON.ModdedOff)} END);
`;
}

function axes() {
  // A part on Normal: that axis isn't dealt even while the others are (CONTRACTS 15).
  const normalOf = `CASE Axis WHEN 'A' THEN ${CFG("ANormal")} WHEN 'T' THEN ${CFG("TNormal")} ELSE ${CFG("BNormal")} END`;
  const row = (axis, off, r) => `SELECT ${q(axis)}, ${CFG(off)}, (SELECT COUNT(*) FROM LShufWork_L WHERE ${r} IS NULL)`;
  return `${work("LShufWork_Axis", "Axis TEXT PRIMARY KEY, Off INTEGER, NElig INTEGER, Dealt INTEGER, Level TEXT, Fallback INTEGER")}
INSERT INTO LShufWork_Axis (Axis, Off, NElig) ${row("A", "OffA", "RA")} UNION ALL ${row("T", "OffT", "RT")}
  UNION ALL ${row("B", "OffB", "RB")};
UPDATE LShufWork_Axis SET
  Dealt = (Off = 0 AND ${CFG("Active")} = 1 AND ${normalOf} = 0 AND NElig >= 2),
  Fallback = (Off = 0 AND ${CFG("Active")} = 1 AND ${normalOf} = 0 AND NElig < 2),
  Level = CASE WHEN Off = 1 THEN NULL WHEN ${CFG("Active")} = 0 OR ${normalOf} = 1 THEN ${q(REASON.ModeNone)}
    WHEN NElig < 2 THEN ${q(REASON.TooFew)} ELSE NULL END;
`;
}

const dealt = (axis) => `(SELECT Dealt FROM LShufWork_Axis WHERE Axis = ${q(axis)})`;

// Pools: A, T, B (the dealt leaders of each axis, keyed with SALT.Leaders), TS (the attribute pool keyed for the
// slot order), P (the personality pool when AI personality is re-dealt).
function pools() {
  const add = (pool, r, cond) =>
    `INSERT INTO LShufWork_Pool (Axis, LeaderType) SELECT ${q(pool)}, LeaderType FROM LShufWork_L WHERE ${r} IS NULL AND ${cond};`;
  const salt = `CASE Axis WHEN 'TS' THEN ${SALT.AttributeRedraw} WHEN 'P' THEN ${SALT.Personality} ELSE ${SALT.Leaders} END`;
  const ownPersona = `${CFG("OffA")} = 1 AND ${CFG("Active")} = 1 AND (SELECT NElig FROM LShufWork_Axis WHERE Axis = 'A') >= 2`;
  return `${work("LShufWork_Pool", "Axis TEXT, LeaderType TEXT, Rank INTEGER, K INTEGER, Pos INTEGER, N INTEGER, PRIMARY KEY (Axis, LeaderType)")}
${add("A", "RA", `${dealt("A")} = 1`)}
${add("T", "RT", `${dealt("T")} = 1`)}
${add("TS", "RT", `${dealt("T")} = 1`)}
${add("B", "RB", `${dealt("B")} = 1`)}
${add("P", "RA", `${CFG("PRedealt")} = 1 AND (${dealt("A")} = 1 OR (${ownPersona}))`)}
${rankUpdate("LShufWork_Pool", "Rank", ["Axis"], [["LeaderType"]])}
UPDATE LShufWork_Pool SET K = ${key(salt, "Rank")}, N = (SELECT COUNT(*) FROM LShufWork_Pool o WHERE o.Axis = LShufWork_Pool.Axis);
${rankUpdate("LShufWork_Pool", "Pos", ["Axis"], [["K"], ["LeaderType"]])}
${work("LShufWork_Donor", "Axis TEXT, LeaderType TEXT, Donor TEXT, PRIMARY KEY (Axis, LeaderType)")}
INSERT INTO LShufWork_Donor (Axis, LeaderType, Donor) SELECT p.Axis, p.LeaderType, d.LeaderType
  FROM LShufWork_Pool p JOIN LShufWork_Pool d ON d.Axis = p.Axis AND d.Pos = (p.Pos + 1) % p.N;
`;
}

// Build your own leader (CONTRACTS 13, builder slots): one row per builder slot and its picks by kind. Why: Leader
// shuffle off, the builder not a major in the game with no reason against it (or a lower slot building the same
// leader), or no pick left once lower slots took theirs (a piece ticked twice goes to the lower slot). One pick each
// of behavior, start terrain and civilization start terrain: the lowest id, as the JS takes the first sorted id.
function build() {
  const kind = `CASE WHEN substr(PieceId, 1, 5) = 'ATTR_' OR substr(PieceId, 1, 6) = 'ATTR2_' THEN 'attr' WHEN substr(PieceId, 1, 8) = 'PERSONA_' THEN 'persona'
    WHEN substr(PieceId, 1, 8) = 'CIVBIAS_' THEN 'civbias' WHEN substr(PieceId, 1, 8) = 'CIVABIL_' THEN 'civability'
    WHEN substr(PieceId, 1, 7) = 'CIVUNQ_' THEN 'civunique' WHEN substr(PieceId, 1, 8) = 'CIVCIVC_' THEN 'civcivics' WHEN substr(PieceId, 1, 6) = 'GBIAS_' THEN 'gbias' WHEN substr(PieceId, 1, 5) = 'BIAS_' THEN 'bias'
    WHEN substr(PieceId, 1, 13) = 'CIVILIZATION_' AND PieceId LIKE '%\\_\\_B__' ESCAPE '\\' THEN 'civbullet'
    WHEN substr(PieceId, -7) = '__WHOLE' THEN 'whole' ELSE 'bullet' END`;
  const arg = `CASE WHEN substr(PieceId, 1, 5) = 'ATTR_' THEN substr(PieceId, 6) WHEN substr(PieceId, 1, 6) = 'ATTR2_' THEN substr(PieceId, 7) WHEN substr(PieceId, 1, 8) = 'PERSONA_' THEN substr(PieceId, 9)
    WHEN substr(PieceId, 1, 8) = 'CIVBIAS_' THEN substr(PieceId, 9) WHEN substr(PieceId, 1, 8) = 'CIVABIL_' THEN substr(PieceId, 9)
    WHEN substr(PieceId, 1, 7) = 'CIVUNQ_' THEN substr(PieceId, 8) WHEN substr(PieceId, 1, 8) = 'CIVCIVC_' THEN substr(PieceId, 9) WHEN substr(PieceId, 1, 6) = 'GBIAS_' THEN substr(PieceId, 7) WHEN substr(PieceId, 1, 5) = 'BIAS_' THEN substr(PieceId, 6)
    WHEN substr(PieceId, -7) = '__WHOLE' THEN substr(PieceId, 1, length(PieceId) - 7) ELSE PieceId END`;
  const pick = (k, extra = "") =>
    `(SELECT MIN(p.Arg) FROM LShufWork_BuildPiece p WHERE p.Kind = ${q(k)} AND p.Slot = LShufWork_Build.Slot${extra})`;
  const major = " AND p.Arg IN (SELECT LeaderType FROM LShufWork_L)";
  // Slot by slot, so a lower slot's verdict is known when a higher one checks for the same leader.
  const why = SLOTS.map((n) => `UPDATE LShufWork_Build SET Why = CASE WHEN ${CFG("Active")} = 0 THEN ${q(BUILD_WHY.ModeOff)}
  WHEN NOT EXISTS (SELECT 1 FROM LShufWork_L l WHERE l.LeaderType = LShufWork_Build.Leader AND l.Base IS NULL) THEN ${q(BUILD_WHY.NotInGame)}
  WHEN EXISTS (SELECT 1 FROM LShufWork_Build b2 WHERE b2.Slot < ${n} AND b2.Leader = LShufWork_Build.Leader AND b2.Why IS NULL)
    THEN ${q(BUILD_WHY.NotInGame)} END WHERE Slot = ${n};`).join("\n");
  return `${work("LShufWork_Build", "Slot INTEGER PRIMARY KEY, Leader TEXT, Civ TEXT, OK INTEGER, Why TEXT, PersonaPick TEXT, BiasPick TEXT, GenericBiasPick TEXT, CivBiasPick TEXT, WholePick TEXT, OldDonor TEXT, HasT INTEGER, BulletBuild INTEGER NOT NULL DEFAULT 0")}
INSERT INTO LShufWork_Build (Slot, Leader, Civ) SELECT Slot, LeaderType, CivilizationType FROM LShufBuild
  WHERE Slot BETWEEN 1 AND ${BUILD_SLOTS} ORDER BY Slot;
${why}
${work("LShufWork_BuildPiece", "PieceId TEXT PRIMARY KEY, Slot INTEGER, Kind TEXT, Arg TEXT, Copy INTEGER NOT NULL DEFAULT 1")}
INSERT OR IGNORE INTO LShufWork_BuildPiece (PieceId, Slot, Kind, Arg, Copy)
  SELECT PieceId, Slot, ${kind}, ${arg}, CASE WHEN substr(PieceId, 1, 6) = 'ATTR2_' THEN 2 ELSE 1 END FROM LShufBuildPieces
  WHERE Slot IN (SELECT Slot FROM LShufWork_Build WHERE Why IS NULL) ORDER BY Slot, PieceId;
UPDATE LShufWork_Build SET Why = ${q(BUILD_WHY.NoPieces)}
  WHERE Why IS NULL AND NOT EXISTS (SELECT 1 FROM LShufWork_BuildPiece p WHERE p.Slot = LShufWork_Build.Slot);
UPDATE LShufWork_Build SET OK = (Why IS NULL), PersonaPick = ${pick("persona", major)}, BiasPick = ${pick("bias", major)},
  CivBiasPick = ${pick("civbias")}, GenericBiasPick = ${pick("gbias")};
-- A leader's start terrain card wins over a generic one when both are ticked.
UPDATE LShufWork_Build SET GenericBiasPick = NULL WHERE BiasPick IS NOT NULL;
`;
}

// Each builder's first whole card in the whole modes, slot by slot: the builder takes it, and whoever was to get it
// takes what the builder was to get (lshuf-deal-ability.js wholeBuild).
function wholeSwap() {
  const inA = "(SELECT LeaderType FROM LShufWork_Pool WHERE Axis = 'A')";
  const donorOf = (leader) => `(SELECT d.Donor FROM LShufWork_Donor d WHERE d.Axis = 'A' AND d.LeaderType = ${leader})`;
  return SLOTS.map((n) => {
    const old = BUILD_SLOT("OldDonor", n);
    const pick = BUILD_SLOT("WholePick", n);
    const leader = BUILD_SLOT("Leader", n);
    return `UPDATE LShufWork_Build SET WholePick = (SELECT MIN(p.Arg) FROM LShufWork_BuildPiece p WHERE p.Kind = 'whole' AND p.Slot = ${n} AND p.Arg IN ${inA})
  WHERE Slot = ${n} AND OK = 1 AND ${CFG("IsWhole")} = 1 AND Leader IN ${inA};
UPDATE LShufWork_Build SET OldDonor = ${donorOf("LShufWork_Build.Leader")}
  WHERE Slot = ${n} AND WholePick IS NOT NULL AND WholePick <> ${donorOf("LShufWork_Build.Leader")};
UPDATE LShufWork_Donor SET Donor = ${old} WHERE Axis = 'A' AND ${old} IS NOT NULL AND Donor = ${pick};
UPDATE LShufWork_Donor SET Donor = ${pick} WHERE Axis = 'A' AND ${old} IS NOT NULL AND LeaderType = ${leader};`;
  }).join("\n") + "\n";
}

// A whole-mode builder with bullet cards and no whole card (lshuf-deal-ability.js wholeBuild): it gets exactly those
// bullets (LShufWork_BBullet, copied), leaves the cycle (whoever was to take its ability takes what it was to take,
// and its own ability goes to nobody: its Donor row goes), and walks the copy path.
function bulletBuild() {
  const inA = "(SELECT LeaderType FROM LShufWork_Pool WHERE Axis = 'A')";
  const owner = "substr(p.Arg, 1, instr(p.Arg, '__B') - 1)";
  const bulletPicks = (n) => `EXISTS (SELECT 1 FROM LShufWork_BuildPiece p WHERE p.Kind = 'bullet' AND p.Slot = ${n}
    AND instr(p.Arg, '__B') > 0 AND ${owner} IN (SELECT LeaderType FROM LShufWork_L))`;
  const donorOf = (leader) => `(SELECT d.Donor FROM LShufWork_Donor d WHERE d.Axis = 'A' AND d.LeaderType = ${leader})`;
  const steps = SLOTS.map((n) => {
    const leader = BUILD_SLOT("Leader", n);
    return `UPDATE LShufWork_Build SET BulletBuild = 1 WHERE Slot = ${n} AND OK = 1 AND ${CFG("IsWhole")} = 1
  AND WholePick IS NULL AND Leader IN ${inA} AND ${bulletPicks(n)};
INSERT OR IGNORE INTO LShufWork_BBullet (Leader, PieceId, FromLeader)
  SELECT ${leader}, p.Arg, ${owner} FROM LShufWork_BuildPiece p
  WHERE p.Slot = ${n} AND p.Kind = 'bullet' AND instr(p.Arg, '__B') > 0 AND ${BUILD_SLOT("BulletBuild", n)} = 1
    AND ${owner} IN (SELECT LeaderType FROM LShufWork_L);
UPDATE LShufWork_Donor SET Donor = ${donorOf(leader)}
  WHERE Axis = 'A' AND Donor = ${leader} AND LeaderType <> ${leader} AND ${BUILD_SLOT("BulletBuild", n)} = 1;
DELETE FROM LShufWork_Donor WHERE Axis = 'A' AND LeaderType = ${leader} AND ${BUILD_SLOT("BulletBuild", n)} = 1;`;
  }).join("\n");
  return `${work("LShufWork_BBullet", "Leader TEXT, PieceId TEXT, FromLeader TEXT, SortIndex INTEGER, PRIMARY KEY (Leader, PieceId)")}
${steps}
${rankUpdate("LShufWork_BBullet", "SortIndex", ["Leader"], [["PieceId"]])}
`;
}

export function prepareSql() {
  return [header("Deal step 1: config, leaders, pools"), config(), leaders(), axes(), build(), pools(), wholeSwap(), bulletBuild()]
    .join("\n");
}
