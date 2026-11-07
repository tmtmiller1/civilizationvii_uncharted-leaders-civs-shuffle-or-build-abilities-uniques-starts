UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_MAYA' WHERE Slot = 2 AND 'CIVILIZATION_MAYA' IN (SELECT CivilizationType FROM Civilizations);
