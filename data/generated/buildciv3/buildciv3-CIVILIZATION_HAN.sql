UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_HAN' WHERE Slot = 3 AND 'CIVILIZATION_HAN' IN (SELECT CivilizationType FROM Civilizations);
