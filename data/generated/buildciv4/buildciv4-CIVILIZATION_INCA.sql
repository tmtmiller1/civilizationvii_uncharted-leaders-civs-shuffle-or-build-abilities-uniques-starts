UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_INCA' WHERE Slot = 4 AND 'CIVILIZATION_INCA' IN (SELECT CivilizationType FROM Civilizations);
