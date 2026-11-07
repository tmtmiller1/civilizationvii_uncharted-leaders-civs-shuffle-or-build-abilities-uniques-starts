UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_CHOLA' WHERE Slot = 2 AND 'CIVILIZATION_CHOLA' IN (SELECT CivilizationType FROM Civilizations);
