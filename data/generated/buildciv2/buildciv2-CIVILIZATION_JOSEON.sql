UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_JOSEON' WHERE Slot = 2 AND 'CIVILIZATION_JOSEON' IN (SELECT CivilizationType FROM Civilizations);
