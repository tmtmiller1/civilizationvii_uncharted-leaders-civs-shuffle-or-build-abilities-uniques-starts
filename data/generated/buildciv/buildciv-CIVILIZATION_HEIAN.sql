UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_HEIAN' WHERE Slot = 1 AND 'CIVILIZATION_HEIAN' IN (SELECT CivilizationType FROM Civilizations);
