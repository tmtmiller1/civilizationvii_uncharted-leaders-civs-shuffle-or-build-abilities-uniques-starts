UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_SPAIN' WHERE Slot = 4 AND 'CIVILIZATION_SPAIN' IN (SELECT CivilizationType FROM Civilizations);
