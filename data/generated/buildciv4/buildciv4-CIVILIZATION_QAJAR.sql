UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_QAJAR' WHERE Slot = 4 AND 'CIVILIZATION_QAJAR' IN (SELECT CivilizationType FROM Civilizations);
