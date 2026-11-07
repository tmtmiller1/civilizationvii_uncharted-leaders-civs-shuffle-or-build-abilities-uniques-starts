UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_MAYA' WHERE Slot = 1 AND 'CIVILIZATION_MAYA' IN (SELECT CivilizationType FROM Civilizations);
