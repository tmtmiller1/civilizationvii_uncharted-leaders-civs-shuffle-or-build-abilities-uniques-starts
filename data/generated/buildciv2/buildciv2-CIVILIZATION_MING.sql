UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_MING' WHERE Slot = 2 AND 'CIVILIZATION_MING' IN (SELECT CivilizationType FROM Civilizations);
