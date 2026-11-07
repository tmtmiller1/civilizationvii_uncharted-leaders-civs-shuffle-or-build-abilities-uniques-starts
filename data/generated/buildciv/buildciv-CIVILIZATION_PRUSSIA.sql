UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_PRUSSIA' WHERE Slot = 1 AND 'CIVILIZATION_PRUSSIA' IN (SELECT CivilizationType FROM Civilizations);
