UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_MEIJI' WHERE Slot = 3 AND 'CIVILIZATION_MEIJI' IN (SELECT CivilizationType FROM Civilizations);
