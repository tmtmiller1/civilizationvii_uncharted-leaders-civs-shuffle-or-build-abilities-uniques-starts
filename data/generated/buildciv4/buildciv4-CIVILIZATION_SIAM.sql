UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_SIAM' WHERE Slot = 4 AND 'CIVILIZATION_SIAM' IN (SELECT CivilizationType FROM Civilizations);
