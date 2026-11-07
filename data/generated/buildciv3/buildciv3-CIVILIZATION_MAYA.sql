UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_MAYA' WHERE Slot = 3 AND 'CIVILIZATION_MAYA' IN (SELECT CivilizationType FROM Civilizations);
