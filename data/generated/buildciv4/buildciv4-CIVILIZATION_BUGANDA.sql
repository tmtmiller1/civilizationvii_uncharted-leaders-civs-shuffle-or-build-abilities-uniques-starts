UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_BUGANDA' WHERE Slot = 4 AND 'CIVILIZATION_BUGANDA' IN (SELECT CivilizationType FROM Civilizations);
