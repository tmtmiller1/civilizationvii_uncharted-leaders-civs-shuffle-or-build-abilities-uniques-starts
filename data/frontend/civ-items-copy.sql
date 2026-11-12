-- The game's CivilizationItems as shipped, copied when the shell loads and before the mod rewrites the live rows for
-- the civ select (CONTRACTS 14). The setup screen and the game read a civ's shipped rows from here; the copy is taken
-- once, so a reload after the live rows changed keeps the shipped ones.
CREATE TABLE IF NOT EXISTS LShufSetup_CivilizationItems (
  CivilizationDomain TEXT, CivilizationType TEXT, AgeType TEXT, Type TEXT, Kind TEXT, Name TEXT, Description TEXT,
  Icon TEXT, SortIndex INTEGER, CanSyncretize INTEGER
);
INSERT INTO LShufSetup_CivilizationItems (CivilizationDomain, CivilizationType, AgeType, Type, Kind, Name, Description,
  Icon, SortIndex, CanSyncretize)
  SELECT CivilizationDomain, CivilizationType, AgeType, Type, Kind, Name, Description, Icon, SortIndex, CanSyncretize
  FROM CivilizationItems WHERE NOT EXISTS (SELECT 1 FROM LShufSetup_CivilizationItems);
-- Each civilization's attribute tags as shipped (TAG_TRAIT_*, Cultural, Economic...), copied the same way: the
-- screens show the tags a civilization was dealt (CONTRACTS 30) and read the givers' tags from here.
CREATE TABLE IF NOT EXISTS LShufSetup_CivilizationTags (CivilizationDomain TEXT, CivilizationType TEXT, TagType TEXT);
INSERT INTO LShufSetup_CivilizationTags (CivilizationDomain, CivilizationType, TagType)
  SELECT CivilizationDomain, CivilizationType, TagType FROM CivilizationTags WHERE TagType LIKE 'TAG\_TRAIT\_%' ESCAPE '\'
    AND NOT EXISTS (SELECT 1 FROM LShufSetup_CivilizationTags);
