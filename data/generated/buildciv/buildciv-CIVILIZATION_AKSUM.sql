UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_AKSUM' WHERE Slot = 1 AND 'CIVILIZATION_AKSUM' IN (SELECT CivilizationType FROM Civilizations);
