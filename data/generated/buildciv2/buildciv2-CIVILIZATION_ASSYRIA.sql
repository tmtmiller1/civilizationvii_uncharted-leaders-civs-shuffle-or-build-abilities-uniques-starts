UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_ASSYRIA' WHERE Slot = 2 AND 'CIVILIZATION_ASSYRIA' IN (SELECT CivilizationType FROM Civilizations);
