UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_RUSSIA' WHERE Slot = 3 AND 'CIVILIZATION_RUSSIA' IN (SELECT CivilizationType FROM Civilizations);
