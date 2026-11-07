UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_EGYPT' WHERE Slot = 4 AND 'CIVILIZATION_EGYPT' IN (SELECT CivilizationType FROM Civilizations);
