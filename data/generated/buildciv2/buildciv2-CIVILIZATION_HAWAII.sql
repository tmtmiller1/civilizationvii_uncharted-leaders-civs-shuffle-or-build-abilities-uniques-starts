UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_HAWAII' WHERE Slot = 2 AND 'CIVILIZATION_HAWAII' IN (SELECT CivilizationType FROM Civilizations);
