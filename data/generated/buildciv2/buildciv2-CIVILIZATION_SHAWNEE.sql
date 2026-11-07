UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_SHAWNEE' WHERE Slot = 2 AND 'CIVILIZATION_SHAWNEE' IN (SELECT CivilizationType FROM Civilizations);
