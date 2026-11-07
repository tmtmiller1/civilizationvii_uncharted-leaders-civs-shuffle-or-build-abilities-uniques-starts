UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_SIAM' WHERE Slot = 3 AND 'CIVILIZATION_SIAM' IN (SELECT CivilizationType FROM Civilizations);
