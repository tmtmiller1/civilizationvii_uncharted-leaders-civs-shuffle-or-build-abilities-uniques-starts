-- The mod's own gameplay tables. Owned by the lead (CONTRACTS.md section 3); workstreams fill them and don't change
-- their shape. Loaded first, in the game-scope group lshuf-game-schema (LoadOrder 20000). Every statement can run
-- twice: CREATE ... IF NOT EXISTS and INSERT OR IGNORE only.

-- Inputs written by the per-value and per-leader action groups (data/generated/, workstream B).
CREATE TABLE IF NOT EXISTS LShufSeed (Seed INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS LShufOptions (Name TEXT NOT NULL PRIMARY KEY, Value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS LShufKept (LeaderType TEXT NOT NULL PRIMARY KEY);
CREATE TABLE IF NOT EXISTS LShufOut (LeaderType TEXT NOT NULL, Reason TEXT NOT NULL, PRIMARY KEY (LeaderType, Reason));
CREATE TABLE IF NOT EXISTS LShufModOK (LeaderType TEXT NOT NULL PRIMARY KEY);

-- The leaders the mod knows by name (shared/lshuf-known-leaders.js), written by workstream B's generator.
CREATE TABLE IF NOT EXISTS LShufKnownLeaders (LeaderType TEXT NOT NULL PRIMARY KEY, IsModded INTEGER NOT NULL, ModId TEXT);

-- Attribute traits and what goes with each.
CREATE TABLE IF NOT EXISTS LShufAttributeTraits (
  TraitType TEXT NOT NULL PRIMARY KEY,
  AttributeType TEXT NOT NULL,
  TagType TEXT NOT NULL
);
INSERT OR IGNORE INTO LShufAttributeTraits (TraitType, AttributeType, TagType) VALUES
  ('TRAIT_LEADER_ATTRIBUTE_CULTURAL', 'ATTRIBUTE_CULTURAL', 'TAG_TRAIT_CULTURAL'),
  ('TRAIT_LEADER_ATTRIBUTE_ECONOMIC', 'ATTRIBUTE_ECONOMIC', 'TAG_TRAIT_ECONOMIC'),
  ('TRAIT_LEADER_ATTRIBUTE_EXPANSIONIST', 'ATTRIBUTE_EXPANSIONIST', 'TAG_TRAIT_EXPANSIONIST'),
  ('TRAIT_LEADER_ATTRIBUTE_MILITARISTIC', 'ATTRIBUTE_MILITARISTIC', 'TAG_TRAIT_MILITARISTIC'),
  ('TRAIT_LEADER_ATTRIBUTE_POLITICAL', 'ATTRIBUTE_POLITICAL', 'TAG_TRAIT_POLITICAL'),
  ('TRAIT_LEADER_ATTRIBUTE_SCIENTIFIC', 'ATTRIBUTE_SCIENTIFIC', 'TAG_TRAIT_SCIENTIFIC'),
  ('TRAIT_LEADER_ATTRIBUTE_WILDCARD', 'ATTRIBUTE_WILDCARD', 'TAG_TRAIT_WILDCARD');

-- The mapping (workstream A fills these from data/mapping/lshuf-mapping.sql; the same file loads into config).
CREATE TABLE IF NOT EXISTS LShufMapping (
  PieceId TEXT NOT NULL PRIMARY KEY,
  LeaderType TEXT NOT NULL,
  AbilityTrait TEXT NOT NULL,
  Kind TEXT NOT NULL,
  BulletIndex INTEGER,
  -- A piece covers bullets BulletIndex .. BulletIndex + BulletCount - 1: bullets one effect serves together are one
  -- piece (scripts/mapping/merge-pieces.mjs), so nothing is ever dealt that does nothing on its own.
  BulletCount INTEGER NOT NULL DEFAULT 1,
  -- The bullets of a piece whose bullets aren't next to each other, joined by '|' ('1|3|4'); NULL means the range
  -- above. Yi Sun-sin's Fleet Commander bullets are one piece this way (CONTRACTS 23 R5).
  BulletList TEXT,
  BulletText TEXT,
  BiasTags TEXT,
  Value INTEGER NOT NULL DEFAULT 1,
  SpecificTo TEXT,
  Movable INTEGER NOT NULL DEFAULT 1,
  Reviewed INTEGER NOT NULL DEFAULT 0,
  Guess INTEGER NOT NULL DEFAULT 1,
  IsModded INTEGER NOT NULL DEFAULT 0,
  ModId TEXT,
  Note TEXT
);
CREATE TABLE IF NOT EXISTS LShufMappingModifiers (
  PieceId TEXT NOT NULL,
  ModifierId TEXT NOT NULL,
  Role TEXT NOT NULL DEFAULT 'effect',
  PRIMARY KEY (PieceId, ModifierId)
);
CREATE TABLE IF NOT EXISTS LShufMappingUnlocks (
  ProgressionTreeNodeType TEXT NOT NULL,
  TargetType TEXT NOT NULL,
  RequiredTraitType TEXT NOT NULL,
  ProgressionTree TEXT,
  PieceId TEXT,
  PRIMARY KEY (ProgressionTreeNodeType, TargetType)
);
CREATE TABLE IF NOT EXISTS LShufReviewedSets (AbilityTrait TEXT NOT NULL PRIMARY KEY, ModifierSet TEXT NOT NULL);

-- Results: what the deal gave each leader. Filled by workstream B's deal SQL; read by workstream D's game scripts.
-- computeDeal() in shared/deal/lshuf-deal.js returns the same rows, column for column.
CREATE TABLE IF NOT EXISTS LShufResultLeaders (
  LeaderType TEXT NOT NULL PRIMARY KEY,
  Status TEXT NOT NULL,
  Axes TEXT,
  Reason TEXT,
  AbilityFrom TEXT,
  PersonaFrom TEXT,
  BiasFrom TEXT
);
CREATE TABLE IF NOT EXISTS LShufResultPieces (
  LeaderType TEXT NOT NULL,
  PieceId TEXT NOT NULL,
  FromLeaderType TEXT NOT NULL,
  Kind TEXT NOT NULL,
  SortIndex INTEGER NOT NULL,
  PRIMARY KEY (LeaderType, PieceId)
);
-- Copy is 0 for a leader's first card of a kind, 1 for its second, and so on; copy n > 0 is applied as
-- TRAIT_LSHUF_EXTRA<n>_<TraitType> (CONTRACTS section 5.3).
CREATE TABLE IF NOT EXISTS LShufResultAttributes (
  LeaderType TEXT NOT NULL,
  TraitType TEXT NOT NULL,
  FromLeaderType TEXT,
  Copy INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (LeaderType, TraitType, Copy)
);
CREATE TABLE IF NOT EXISTS LShufResultBiases (
  TableName TEXT NOT NULL,
  LeaderType TEXT,
  CivilizationType TEXT,
  TargetType TEXT,
  Score INTEGER NOT NULL,
  Origin TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS LShufResultUnlocks (
  ProgressionTreeNodeType TEXT NOT NULL,
  TargetType TEXT NOT NULL,
  FromTraitType TEXT NOT NULL,
  ToLeaderType TEXT,
  ToTraitType TEXT,
  PRIMARY KEY (ProgressionTreeNodeType, TargetType)
);
CREATE TABLE IF NOT EXISTS LShufResultMeta (Name TEXT NOT NULL PRIMARY KEY, Value TEXT);

-- Build your own leader (CONTRACTS section 13): the builder and the cards it took, written by config-gated groups.
CREATE TABLE IF NOT EXISTS LShufBuild (Slot INTEGER PRIMARY KEY, LeaderType TEXT NOT NULL, CivilizationType TEXT);
CREATE TABLE IF NOT EXISTS LShufBuildPieces (Slot INTEGER NOT NULL, PieceId TEXT NOT NULL, PRIMARY KEY (Slot, PieceId));

-- Civilization builds (CONTRACTS section 14): what each built civilization holds after the deal. Kind is 'ability'
-- (FromCivilization's ability trait) or 'unique' (one unit, building, quarter or improvement type, in PieceId).
CREATE TABLE IF NOT EXISTS LShufResultCivPieces (
  CivilizationType TEXT NOT NULL,
  PieceId TEXT NOT NULL,
  FromCivilization TEXT NOT NULL,
  Kind TEXT NOT NULL,
  SortIndex INTEGER NOT NULL,
  PRIMARY KEY (CivilizationType, PieceId)
);
