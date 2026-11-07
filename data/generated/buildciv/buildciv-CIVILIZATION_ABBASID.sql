UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_ABBASID' WHERE Slot = 1 AND 'CIVILIZATION_ABBASID' IN (SELECT CivilizationType FROM Civilizations);
