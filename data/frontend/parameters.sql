-- Setup parameters for Re-dealable Leaders (CONTRACTS.md section 2). Shell scope, group lshuf-shell, LoadOrder 20000,
-- so leader mods have added their frontend Leaders rows first.
--
-- Every option is Hidden = 1: the advanced screen doesn't draw them, and the mod's own window (ui/setup/lshuf-setup.js)
-- reads and writes them with GameSetup. They still save with the game, travel through the lobby and gate data with
-- ConfigurationValueMatches. No ParameterGroups row (CONTRACTS section 12, item 5).
--
-- The leader domains select through the frontend Leaders table, so a DLC or a leader mod the player doesn't have
-- isn't listed. The two leader lists below mirror VANILLA_LEADERS and MODDED_LEADER_TYPES in
-- shared/lshuf-known-leaders.js; keep them the same when that file changes.

INSERT OR IGNORE INTO Parameters (ParameterID, Name, Description, Domain, Array, DefaultValue, ConfigurationGroup,
  ConfigurationKey, GroupID, Hidden, ReadOnly, SupportsSinglePlayer, SupportsLANMultiplayer, SupportsInternetMultiplayer,
  SupportsHotseatMultiplayer, ChangeableAfterGameStart, UxHint, SortIndex)
VALUES
  ('LShufMode', 'LOC_LSHUF_MODE_NAME', 'LOC_LSHUF_MODE_DESC', 'LShufModeValues', 0, 'LSHUF_MODE_NONE', 'Game', 'LShufMode', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2300),
  ('LShufBiases', 'LOC_LSHUF_BIASES_NAME', 'LOC_LSHUF_BIASES_DESC', 'LShufOnOffValues', 0, 'LSHUF_REDEALT', 'Game', 'LShufBiases', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2301),
  ('LShufAbilities', 'LOC_LSHUF_ABILITIES_NAME', 'LOC_LSHUF_ABILITIES_DESC', 'LShufOnOffValues', 0, 'LSHUF_REDEALT', 'Game', 'LShufAbilities', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2302),
  ('LShufAttributes', 'LOC_LSHUF_ATTRIBUTES_NAME', 'LOC_LSHUF_ATTRIBUTES_DESC', 'LShufOnOffValues', 0, 'LSHUF_REDEALT', 'Game', 'LShufAttributes', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2303),
  ('LShufKeepMine', 'LOC_LSHUF_KEEP_MINE_NAME', 'LOC_LSHUF_KEEP_MINE_DESC', 'bool', 0, 0, 'Game', 'LShufKeepMine', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2304),
  ('LShufLeadersOut', 'LOC_LSHUF_LEADERS_OUT_NAME', 'LOC_LSHUF_LEADERS_OUT_DESC', 'LShufLeaderValues', 1, NULL, 'Game', 'LShufExcludedLeaders', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, 'InvertSelection', 2305),
  ('LShufModdedAbilities', 'LOC_LSHUF_MODDED_ABILITIES_NAME', 'LOC_LSHUF_MODDED_ABILITIES_DESC', 'bool', 0, 0, 'Game', 'LShufModdedAbilities', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2306),
  ('LShufModdedAttributes', 'LOC_LSHUF_MODDED_ATTRIBUTES_NAME', 'LOC_LSHUF_MODDED_ATTRIBUTES_DESC', 'bool', 0, 0, 'Game', 'LShufModdedAttributes', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2307),
  ('LShufModdedBiases', 'LOC_LSHUF_MODDED_BIASES_NAME', 'LOC_LSHUF_MODDED_BIASES_DESC', 'bool', 0, 0, 'Game', 'LShufModdedBiases', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2308),
  ('LShufModdedOut', 'LOC_LSHUF_MODDED_OUT_NAME', 'LOC_LSHUF_MODDED_OUT_DESC', 'LShufModdedLeaderValues', 1, NULL, 'Game', 'LShufExcludedModdedLeaders', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, 'InvertSelection', 2309),
  ('LShufPool1', 'LOC_LSHUF_POOL1_NAME', 'LOC_LSHUF_POOL1_DESC', 'LShufPoolLeaderValues', 1, NULL, 'Game', 'LShufPool1', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2310),
  ('LShufPool2', 'LOC_LSHUF_POOL2_NAME', 'LOC_LSHUF_POOL2_DESC', 'LShufPoolLeaderValues', 1, NULL, 'Game', 'LShufPool2', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2311),
  ('LShufPersonality', 'LOC_LSHUF_PERSONALITY_NAME', 'LOC_LSHUF_PERSONALITY_DESC', 'LShufPersonalityValues', 0, 'LSHUF_PERSONA_FOLLOWS', 'Game', 'LShufPersonality', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2312),
  ('LShufDealing', 'LOC_LSHUF_DEALING_NAME', 'LOC_LSHUF_DEALING_DESC', 'LShufDealingValues', 0, 'LSHUF_DEAL_BALANCED', 'Game', 'LShufDealing', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2313),
  ('LShufReveal', 'LOC_LSHUF_REVEAL_NAME', 'LOC_LSHUF_REVEAL_DESC', 'LShufRevealValues', 0, 'LSHUF_REVEAL_START', 'Game', 'LShufReveal', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2314),
  ('LShufSeed', 'LOC_LSHUF_SEED_NAME', 'LOC_LSHUF_SEED_DESC', 'text', 0, '1', 'Game', 'LShufSeed', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2315);

-- Values of the select options, in the order the window lists them.
INSERT OR IGNORE INTO DomainValues (Domain, Value, Name, Description, SortIndex) VALUES
  ('LShufModeValues', 'LSHUF_MODE_NONE', 'LOC_LSHUF_MODE_NONE', 'LOC_LSHUF_MODE_NONE_DESC', 10),
  ('LShufModeValues', 'LSHUF_MODE_SWAP_ABILITIES', 'LOC_LSHUF_MODE_SWAP_ABILITIES', 'LOC_LSHUF_MODE_SWAP_ABILITIES_DESC', 20),
  ('LShufModeValues', 'LSHUF_MODE_SWAP_LEADERS', 'LOC_LSHUF_MODE_SWAP_LEADERS', 'LOC_LSHUF_MODE_SWAP_LEADERS_DESC', 30),
  ('LShufModeValues', 'LSHUF_MODE_SPLIT_MATCHED', 'LOC_LSHUF_MODE_SPLIT_MATCHED', 'LOC_LSHUF_MODE_SPLIT_MATCHED_DESC', 40),
  ('LShufModeValues', 'LSHUF_MODE_SPLIT_RANDOM', 'LOC_LSHUF_MODE_SPLIT_RANDOM', 'LOC_LSHUF_MODE_SPLIT_RANDOM_DESC', 50),
  ('LShufOnOffValues', 'LSHUF_REDEALT', 'LOC_LSHUF_REDEALT', 'LOC_LSHUF_REDEALT_DESC', 10),
  ('LShufOnOffValues', 'LSHUF_OFF', 'LOC_LSHUF_OFF', 'LOC_LSHUF_OFF_DESC', 20),
  ('LShufPersonalityValues', 'LSHUF_PERSONA_STAYS', 'LOC_LSHUF_PERSONA_STAYS', 'LOC_LSHUF_PERSONA_STAYS_DESC', 10),
  ('LShufPersonalityValues', 'LSHUF_PERSONA_FOLLOWS', 'LOC_LSHUF_PERSONA_FOLLOWS', 'LOC_LSHUF_PERSONA_FOLLOWS_DESC', 20),
  ('LShufPersonalityValues', 'LSHUF_PERSONA_REDEALT', 'LOC_LSHUF_PERSONA_REDEALT', 'LOC_LSHUF_PERSONA_REDEALT_DESC', 30),
  ('LShufDealingValues', 'LSHUF_DEAL_BALANCED', 'LOC_LSHUF_DEAL_BALANCED', 'LOC_LSHUF_DEAL_BALANCED_DESC', 10),
  ('LShufDealingValues', 'LSHUF_DEAL_CHANCE', 'LOC_LSHUF_DEAL_CHANCE', 'LOC_LSHUF_DEAL_CHANCE_DESC', 20),
  ('LShufRevealValues', 'LSHUF_REVEAL_START', 'LOC_LSHUF_REVEAL_START', 'LOC_LSHUF_REVEAL_START_DESC', 10),
  ('LShufRevealValues', 'LSHUF_REVEAL_MET', 'LOC_LSHUF_REVEAL_MET', 'LOC_LSHUF_REVEAL_MET_DESC', 20);

-- Leaders to re-deal: base game and DLC leaders the player has, stored as |LEADER_X| (probe 13).
INSERT OR IGNORE INTO DomainValues (Domain, Value, Name, Description, SortIndex)
SELECT 'LShufLeaderValues', '|' || LeaderType || '|', LeaderName, LeaderName, 100
FROM Leaders
WHERE Domain = 'StandardLeaders' AND LeaderType IN (
    'LEADER_ADA_LOVELACE', 'LEADER_ALEXANDER', 'LEADER_AMINA', 'LEADER_ASHOKA', 'LEADER_ASHOKA_ALT',
    'LEADER_AUGUSTUS', 'LEADER_BENJAMIN_FRANKLIN', 'LEADER_BOLIVAR', 'LEADER_CATHERINE', 'LEADER_CHARLEMAGNE',
    'LEADER_CONFUCIUS', 'LEADER_EDWARD_TEACH', 'LEADER_ELIZABETH', 'LEADER_FRIEDRICH', 'LEADER_FRIEDRICH_ALT',
    'LEADER_GENGHIS_KHAN', 'LEADER_GILGAMESH', 'LEADER_HARRIET_TUBMAN', 'LEADER_HATSHEPSUT', 'LEADER_HIMIKO',
    'LEADER_HIMIKO_ALT', 'LEADER_IBN_BATTUTA', 'LEADER_ISABELLA', 'LEADER_JOSE_RIZAL', 'LEADER_LAFAYETTE',
    'LEADER_LAKSHMIBAI', 'LEADER_MACHIAVELLI', 'LEADER_NAPOLEON', 'LEADER_NAPOLEON_ALT', 'LEADER_PACHACUTI',
    'LEADER_SAYYIDA_AL_HURRA', 'LEADER_TECUMSEH', 'LEADER_TOYOTOMI_HIDEYOSHI', 'LEADER_TRUNG_TRAC',
    'LEADER_WASHINGTON', 'LEADER_XERXES', 'LEADER_XERXES_ALT', 'LEADER_YI_SUN_SIN'
);

-- Modded leaders to re-deal: the listed modded leaders whose mod is installed and enabled.
INSERT OR IGNORE INTO DomainValues (Domain, Value, Name, Description, SortIndex)
SELECT 'LShufModdedLeaderValues', '|' || LeaderType || '|', LeaderName, LeaderName, 100
FROM Leaders
WHERE Domain = 'StandardLeaders' AND LeaderType IN (
    'LEADER_REMILIA', 'LEADER_QINSHIHUANG', 'LEADER_ODA_NOBUNAGA', 'LEADER_Youmu', 'LEADER_MAOZEDONG',
    'LEADER_KingofHeroes', 'LEADER_Houraisan', 'LEADER_MAO_Tanya', 'LEADER_OLGA', 'LEADER_Yuyuko', 'LEADER_Nearl',
    'LEADER_FLAN', 'LEADER_Patchouli', 'LEADER_Bocchi', 'LEADER_MAO_Astolfo', 'LEADER_OKITA_SOUJI', 'LEADER_EIRIN',
    'LEADER_Ema', 'LEADER_Hiro', 'LEADER_Shelly', 'LEADER_Yamada', 'LEADER_Margatroid', 'LEADER_Cirno',
    'LEADER_Akyuu', 'LEADER_Koishi', 'LEADER_WUZETIAN', 'LEADER_Aya'
);

-- Leader pools: every leader the player can pick, base, DLC and modded, stored as plain LEADER_X.
INSERT OR IGNORE INTO DomainValues (Domain, Value, Name, Description, SortIndex)
SELECT 'LShufPoolLeaderValues', LeaderType, LeaderName, LeaderName, 100
FROM Leaders
WHERE Domain = 'StandardLeaders';

-- "Random from pool 1/2" in each slot's leader choice, right after the game's own Random (-1000).
INSERT OR IGNORE INTO DomainValues (Domain, Value, Name, Description, Icon, SortIndex) VALUES
  ('StandardLeaders', 'LSHUF_RANDOM_POOL_1', 'LOC_LSHUF_RANDOM_POOL_1', 'LOC_LSHUF_RANDOM_POOL_1_DESC', 'LEADER_RANDOM', -999),
  ('StandardLeaders', 'LSHUF_RANDOM_POOL_2', 'LOC_LSHUF_RANDOM_POOL_2', 'LOC_LSHUF_RANDOM_POOL_2_DESC', 'LEADER_RANDOM', -998);
