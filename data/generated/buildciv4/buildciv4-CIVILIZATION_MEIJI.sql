UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_MEIJI' WHERE Slot = 4 AND 'CIVILIZATION_MEIJI' IN (SELECT CivilizationType FROM Civilizations);
