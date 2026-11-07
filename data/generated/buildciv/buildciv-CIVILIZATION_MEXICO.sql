UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_MEXICO' WHERE Slot = 1 AND 'CIVILIZATION_MEXICO' IN (SELECT CivilizationType FROM Civilizations);
