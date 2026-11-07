UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_TONGA' WHERE Slot = 1 AND 'CIVILIZATION_TONGA' IN (SELECT CivilizationType FROM Civilizations);
