UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_MING' WHERE Slot = 4 AND 'CIVILIZATION_MING' IN (SELECT CivilizationType FROM Civilizations);
