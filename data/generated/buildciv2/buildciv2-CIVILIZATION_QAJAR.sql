UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_QAJAR' WHERE Slot = 2 AND 'CIVILIZATION_QAJAR' IN (SELECT CivilizationType FROM Civilizations);
