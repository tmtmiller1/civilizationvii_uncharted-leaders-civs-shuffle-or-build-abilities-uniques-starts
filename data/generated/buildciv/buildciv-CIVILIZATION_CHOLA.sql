UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_CHOLA' WHERE Slot = 1 AND 'CIVILIZATION_CHOLA' IN (SELECT CivilizationType FROM Civilizations);
