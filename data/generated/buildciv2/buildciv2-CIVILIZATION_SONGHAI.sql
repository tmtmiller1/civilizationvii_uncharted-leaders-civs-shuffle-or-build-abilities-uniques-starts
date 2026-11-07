UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_SONGHAI' WHERE Slot = 2 AND 'CIVILIZATION_SONGHAI' IN (SELECT CivilizationType FROM Civilizations);
