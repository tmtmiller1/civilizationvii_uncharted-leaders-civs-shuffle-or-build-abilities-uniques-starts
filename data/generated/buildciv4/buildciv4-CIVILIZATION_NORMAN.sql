UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_NORMAN' WHERE Slot = 4 AND 'CIVILIZATION_NORMAN' IN (SELECT CivilizationType FROM Civilizations);
