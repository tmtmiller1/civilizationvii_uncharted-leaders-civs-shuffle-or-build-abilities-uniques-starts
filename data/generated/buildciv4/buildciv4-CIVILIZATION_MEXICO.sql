UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_MEXICO' WHERE Slot = 4 AND 'CIVILIZATION_MEXICO' IN (SELECT CivilizationType FROM Civilizations);
