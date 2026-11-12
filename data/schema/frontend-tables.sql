-- Setup-side copies of the gameplay rows the deal reads (CONTRACTS.md section 4.2). Owned by the lead; workstream D's
-- generator fills them (data/setup-copy/setup-copy.sql). The shell group also loads gameplay-tables.sql, so the
-- mapping, known-leader and attribute tables exist in config too.
--
-- Each LShufSetup_<Table> has the same name and the same columns as the gameplay table <Table>, keeping only the
-- columns the deal reads. buildDealInput(readTable, ...) reads either side through the same names.

CREATE TABLE IF NOT EXISTS LShufSetup_Leaders (LeaderType TEXT NOT NULL, IsMajorLeader INTEGER, InheritFrom TEXT);
CREATE TABLE IF NOT EXISTS LShufSetup_LeaderTraits (LeaderType TEXT NOT NULL, TraitType TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS LShufSetup_Traits (TraitType TEXT NOT NULL, Name TEXT, Description TEXT);
CREATE TABLE IF NOT EXISTS LShufSetup_TraitModifiers (TraitType TEXT NOT NULL, ModifierId TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS LShufSetup_Modifiers (
  ModifierId TEXT NOT NULL,
  ModifierType TEXT,
  OwnerRequirementSetId TEXT,
  SubjectRequirementSetId TEXT
);
CREATE TABLE IF NOT EXISTS LShufSetup_RequirementSetRequirements (RequirementSetId TEXT NOT NULL, RequirementId TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS LShufSetup_Requirements (RequirementId TEXT NOT NULL, RequirementType TEXT);
CREATE TABLE IF NOT EXISTS LShufSetup_LegacyCivilizations (CivilizationType TEXT NOT NULL, Age TEXT);
CREATE TABLE IF NOT EXISTS LShufSetup_LeaderCivPriorities (Leader TEXT NOT NULL, Civilization TEXT NOT NULL, Priority INTEGER);
-- Each leader's agenda name keys (ModifierStrings Name rows of its ability's agenda modifiers), so the build screen
-- can say what an AI behavior card holds: LOC_DIPLOMACY_AGENDA_<X>_NAME, with _DESC, _DESC_LIKES and _DESC_DISLIKES
-- alongside it in the game's text.
CREATE TABLE IF NOT EXISTS LShufSetup_LeaderAgendas (LeaderType TEXT NOT NULL, NameKey TEXT NOT NULL);
-- The game's own name key for each start-bias target (biomes, terrains, feature classes, resources), so the setup
-- side names "Starts near" the way the game does instead of guessing a key.
CREATE TABLE IF NOT EXISTS LShufSetup_TypeNames (Type TEXT NOT NULL, Name TEXT NOT NULL);
-- The diplomatic actions each attribute trait unlocks (its UNLOCK modifiers' ActionType), with the action's name key.
CREATE TABLE IF NOT EXISTS LShufSetup_AttributeActions (TraitType TEXT NOT NULL, ActionType TEXT NOT NULL, ActionNameKey TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS LShufSetup_ProgressionTreeNodeUnlocks (
  ProgressionTreeNodeType TEXT NOT NULL,
  TargetType TEXT NOT NULL,
  TargetKind TEXT,
  RequiredTraitType TEXT
);
CREATE TABLE IF NOT EXISTS LShufSetup_ProgressionTreeNodes (ProgressionTreeNodeType TEXT NOT NULL, ProgressionTree TEXT);
CREATE TABLE IF NOT EXISTS LShufSetup_Attributes (AttributeType TEXT NOT NULL, ProgressionTreeType TEXT);

CREATE TABLE IF NOT EXISTS LShufSetup_StartBiasBiomes (CivilizationType TEXT, LeaderType TEXT, BiomeType TEXT, Score INTEGER);
CREATE TABLE IF NOT EXISTS LShufSetup_StartBiasTerrains (CivilizationType TEXT, LeaderType TEXT, TerrainType TEXT, Score INTEGER);
CREATE TABLE IF NOT EXISTS LShufSetup_StartBiasAdjacentToCoasts (CivilizationType TEXT, LeaderType TEXT, Score INTEGER);
CREATE TABLE IF NOT EXISTS LShufSetup_StartBiasFeatureClasses (
  CivilizationType TEXT,
  LeaderType TEXT,
  FeatureClassType TEXT,
  Score INTEGER
);
CREATE TABLE IF NOT EXISTS LShufSetup_StartBiasRivers (CivilizationType TEXT, LeaderType TEXT, Score INTEGER);
CREATE TABLE IF NOT EXISTS LShufSetup_StartBiasLakes (CivilizationType TEXT, LeaderType TEXT, Score INTEGER);
CREATE TABLE IF NOT EXISTS LShufSetup_StartBiasNaturalWonders (CivilizationType TEXT, LeaderType TEXT, Score INTEGER);
CREATE TABLE IF NOT EXISTS LShufSetup_StartBiasIslands (CivilizationType TEXT, LeaderType TEXT, Score INTEGER);
CREATE TABLE IF NOT EXISTS LShufSetup_StartBiasResources (CivilizationType TEXT, LeaderType TEXT, ResourceType TEXT, Score INTEGER);

-- Each civilization's ability and uniques for the civ build screen (CONTRACTS 14): from the gameplay data, so the
-- card list matches what the deal can move. Kind: 'ability', 'unit', 'building', 'quarter', 'improvement'.
-- Each civilization's unique civics tree: its nodes and what they unlock (CONTRACTS 18), for the civics card text.
-- Each unique quarter's two buildings (CONTRACTS 21), filled by data/setup-copy/setup-copy-quarters.sql.
CREATE TABLE IF NOT EXISTS LShufSetup_UniqueQuarters (
  QuarterType TEXT NOT NULL PRIMARY KEY,
  BuildingType1 TEXT NOT NULL,
  BuildingType2 TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS LShufSetup_CivCivics (
  CivilizationType TEXT NOT NULL,
  NodeType TEXT NOT NULL,
  NodeNameKey TEXT,
  UnlockType TEXT,
  UnlockKind TEXT,
  UnlockNameKey TEXT
);
-- The nodes of each civilization's civics tree, for the tree drawn on the civ build screen (CONTRACTS 18): Depth is
-- the longest prerequisite chain before the node, Prereqs its prerequisite nodes joined by '|'.
CREATE TABLE IF NOT EXISTS LShufSetup_CivicNodes (
  CivilizationType TEXT NOT NULL,
  NodeType TEXT NOT NULL,
  NameKey TEXT,
  Cost INTEGER,
  Depth INTEGER NOT NULL DEFAULT 0,
  Prereqs TEXT
);
-- Cards that travel with another card (CONTRACTS 23): Kind 'civic' (CIVNODE_ ids, civics that need each other) or
-- 'unique' (CIVUNQ_ ids, an improvement only one unit card builds). A rider isn't a card of its own.
CREATE TABLE IF NOT EXISTS LShufSetup_CivRiders (
  Kind TEXT NOT NULL,
  CivilizationType TEXT NOT NULL,
  LeadId TEXT NOT NULL,
  RiderId TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS LShufSetup_CivItems (
  CivilizationType TEXT NOT NULL,
  Age TEXT,
  Kind TEXT NOT NULL,
  Type TEXT NOT NULL,
  NameKey TEXT,
  DescKey TEXT,
  TraitType TEXT
);
