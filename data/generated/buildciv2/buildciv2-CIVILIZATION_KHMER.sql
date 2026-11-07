UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_KHMER' WHERE Slot = 2 AND 'CIVILIZATION_KHMER' IN (SELECT CivilizationType FROM Civilizations);
