UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_INCA' WHERE Slot = 3 AND 'CIVILIZATION_INCA' IN (SELECT CivilizationType FROM Civilizations);
