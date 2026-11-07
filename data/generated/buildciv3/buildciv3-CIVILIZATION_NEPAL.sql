UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_NEPAL' WHERE Slot = 3 AND 'CIVILIZATION_NEPAL' IN (SELECT CivilizationType FROM Civilizations);
