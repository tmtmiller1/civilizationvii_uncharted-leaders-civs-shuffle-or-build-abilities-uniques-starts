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
  CivsOut: "LShufCivsOut",
  CivAbilities: "LShufCivAbilities",
  CivUniques: "LShufCivUniques",
  CivCivics: "LShufCivCivics",
  Personality: "LShufPersonality",
  Dealing: "LShufDealing",
  Reveal: "LShufReveal",
  Seed: "LShufSeed",
  // Build your own leader: the card ids the screen stores, "|id|id|" (CONTRACTS section 13).
  BuildPicks: "LShufBuildPicks"
};

// Parameters whose ConfigurationKey differs from the ParameterID.
export const CONFIG_KEY = {
  LShufLeadersOut: "LShufExcludedLeaders",
  LShufModdedOut: "LShufExcludedModdedLeaders",
  LShufCivsOut: "LShufExcludedCivs"
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

// Per-part settings (CONTRACTS 15). The Leader shuffle dropdown is a preset that writes these three; the deal reads
// only these. LSHUF_OFF stays the Off for everyone value on each.
export const A_MODE = { Normal: "LSHUF_A_NORMAL", Whole: "LSHUF_A_WHOLE", Split: "LSHUF_A_SPLIT", Off: ONOFF.Off };
export const T_MODE = { Normal: "LSHUF_T_NORMAL", Random: "LSHUF_T_RANDOM", Paired: "LSHUF_T_PAIRED", Off: ONOFF.Off };
export const B_MODE = {
  Normal: "LSHUF_B_NORMAL", Matched: "LSHUF_B_MATCHED", Paired: "LSHUF_B_PAIRED", Rolled: "LSHUF_B_ROLLED", Off: ONOFF.Off
};
export const MODE_CUSTOM = "LSHUF_MODE_CUSTOM";
// Civilizations (CONTRACTS 16): their abilities swap within their age; their uniques go with the ability, shuffle on
// their own, or stay.
export const CA_MODE = { Normal: "LSHUF_CA_NORMAL", Swapped: "LSHUF_CA_SWAPPED", Split: "LSHUF_CA_SPLIT", Off: ONOFF.Off };
export const CU_MODE = { Normal: "LSHUF_CU_NORMAL", Paired: "LSHUF_CU_PAIRED", Shuffled: "LSHUF_CU_SHUFFLED", Off: ONOFF.Off };
// Unique civics (CONTRACTS 18): the civ's civics tree with its traditions and the uniques its nodes unlock.
export const CC_MODE = { Normal: "LSHUF_CC_NORMAL", Paired: "LSHUF_CC_PAIRED", Shuffled: "LSHUF_CC_SHUFFLED", Off: ONOFF.Off };
// What each preset sets: [Abilities, Attributes, Biases].
export const PRESETS = {
  LSHUF_MODE_NONE: [A_MODE.Normal, T_MODE.Normal, B_MODE.Normal],
  LSHUF_MODE_SWAP_ABILITIES: [A_MODE.Whole, T_MODE.Random, B_MODE.Rolled],
  LSHUF_MODE_SWAP_LEADERS: [A_MODE.Whole, T_MODE.Paired, B_MODE.Paired],
  LSHUF_MODE_SPLIT_MATCHED: [A_MODE.Split, T_MODE.Random, B_MODE.Matched],
  LSHUF_MODE_SPLIT_RANDOM: [A_MODE.Split, T_MODE.Random, B_MODE.Rolled]
};
export function presetOf(abilities, attributes, biases) {
  const hit = Object.entries(PRESETS).find(([, v]) => v[0] === abilities && v[1] === attributes && v[2] === biases);
  return hit ? hit[0] : MODE_CUSTOM;
}

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
  Biases: B_MODE.Normal,
  Abilities: A_MODE.Normal,
  Attributes: T_MODE.Normal,
  KeepMine: "0",
  ModdedAbilities: "0",
  ModdedAttributes: "0",
  ModdedBiases: "0",
  CivAbilities: "LSHUF_CA_NORMAL",
  CivUniques: "LSHUF_CU_NORMAL",
  CivCivics: "LSHUF_CC_NORMAL",
  Personality: PERSONA.Follows,
  Dealing: DEALING.Balanced,
  Reveal: REVEAL.Start
};

// The "Random from the pool" entry in each player slot's leader choice (DomainValues on StandardLeaders), right
// after Random (SortIndex -999). One pool: a slot picks one leader, so one list is all a slot needs.
export const RANDOM_POOL = { 1: "LSHUF_RANDOM_POOL_1" };

// Game config keys written by script (Configuration.editGame().setValue), not setup parameters.
export const KEY = {
  keep: (leaderType) => `LShufKeep_${leaderType}`,
  modOK: (leaderType) => `LShufModOK_${leaderType}`,
  modWhy: (leaderType) => `LShufModWhy_${leaderType}`,
  NotInGame: "LShufNotInGame",
  Preview: "LShufPreview",
  // Build your own leader (CONTRACTS section 13): the builder's leader (|LEADER_X|), its civilization (|CIV_X|, when
  // picked by hand) and the cards it took (a list of build piece ids). One builder in this version (slot 1).
  Builder: "LShufBuilder",
  BuilderCiv: "LShufBuilderCiv",
  Built: "LShufBuilt",
  // Builder slots 2..BUILD_SLOTS (the host's AI leaders): the same three keys with the slot number appended.
  builderN: (n) => (n === 1 ? "LShufBuilder" : `LShufBuilder${n}`),
  builderCivN: (n) => (n === 1 ? "LShufBuilderCiv" : `LShufBuilderCiv${n}`),
  builtN: (n) => (n === 1 ? "LShufBuilt" : `LShufBuilt${n}`)
};
// How many leaders can be built in one game: slot 1 is the host, the rest are AI leaders the host builds. Each slot
// costs one loader per card in the modinfo (about 560), so this stays small until load time has been watched.
export const BUILD_SLOTS = 4;

// Build piece ids (the cards on the Build your own leader screen). Ability cards reuse pieceId.bullet / pieceId.whole.
export const BUILD = {
  // copy 2 is a second card of the same kind (the leader then holds it twice, CONTRACTS 5.3).
  attribute: (attributeTrait, copy = 1) => (copy > 1 ? `ATTR${copy}_${attributeTrait}` : `ATTR_${attributeTrait}`),
  attributeCopy: (id) => (/^ATTR(\d+)_/.test(id) ? Number(id.match(/^ATTR(\d+)_/)[1]) : 1),
  attributeTrait: (id) => id.replace(/^ATTR\d*_/, ""),
  persona: (leaderType) => `PERSONA_${leaderType}`,
  bias: (leaderType) => `BIAS_${leaderType}`,
  civBias: (civilizationType) => `CIVBIAS_${civilizationType}`,
  // A start terrain of the player's own choosing (GENERIC_BIASES), for a builder whose leader has none, or who wants
  // a different one. Same slot as a leader's start terrain card.
  genericBias: (tag) => `GBIAS_${tag}`,
  // Civilization cards (CONTRACTS 14): a civilization's ability, and one of its uniques (a unit, building, quarter
  // or improvement type).
  civAbility: (civilizationType) => `CIVABIL_${civilizationType}`,
  civUnique: (type) => `CIVUNQ_${type}`,
  // A civilization's unique civics: its civics tree, its traditions, and every unique the tree's nodes unlock.
  civCivics: (civilizationType) => `CIVCIVC_${civilizationType}`,
  // One bonus of a civilization's ability (LShufCivMapping piece ids are <CIV>__B<nn>, like leaders' pieces).
  civBullet: (civilizationType, index) => `${civilizationType}__B${String(index).padStart(2, "0")}`
};
// The generic start terrain cards: a bias tag (BIAS_TAG_WORDS or a typed target) and the score a leader's own row
// of that kind usually carries in the game's data.
export const GENERIC_BIASES = [
  ["BIOME_DESERT", 10], ["BIOME_GRASSLAND", 10], ["BIOME_PLAINS", 10], ["BIOME_TROPICAL", 10], ["BIOME_TUNDRA", 10],
  ["TERRAIN_FLAT", 10], ["TERRAIN_HILL", 10], ["TERRAIN_MOUNTAIN", 40], ["TERRAIN_NAVIGABLE_RIVER", 20],
  ["FEATURE_CLASS_VEGETATED", 20], ["FEATURE_CLASS_FLOODPLAIN", 10],
  ["COAST", 200], ["RIVER", 10], ["LAKE", 10], ["NATURAL_WONDER", 1000], ["ISLAND", 10]
];
export const BUILD_KIND = {
  Bullet: "bullet", Whole: "whole", Attribute: "attribute", Persona: "persona", Bias: "bias", CivBias: "civbias",
  CivAbility: "civability", CivUnique: "civunique", CivCivics: "civcivics", CivBullet: "civbullet"
};
export function buildKindOf(id) {
  if (/^ATTR\d*_/.test(id)) return BUILD_KIND.Attribute;
  if (id.startsWith("PERSONA_")) return BUILD_KIND.Persona;
  if (id.startsWith("CIVBIAS_")) return BUILD_KIND.CivBias;
  if (id.startsWith("CIVABIL_")) return BUILD_KIND.CivAbility;
  if (id.startsWith("CIVUNQ_")) return BUILD_KIND.CivUnique;
  if (id.startsWith("CIVCIVC_")) return BUILD_KIND.CivCivics;
  if (id.startsWith("CIVILIZATION_") && /__B\d+$/.test(id)) return BUILD_KIND.CivBullet;
  if (id.startsWith("BIAS_") || id.startsWith("GBIAS_")) return BUILD_KIND.Bias;
  return id.endsWith("__WHOLE") ? BUILD_KIND.Whole : BUILD_KIND.Bullet;
}
// Every bullet is its own card: the mapping ships reviewed, with bullets one effect serves together merged into one
// piece (scripts/mapping/merge-pieces.mjs). Set false to grey the bullet cards of any leader whose rows are
// Reviewed = 0 again.
export const BUILD_UNREVIEWED_BULLETS = true;
// Why a built pick didn't apply (LShufResultMeta Name "Builder": "ok" or one of these).
export const BUILD_WHY = { ModeOff: "mode-off", NotInGame: "builder-not-in-game", NoPieces: "no-pieces" };

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
  ModeNone: "mode-none",
  Built: "built"
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
