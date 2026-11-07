UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_SIAM' WHERE Slot = 2 AND 'CIVILIZATION_SIAM' IN (SELECT CivilizationType FROM Civilizations);
