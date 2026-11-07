UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_SHAWNEE' WHERE Slot = 1 AND 'CIVILIZATION_SHAWNEE' IN (SELECT CivilizationType FROM Civilizations);
