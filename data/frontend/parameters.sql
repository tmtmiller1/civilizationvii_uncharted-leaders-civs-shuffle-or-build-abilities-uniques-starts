-- Setup parameters for Re-dealable Leaders (CONTRACTS.md section 2). Shell scope, group lshuf-shell, LoadOrder 20000,
-- so leader mods have added their frontend Leaders rows first.
--
-- The nine main options are ordinary rows in a section of their own, "Re-dealable Leaders Settings", drawn by the game
-- like Triumph Settings or Difficulty Settings (one ParameterGroups row, used in single player and the lobby), and
-- ui/setup/lshuf-setup-accordion.js adds an "Advanced settings..." button right after them. The rest are Hidden = 1:
-- the advanced window reads and writes them with GameSetup. All of them save with the game,
-- travel through the lobby and gate data with ConfigurationValueMatches. (CONTRACTS section 12, items 5 and 6.)
--
-- The leader domains select through the frontend Leaders table, so a DLC or a leader mod the player doesn't have
-- isn't listed. The two leader lists below mirror VANILLA_LEADERS and MODDED_LEADER_TYPES in
-- shared/lshuf-known-leaders.js; keep them the same when that file changes.

-- The section goes in before the parameters that name it: Parameters.GroupID is a foreign key to ParameterGroups and
-- the game checks it per statement, so the other order fails this file and rolls back every mod's setup data.
INSERT OR IGNORE INTO ParameterGroups (GroupID, Name) VALUES ('LShufOptions', 'LOC_LSHUF_SECTION_TITLE');

INSERT OR IGNORE INTO Parameters (ParameterID, Name, Description, Domain, Array, DefaultValue, ConfigurationGroup,
  ConfigurationKey, GroupID, Hidden, ReadOnly, SupportsSinglePlayer, SupportsLANMultiplayer, SupportsInternetMultiplayer,
  SupportsHotseatMultiplayer, ChangeableAfterGameStart, UxHint, SortIndex)
VALUES
  ('LShufMode', 'LOC_LSHUF_MODE_NAME', 'LOC_LSHUF_MODE_DESC', 'LShufModeValues', 0, 'LSHUF_MODE_NONE', 'Game', 'LShufMode', 'LShufOptions', 0, 0, 1, 1, 1, 1, 0, NULL, 2300),
  ('LShufBiases', 'LOC_LSHUF_BIASES_NAME', 'LOC_LSHUF_BIASES_DESC', 'LShufBValues', 0, 'LSHUF_B_NORMAL', 'Game', 'LShufBiases', 'LShufOptions', 0, 0, 1, 1, 1, 1, 0, NULL, 2303),
  ('LShufCivMode', 'LOC_LSHUF_CIV_MODE_NAME', 'LOC_LSHUF_CIV_MODE_DESC', 'LShufCivModeValues', 0, 'LSHUF_CM_NORMAL', 'Game', 'LShufCivMode', 'LShufOptions', 0, 0, 1, 1, 1, 1, 0, NULL, 2304),
  ('LShufCivAbilities', 'LOC_LSHUF_CIV_ABILITIES_NAME', 'LOC_LSHUF_CIV_ABILITIES_DESC', 'LShufCAValues', 0, 'LSHUF_CA_NORMAL', 'Game', 'LShufCivAbilities', 'LShufOptions', 0, 0, 1, 1, 1, 1, 0, NULL, 2305),
  ('LShufCivUniques', 'LOC_LSHUF_CIV_UNIQUES_NAME', 'LOC_LSHUF_CIV_UNIQUES_DESC', 'LShufCUValues', 0, 'LSHUF_CU_NORMAL', 'Game', 'LShufCivUniques', 'LShufOptions', 0, 0, 1, 1, 1, 1, 0, NULL, 2306),
  ('LShufCivCivics', 'LOC_LSHUF_CIV_CIVICS_NAME', 'LOC_LSHUF_CIV_CIVICS_DESC', 'LShufCCValues', 0, 'LSHUF_CC_NORMAL', 'Game', 'LShufCivCivics', 'LShufOptions', 0, 0, 1, 1, 1, 1, 0, NULL, 2307),
  ('LShufAbilities', 'LOC_LSHUF_ABILITIES_NAME', 'LOC_LSHUF_ABILITIES_DESC', 'LShufAValues', 0, 'LSHUF_A_NORMAL', 'Game', 'LShufAbilities', 'LShufOptions', 0, 0, 1, 1, 1, 1, 0, NULL, 2301),
  ('LShufAttributes', 'LOC_LSHUF_ATTRIBUTES_NAME', 'LOC_LSHUF_ATTRIBUTES_DESC', 'LShufTValues', 0, 'LSHUF_T_NORMAL', 'Game', 'LShufAttributes', 'LShufOptions', 0, 0, 1, 1, 1, 1, 0, NULL, 2302),
  ('LShufKeepMine', 'LOC_LSHUF_KEEP_MINE_NAME', 'LOC_LSHUF_KEEP_MINE_DESC', 'bool', 0, 0, 'Game', 'LShufKeepMine', 'LShufOptions', 0, 0, 1, 1, 1, 1, 0, NULL, 2309),
  ('LShufKeepBuiltCiv', 'LOC_LSHUF_KEEP_BUILT_CIV_NAME', 'LOC_LSHUF_KEEP_BUILT_CIV_DESC', 'bool', 0, 1, 'Game', 'LShufKeepBuiltCiv', 'LShufOptions', 0, 0, 1, 1, 1, 1, 0, NULL, 2310),
  ('LShufLeadersOut', 'LOC_LSHUF_LEADERS_OUT_NAME', 'LOC_LSHUF_LEADERS_OUT_DESC', 'LShufLeaderValues', 1, NULL, 'Game', 'LShufExcludedLeaders', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, 'InvertSelection', 2305),
  ('LShufModdedAbilities', 'LOC_LSHUF_MODDED_ABILITIES_NAME', 'LOC_LSHUF_MODDED_ABILITIES_DESC', 'bool', 0, 0, 'Game', 'LShufModdedAbilities', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2306),
  ('LShufModdedAttributes', 'LOC_LSHUF_MODDED_ATTRIBUTES_NAME', 'LOC_LSHUF_MODDED_ATTRIBUTES_DESC', 'bool', 0, 0, 'Game', 'LShufModdedAttributes', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2307),
  ('LShufModdedBiases', 'LOC_LSHUF_MODDED_BIASES_NAME', 'LOC_LSHUF_MODDED_BIASES_DESC', 'bool', 0, 0, 'Game', 'LShufModdedBiases', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2308),
  ('LShufModdedOut', 'LOC_LSHUF_MODDED_OUT_NAME', 'LOC_LSHUF_MODDED_OUT_DESC', 'LShufModdedLeaderValues', 1, NULL, 'Game', 'LShufExcludedModdedLeaders', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, 'InvertSelection', 2309),
  ('LShufLeaderPoolOut', 'LOC_LSHUF_POOL_NAME', 'LOC_LSHUF_POOL_DESC', 'LShufPoolLeaderValues', 1, NULL, 'Game', 'LShufLeaderPoolOut', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, 'InvertSelection', 2310),
  ('LShufPersonality', 'LOC_LSHUF_PERSONALITY_NAME', 'LOC_LSHUF_PERSONALITY_DESC', 'LShufPersonalityValues', 0, 'LSHUF_PERSONA_FOLLOWS', 'Game', 'LShufPersonality', 'LShufOptions', 0, 0, 1, 1, 1, 1, 0, NULL, 2308),
  ('LShufDealing', 'LOC_LSHUF_DEALING_NAME', 'LOC_LSHUF_DEALING_DESC', 'LShufDealingValues', 0, 'LSHUF_DEAL_BALANCED', 'Game', 'LShufDealing', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2312),
  ('LShufReveal', 'LOC_LSHUF_REVEAL_NAME', 'LOC_LSHUF_REVEAL_DESC', 'LShufRevealValues', 0, 'LSHUF_REVEAL_START', 'Game', 'LShufReveal', 'LShufOptions', 0, 0, 1, 1, 1, 1, 0, NULL, 2311),
  ('LShufSeed', 'LOC_LSHUF_SEED_NAME', 'LOC_LSHUF_SEED_DESC', 'text', 0, '1', 'Game', 'LShufSeed', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2314),
  ('LShufCivsOut', 'LOC_LSHUF_CIVS_OUT_NAME', 'LOC_LSHUF_CIVS_OUT_DESC', 'LShufCivValues', 1, NULL, 'Game', 'LShufExcludedCivs', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, 'InvertSelection', 2315),
  ('LShufBuildPicks', 'LOC_LSHUF_BUILD_TITLE', 'LOC_LSHUF_BUILD_INTRO', 'text', 0, NULL, 'Game', 'LShufBuildPicks', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2316),
  ('LShufBuildPicks2', 'LOC_LSHUF_BUILD_TITLE', 'LOC_LSHUF_BUILD_INTRO', 'text', 0, NULL, 'Game', 'LShufBuildPicks2', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2317),
  ('LShufBuildFor2', 'LOC_LSHUF_BUILD_FOR', 'LOC_LSHUF_BUILD_INTRO', 'text', 0, NULL, 'Game', 'LShufBuildFor2', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2318),
  ('LShufBuildPicks3', 'LOC_LSHUF_BUILD_TITLE', 'LOC_LSHUF_BUILD_INTRO', 'text', 0, NULL, 'Game', 'LShufBuildPicks3', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2319),
  ('LShufBuildFor3', 'LOC_LSHUF_BUILD_FOR', 'LOC_LSHUF_BUILD_INTRO', 'text', 0, NULL, 'Game', 'LShufBuildFor3', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2320),
  ('LShufBuildPicks4', 'LOC_LSHUF_BUILD_TITLE', 'LOC_LSHUF_BUILD_INTRO', 'text', 0, NULL, 'Game', 'LShufBuildPicks4', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2321),
  ('LShufBuildFor4', 'LOC_LSHUF_BUILD_FOR', 'LOC_LSHUF_BUILD_INTRO', 'text', 0, NULL, 'Game', 'LShufBuildFor4', 'GameOptions', 1, 0, 1, 1, 1, 1, 0, NULL, 2322);

-- Values of the select options, in the order the window lists them.
INSERT OR IGNORE INTO DomainValues (Domain, Value, Name, Description, SortIndex) VALUES
  ('LShufModeValues', 'LSHUF_MODE_NONE', 'LOC_LSHUF_MODE_NONE', 'LOC_LSHUF_MODE_NONE_DESC', 10),
  ('LShufModeValues', 'LSHUF_MODE_SWAP_ABILITIES', 'LOC_LSHUF_MODE_SWAP_ABILITIES', 'LOC_LSHUF_MODE_SWAP_ABILITIES_DESC', 30),
  ('LShufModeValues', 'LSHUF_MODE_SWAP_LEADERS', 'LOC_LSHUF_MODE_SWAP_LEADERS', 'LOC_LSHUF_MODE_SWAP_LEADERS_DESC', 20),
  ('LShufModeValues', 'LSHUF_MODE_SPLIT_MATCHED', 'LOC_LSHUF_MODE_SPLIT_MATCHED', 'LOC_LSHUF_MODE_SPLIT_MATCHED_DESC', 40),
  ('LShufModeValues', 'LSHUF_MODE_SPLIT_RANDOM', 'LOC_LSHUF_MODE_SPLIT_RANDOM', 'LOC_LSHUF_MODE_SPLIT_RANDOM_DESC', 50),
  ('LShufModeValues', 'LSHUF_MODE_CUSTOM', 'LOC_LSHUF_MODE_CUSTOM', 'LOC_LSHUF_MODE_CUSTOM_DESC', 60),
  ('LShufCivModeValues', 'LSHUF_CM_NORMAL', 'LOC_LSHUF_CM_NORMAL', 'LOC_LSHUF_CM_NORMAL_DESC', 10),
  ('LShufCivModeValues', 'LSHUF_CM_WHOLE', 'LOC_LSHUF_CM_WHOLE', 'LOC_LSHUF_CM_WHOLE_DESC', 20),
  ('LShufCivModeValues', 'LSHUF_CM_PARTIAL', 'LOC_LSHUF_CM_PARTIAL', 'LOC_LSHUF_CM_PARTIAL_DESC', 30),
  ('LShufCivModeValues', 'LSHUF_CM_SPLIT', 'LOC_LSHUF_CM_SPLIT', 'LOC_LSHUF_CM_SPLIT_DESC', 40),
  ('LShufCivModeValues', 'LSHUF_CM_CUSTOM', 'LOC_LSHUF_CM_CUSTOM', 'LOC_LSHUF_CM_CUSTOM_DESC', 50),
  ('LShufAValues', 'LSHUF_A_NORMAL', 'LOC_LSHUF_A_NORMAL', 'LOC_LSHUF_A_NORMAL_DESC', 10),
  ('LShufAValues', 'LSHUF_A_WHOLE', 'LOC_LSHUF_A_WHOLE', 'LOC_LSHUF_A_WHOLE_DESC', 20),
  ('LShufAValues', 'LSHUF_A_SPLIT', 'LOC_LSHUF_A_SPLIT', 'LOC_LSHUF_A_SPLIT_DESC', 30),
  ('LShufAValues', 'LSHUF_OFF', 'LOC_LSHUF_OFF', 'LOC_LSHUF_OFF_DESC', 40),
  ('LShufTValues', 'LSHUF_T_NORMAL', 'LOC_LSHUF_T_NORMAL', 'LOC_LSHUF_T_NORMAL_DESC', 10),
  ('LShufTValues', 'LSHUF_T_RANDOM', 'LOC_LSHUF_T_RANDOM', 'LOC_LSHUF_T_RANDOM_DESC', 20),
  ('LShufTValues', 'LSHUF_T_PAIRED', 'LOC_LSHUF_T_PAIRED', 'LOC_LSHUF_T_PAIRED_DESC', 30),
  ('LShufTValues', 'LSHUF_OFF', 'LOC_LSHUF_OFF', 'LOC_LSHUF_OFF_DESC', 40),
  ('LShufBValues', 'LSHUF_B_NORMAL', 'LOC_LSHUF_B_NORMAL', 'LOC_LSHUF_B_NORMAL_DESC', 10),
  ('LShufBValues', 'LSHUF_B_MATCHED', 'LOC_LSHUF_B_MATCHED', 'LOC_LSHUF_B_MATCHED_DESC', 20),
  ('LShufBValues', 'LSHUF_B_PAIRED', 'LOC_LSHUF_B_PAIRED', 'LOC_LSHUF_B_PAIRED_DESC', 30),
  ('LShufBValues', 'LSHUF_B_ROLLED', 'LOC_LSHUF_B_ROLLED', 'LOC_LSHUF_B_ROLLED_DESC', 40),
  ('LShufBValues', 'LSHUF_OFF', 'LOC_LSHUF_OFF', 'LOC_LSHUF_OFF_DESC', 50),
  ('LShufCAValues', 'LSHUF_CA_NORMAL', 'LOC_LSHUF_CA_NORMAL', 'LOC_LSHUF_CA_NORMAL_DESC', 10),
  ('LShufCAValues', 'LSHUF_CA_SWAPPED', 'LOC_LSHUF_CA_SWAPPED', 'LOC_LSHUF_CA_SWAPPED_DESC', 20),
  ('LShufCAValues', 'LSHUF_CA_SPLIT', 'LOC_LSHUF_CA_SPLIT', 'LOC_LSHUF_CA_SPLIT_DESC', 25),
  ('LShufCAValues', 'LSHUF_OFF', 'LOC_LSHUF_OFF', 'LOC_LSHUF_OFF_DESC', 30),
  ('LShufCUValues', 'LSHUF_CU_NORMAL', 'LOC_LSHUF_CU_NORMAL', 'LOC_LSHUF_CU_NORMAL_DESC', 10),
  ('LShufCUValues', 'LSHUF_CU_PAIRED', 'LOC_LSHUF_CU_PAIRED', 'LOC_LSHUF_CU_PAIRED_DESC', 20),
  ('LShufCUValues', 'LSHUF_CU_SHUFFLED', 'LOC_LSHUF_CU_SHUFFLED', 'LOC_LSHUF_CU_SHUFFLED_DESC', 30),
  ('LShufCUValues', 'LSHUF_CU_SPLIT', 'LOC_LSHUF_CU_SPLIT', 'LOC_LSHUF_CU_SPLIT_DESC', 35),
  ('LShufCUValues', 'LSHUF_OFF', 'LOC_LSHUF_OFF', 'LOC_LSHUF_OFF_DESC', 40),
  ('LShufCCValues', 'LSHUF_CC_NORMAL', 'LOC_LSHUF_CC_NORMAL', 'LOC_LSHUF_CC_NORMAL_DESC', 10),
  ('LShufCCValues', 'LSHUF_CC_PAIRED', 'LOC_LSHUF_CC_PAIRED', 'LOC_LSHUF_CC_PAIRED_DESC', 20),
  ('LShufCCValues', 'LSHUF_CC_SHUFFLED', 'LOC_LSHUF_CC_SHUFFLED', 'LOC_LSHUF_CC_SHUFFLED_DESC', 30),
  ('LShufCCValues', 'LSHUF_CC_SPLIT', 'LOC_LSHUF_CC_SPLIT', 'LOC_LSHUF_CC_SPLIT_DESC', 35),
  ('LShufCCValues', 'LSHUF_OFF', 'LOC_LSHUF_OFF', 'LOC_LSHUF_OFF_DESC', 40),
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

-- The Leader pool: every leader the player can pick, base, DLC and modded, stored as plain LEADER_X. Random slots
-- only draw ticked leaders (the parameter stores the unticked ones).
INSERT OR IGNORE INTO DomainValues (Domain, Value, Name, Description, SortIndex)
SELECT 'LShufPoolLeaderValues', LeaderType, LeaderName, LeaderName, 100
FROM Leaders
WHERE Domain = 'StandardLeaders';

-- Civilizations in the game: every age's civilizations the player has, one value each, stored as |CIVILIZATION_X|.
-- Selected through the frontend Civilizations table, so a DLC or modded civ is listed only when it's there.
INSERT OR IGNORE INTO DomainValues (Domain, Value, Name, Description, SortIndex)
SELECT 'LShufCivValues', '|' || CivilizationType || '|', MIN(CivilizationName), MIN(CivilizationName), 100
FROM Civilizations
WHERE CivilizationType <> 'RANDOM'
GROUP BY CivilizationType;
