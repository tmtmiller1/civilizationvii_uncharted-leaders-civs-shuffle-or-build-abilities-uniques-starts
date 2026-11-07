UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_MUGHAL' WHERE Slot = 1 AND 'CIVILIZATION_MUGHAL' IN (SELECT CivilizationType FROM Civilizations);
