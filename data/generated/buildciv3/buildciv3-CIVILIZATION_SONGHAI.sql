UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_SONGHAI' WHERE Slot = 3 AND 'CIVILIZATION_SONGHAI' IN (SELECT CivilizationType FROM Civilizations);
