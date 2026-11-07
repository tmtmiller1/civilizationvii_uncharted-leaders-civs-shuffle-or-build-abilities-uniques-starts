UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_PERSIA' WHERE Slot = 2 AND 'CIVILIZATION_PERSIA' IN (SELECT CivilizationType FROM Civilizations);
