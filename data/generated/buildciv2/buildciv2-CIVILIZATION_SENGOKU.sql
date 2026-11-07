UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_SENGOKU' WHERE Slot = 2 AND 'CIVILIZATION_SENGOKU' IN (SELECT CivilizationType FROM Civilizations);
