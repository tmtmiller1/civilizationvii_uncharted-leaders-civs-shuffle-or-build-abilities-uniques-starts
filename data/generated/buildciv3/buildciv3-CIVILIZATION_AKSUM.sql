UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_AKSUM' WHERE Slot = 3 AND 'CIVILIZATION_AKSUM' IN (SELECT CivilizationType FROM Civilizations);
