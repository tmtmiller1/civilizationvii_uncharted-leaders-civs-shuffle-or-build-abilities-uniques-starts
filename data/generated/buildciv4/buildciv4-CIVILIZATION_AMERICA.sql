UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_AMERICA' WHERE Slot = 4 AND 'CIVILIZATION_AMERICA' IN (SELECT CivilizationType FROM Civilizations);
