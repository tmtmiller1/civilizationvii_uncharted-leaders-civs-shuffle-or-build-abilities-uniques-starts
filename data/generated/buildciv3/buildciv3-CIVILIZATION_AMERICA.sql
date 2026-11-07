UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_AMERICA' WHERE Slot = 3 AND 'CIVILIZATION_AMERICA' IN (SELECT CivilizationType FROM Civilizations);
