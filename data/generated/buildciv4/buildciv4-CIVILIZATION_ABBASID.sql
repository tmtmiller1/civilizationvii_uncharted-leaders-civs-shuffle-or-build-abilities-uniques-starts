UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_ABBASID' WHERE Slot = 4 AND 'CIVILIZATION_ABBASID' IN (SELECT CivilizationType FROM Civilizations);
