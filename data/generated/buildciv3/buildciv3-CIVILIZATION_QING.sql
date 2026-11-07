UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_QING' WHERE Slot = 3 AND 'CIVILIZATION_QING' IN (SELECT CivilizationType FROM Civilizations);
