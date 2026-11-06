// Deal step 1: the config row, every major leader with its ability and checks, the axis states and the pools.
import { DEALING, MODE, ONOFF, OPTION_DEFAULTS, PERSONA, REASON } from "../../shared/lshuf-constants.js";
import { SALT } from "../../shared/lshuf-key.js";
import { LEADER_TYPE_REQUIREMENT } from "../../shared/deal/lshuf-deal-util.js";
import { CFG, header, key, q, rankUpdate, work } from "./sql-util.mjs";

const opt = (name) => `COALESCE((SELECT Value FROM LShufOptions WHERE Name = ${q(name)}), ${q(OPTION_DEFAULTS[name])})`;

function config() {
  return `${work(
    "LShufWork_Cfg",
    "Seed INTEGER, Mode TEXT, IsPaired INTEGER, IsFull INTEGER, IsMatched INTEGER, IsWhole INTEGER, IsSplit INTEGER, " +
      "Active INTEGER, RollBiases INTEGER, Balanced INTEGER, Follows INTEGER, PRedealt INTEGER, " +
      "OffA INTEGER, OffT INTEGER, OffB INTEGER, MA TEXT, MT TEXT, MB TEXT"
  )}
INSERT INTO LShufWork_Cfg SELECT s, m,
  m = ${q(MODE.SwapLeaders)}, m = ${q(MODE.SwapAbilities)}, m = ${q(MODE.SplitMatched)},
  m IN (${q(MODE.SwapLeaders)}, ${q(MODE.SwapAbilities)}), m IN (${q(MODE.SplitMatched)}, ${q(MODE.SplitRandom)}),
  m IN (${q(MODE.SwapLeaders)}, ${q(MODE.SwapAbilities)}, ${q(MODE.SplitMatched)}, ${q(MODE.SplitRandom)}),
  m IN (${q(MODE.SwapAbilities)}, ${q(MODE.SplitRandom)}),
  dl <> ${q(DEALING.Chance)}, pe NOT IN (${q(PERSONA.Stays)}, ${q(PERSONA.Redealt)}), pe = ${q(PERSONA.Redealt)},
  ab = ${q(ONOFF.Off)}, at = ${q(ONOFF.Off)}, bi = ${q(ONOFF.Off)}, ma, mt, mb
FROM (SELECT COALESCE((SELECT MIN(Seed) FROM LShufSeed), 1) AS s, ${opt("Mode")} AS m, ${opt("Dealing")} AS dl,
  ${opt("Personality")} AS pe, ${opt("Abilities")} AS ab, ${opt("Attributes")} AS at, ${opt("Biases")} AS bi,
  ${opt("ModdedAbilities")} AS ma, ${opt("ModdedAttributes")} AS mt, ${opt("ModdedBiases")} AS mb) o;
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
  const row = (axis, off, r) => `SELECT ${q(axis)}, ${CFG(off)}, (SELECT COUNT(*) FROM LShufWork_L WHERE ${r} IS NULL)`;
  return `${work("LShufWork_Axis", "Axis TEXT PRIMARY KEY, Off INTEGER, NElig INTEGER, Dealt INTEGER, Level TEXT, Fallback INTEGER")}
INSERT INTO LShufWork_Axis (Axis, Off, NElig) ${row("A", "OffA", "RA")} UNION ALL ${row("T", "OffT", "RT")}
  UNION ALL ${row("B", "OffB", "RB")};
UPDATE LShufWork_Axis SET
  Dealt = (Off = 0 AND ${CFG("Active")} = 1 AND NElig >= 2),
  Fallback = (Off = 0 AND ${CFG("Active")} = 1 AND NElig < 2),
  Level = CASE WHEN Off = 1 THEN NULL WHEN ${CFG("Active")} = 0 THEN ${q(REASON.ModeNone)}
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

export function prepareSql() {
  return [header("Deal step 1: config, leaders, pools"), config(), leaders(), axes(), pools()].join("\n");
}
