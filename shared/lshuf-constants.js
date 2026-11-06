// Names shared by every part of the mod. CONTRACTS.md is the source; this file mirrors it so code imports
// the spelling instead of retyping it. Owned by the lead: workstreams import it and don't edit it.

export const MOD_ID = "re-dealable-leader-abilities-attributes-and-start-biases";
export const MOD_PATH = `/${MOD_ID}`;

// Setup parameters (frontend Parameters.ParameterID). The ConfigurationKey is the same string unless noted.
export const PARAM = {
  Mode: "LShufMode",
  Biases: "LShufBiases",
  Abilities: "LShufAbilities",
  Attributes: "LShufAttributes",
  KeepMine: "LShufKeepMine",
  LeadersOut: "LShufLeadersOut",
  ModdedAbilities: "LShufModdedAbilities",
  ModdedAttributes: "LShufModdedAttributes",
  ModdedBiases: "LShufModdedBiases",
  ModdedOut: "LShufModdedOut",
  Pool1: "LShufPool1",
  Pool2: "LShufPool2",
  Personality: "LShufPersonality",
  Dealing: "LShufDealing",
  Reveal: "LShufReveal",
  Seed: "LShufSeed"
};

// Parameters whose ConfigurationKey differs from the ParameterID.
export const CONFIG_KEY = {
  LShufLeadersOut: "LShufExcludedLeaders",
  LShufModdedOut: "LShufExcludedModdedLeaders"
};

export const configKeyOf = (paramId) => CONFIG_KEY[paramId] || paramId;

export const MODE = {
  None: "LSHUF_MODE_NONE",
  SwapAbilities: "LSHUF_MODE_SWAP_ABILITIES",
  SwapLeaders: "LSHUF_MODE_SWAP_LEADERS",
  SplitMatched: "LSHUF_MODE_SPLIT_MATCHED",
  SplitRandom: "LSHUF_MODE_SPLIT_RANDOM"
};

export const ONOFF = { Redealt: "LSHUF_REDEALT", Off: "LSHUF_OFF" };

export const PERSONA = {
  Stays: "LSHUF_PERSONA_STAYS",
  Follows: "LSHUF_PERSONA_FOLLOWS",
  Redealt: "LSHUF_PERSONA_REDEALT"
};

export const DEALING = { Balanced: "LSHUF_DEAL_BALANCED", Chance: "LSHUF_DEAL_CHANCE" };

export const REVEAL = { Start: "LSHUF_REVEAL_START", Met: "LSHUF_REVEAL_MET" };

// Deal numbers run SEED_MIN..SEED_MAX; the game config holds them as decimal strings ("1" .. "256").
export const SEED_MIN = 1;
export const SEED_MAX = 256;

// The option names used in LShufOptions (gameplay) and in the deal config object (JS), with their defaults.
// A missing LShufOptions row means the default.
export const OPTION_DEFAULTS = {
  Mode: MODE.None,
  Biases: ONOFF.Redealt,
  Abilities: ONOFF.Redealt,
  Attributes: ONOFF.Redealt,
  KeepMine: "0",
  ModdedAbilities: "0",
  ModdedAttributes: "0",
  ModdedBiases: "0",
  Personality: PERSONA.Follows,
  Dealing: DEALING.Balanced,
  Reveal: REVEAL.Start
};

// "Random from pool N" entries in each player slot's leader choice (DomainValues on StandardLeaders).
export const RANDOM_POOL = { 1: "LSHUF_RANDOM_POOL_1", 2: "LSHUF_RANDOM_POOL_2" };

// Game config keys written by script (Configuration.editGame().setValue), not setup parameters.
export const KEY = {
  keep: (leaderType) => `LShufKeep_${leaderType}`,
  modOK: (leaderType) => `LShufModOK_${leaderType}`,
  modWhy: (leaderType) => `LShufModWhy_${leaderType}`,
  NotInGame: "LShufNotInGame",
  Preview: "LShufPreview"
};

// List values in LShufExcludedLeaders, LShufExcludedModdedLeaders and LShufNotInGame carry these markers so a
// substring match can't confuse LEADER_XERXES with LEADER_XERXES_ALT (probe 13).
export const listValue = (leaderType) => `|${leaderType}|`;
export const fromListValue = (value) => String(value).replace(/^\|/, "").replace(/\|$/, "");

// LShufOut.Reason and LShufResultLeaders.Reason.
export const REASON = {
  Kept: "kept",
  List: "list",
  NotInGame: "notingame",
  ModdedList: "moddedlist",
  Unknown: "unknown",
  Observer: "observer",
  ModdedOff: "modded-off",
  ModdedNotOK: "modded-notok",
  ModdedLeaderType: "modded-leadertype",
  ModdedChanged: "modded-changed",
  TooFew: "too-few",
  ModeNone: "mode-none"
};

export const STATUS = { Dealt: "dealt", AsShipped: "asshipped" };

// LShufResultPieces.Kind
export const PIECE_KIND = { Bullet: "bullet", Remainder: "remainder", Whole: "whole" };

// Piece ids: <LeaderType>__B<nn> for a bullet (1-based, two digits), <LeaderType>__AGENDA for the agenda set,
// <LeaderType>__REST for modifiers the mapping doesn't list, <LeaderType>__WHOLE for a whole ability.
export const pieceId = {
  bullet: (leaderType, index) => `${leaderType}__B${String(index).padStart(2, "0")}`,
  agenda: (leaderType) => `${leaderType}__AGENDA`,
  rest: (leaderType) => `${leaderType}__REST`,
  whole: (leaderType) => `${leaderType}__WHOLE`
};

// Gameplay types the mod creates.
export const TRAIT = {
  dealt: (leaderType) => `TRAIT_LSHUF_${leaderType}`,
  persona: (leaderType) => `TRAIT_LSHUF_PERSONA_${leaderType}`,
  EqualActions: "TRAIT_LSHUF_EQUAL_ACTIONS",
  // A leader's second (third, ...) card of one attribute kind: LeaderTraits can hold a trait only once per leader, so
  // copy n (1-based) goes on this trait, which carries copies of the kind's attribute-point modifiers.
  extraAttribute: (attributeTrait, n) => `TRAIT_LSHUF_EXTRA${n}_${attributeTrait}`
};
export const copiedModifierId = (receiverLeaderType, modifierId) => `LSHUF_${receiverLeaderType}__${modifierId}`;
export const extraModifierId = (n, modifierId) => `LSHUF_EXTRA${n}__${modifierId}`;

// Window events (dispatched on window).
export const EVENT = {
  SetupChanged: "lshuf-setup-changed",
  SetupFinal: "lshuf-setup-final"
};

// The nine start-bias tables, and the bias tag each LShufMapping.BiasTags entry maps to.
export const BIAS_TABLES = [
  "StartBiasBiomes",
  "StartBiasTerrains",
  "StartBiasAdjacentToCoasts",
  "StartBiasFeatureClasses",
  "StartBiasRivers",
  "StartBiasLakes",
  "StartBiasNaturalWonders",
  "StartBiasIslands",
  "StartBiasResources"
];
// Target column per table (null: the table has no target column).
export const BIAS_TARGET_COLUMN = {
  StartBiasBiomes: "BiomeType",
  StartBiasTerrains: "TerrainType",
  StartBiasAdjacentToCoasts: null,
  StartBiasFeatureClasses: "FeatureClassType",
  StartBiasRivers: null,
  StartBiasLakes: null,
  StartBiasNaturalWonders: null,
  StartBiasIslands: null,
  StartBiasResources: "ResourceType"
};
// A bias tag is a target type (BIOME_*, TERRAIN_*, FEATURE_CLASS_*, RESOURCE_*) or one of these words.
export const BIAS_TAG_WORDS = {
  COAST: "StartBiasAdjacentToCoasts",
  RIVER: "StartBiasRivers",
  LAKE: "StartBiasLakes",
  NATURAL_WONDER: "StartBiasNaturalWonders",
  ISLAND: "StartBiasIslands"
};
export const BIAS_TAG_PREFIXES = [
  ["BIOME_", "StartBiasBiomes"],
  ["TERRAIN_", "StartBiasTerrains"],
  ["FEATURE_CLASS_", "StartBiasFeatureClasses"],
  ["RESOURCE_", "StartBiasResources"]
];

export function biasTableOfTag(tag) {
  if (BIAS_TAG_WORDS[tag]) return BIAS_TAG_WORDS[tag];
  const hit = BIAS_TAG_PREFIXES.find(([prefix]) => tag.startsWith(prefix));
  return hit ? hit[1] : null;
}

// "|A|B|" <-> ["A", "B"]
export const splitTags = (value) => (value ? String(value).split("|").filter(Boolean) : []);
export const joinTags = (list) => (list.length ? `|${list.join("|")}|` : null);
