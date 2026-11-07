UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_GAUL' WHERE Slot = 3 AND 'CIVILIZATION_GAUL' IN (SELECT CivilizationType FROM Civilizations);
