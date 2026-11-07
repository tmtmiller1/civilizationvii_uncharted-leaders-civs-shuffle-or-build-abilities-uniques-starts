UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_INCA' WHERE Slot = 2 AND 'CIVILIZATION_INCA' IN (SELECT CivilizationType FROM Civilizations);
