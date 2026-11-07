UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_ABBASID' WHERE Slot = 3 AND 'CIVILIZATION_ABBASID' IN (SELECT CivilizationType FROM Civilizations);
