UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_HAN' WHERE Slot = 1 AND 'CIVILIZATION_HAN' IN (SELECT CivilizationType FROM Civilizations);
