UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_RUSSIA' WHERE Slot = 2 AND 'CIVILIZATION_RUSSIA' IN (SELECT CivilizationType FROM Civilizations);
