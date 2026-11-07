UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_GAUL' WHERE Slot = 4 AND 'CIVILIZATION_GAUL' IN (SELECT CivilizationType FROM Civilizations);
