UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_TONGA' WHERE Slot = 2 AND 'CIVILIZATION_TONGA' IN (SELECT CivilizationType FROM Civilizations);
