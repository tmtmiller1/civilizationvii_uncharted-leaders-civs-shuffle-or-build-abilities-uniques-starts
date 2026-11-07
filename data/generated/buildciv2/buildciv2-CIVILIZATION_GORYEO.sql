UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_GORYEO' WHERE Slot = 2 AND 'CIVILIZATION_GORYEO' IN (SELECT CivilizationType FROM Civilizations);
