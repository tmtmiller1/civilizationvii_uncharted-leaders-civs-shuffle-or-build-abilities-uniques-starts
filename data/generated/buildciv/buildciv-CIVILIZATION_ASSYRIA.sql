UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_ASSYRIA' WHERE Slot = 1 AND 'CIVILIZATION_ASSYRIA' IN (SELECT CivilizationType FROM Civilizations);
