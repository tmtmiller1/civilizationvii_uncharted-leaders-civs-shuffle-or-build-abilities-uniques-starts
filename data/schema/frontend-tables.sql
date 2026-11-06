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
