UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_AMERICA' WHERE Slot = 2 AND 'CIVILIZATION_AMERICA' IN (SELECT CivilizationType FROM Civilizations);
