UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_ASSYRIA' WHERE Slot = 4 AND 'CIVILIZATION_ASSYRIA' IN (SELECT CivilizationType FROM Civilizations);
