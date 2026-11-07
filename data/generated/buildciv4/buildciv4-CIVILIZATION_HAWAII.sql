UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_HAWAII' WHERE Slot = 4 AND 'CIVILIZATION_HAWAII' IN (SELECT CivilizationType FROM Civilizations);
