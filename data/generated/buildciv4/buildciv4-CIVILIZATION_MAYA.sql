UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_MAYA' WHERE Slot = 4 AND 'CIVILIZATION_MAYA' IN (SELECT CivilizationType FROM Civilizations);
