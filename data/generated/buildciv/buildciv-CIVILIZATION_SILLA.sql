UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_SILLA' WHERE Slot = 1 AND 'CIVILIZATION_SILLA' IN (SELECT CivilizationType FROM Civilizations);
