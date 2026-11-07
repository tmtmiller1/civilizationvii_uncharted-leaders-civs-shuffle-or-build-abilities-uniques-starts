UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_GORYEO' WHERE Slot = 3 AND 'CIVILIZATION_GORYEO' IN (SELECT CivilizationType FROM Civilizations);
