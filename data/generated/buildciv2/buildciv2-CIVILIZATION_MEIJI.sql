UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_MEIJI' WHERE Slot = 2 AND 'CIVILIZATION_MEIJI' IN (SELECT CivilizationType FROM Civilizations);
