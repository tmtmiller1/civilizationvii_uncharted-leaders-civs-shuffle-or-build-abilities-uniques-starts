UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_AMERICA' WHERE Slot = 1 AND 'CIVILIZATION_AMERICA' IN (SELECT CivilizationType FROM Civilizations);
