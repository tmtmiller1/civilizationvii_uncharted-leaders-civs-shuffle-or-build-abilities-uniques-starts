UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_SONGHAI' WHERE Slot = 1 AND 'CIVILIZATION_SONGHAI' IN (SELECT CivilizationType FROM Civilizations);
