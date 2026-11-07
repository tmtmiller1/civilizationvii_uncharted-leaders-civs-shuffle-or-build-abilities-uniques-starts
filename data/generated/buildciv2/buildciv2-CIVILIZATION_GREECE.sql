UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_GREECE' WHERE Slot = 2 AND 'CIVILIZATION_GREECE' IN (SELECT CivilizationType FROM Civilizations);
