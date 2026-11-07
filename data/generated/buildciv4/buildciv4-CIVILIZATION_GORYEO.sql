UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_GORYEO' WHERE Slot = 4 AND 'CIVILIZATION_GORYEO' IN (SELECT CivilizationType FROM Civilizations);
