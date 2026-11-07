UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_GREECE' WHERE Slot = 3 AND 'CIVILIZATION_GREECE' IN (SELECT CivilizationType FROM Civilizations);
