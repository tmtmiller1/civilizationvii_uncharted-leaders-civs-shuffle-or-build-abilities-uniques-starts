UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_PRUSSIA' WHERE Slot = 3 AND 'CIVILIZATION_PRUSSIA' IN (SELECT CivilizationType FROM Civilizations);
