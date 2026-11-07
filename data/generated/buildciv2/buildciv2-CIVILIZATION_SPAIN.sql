UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_SPAIN' WHERE Slot = 2 AND 'CIVILIZATION_SPAIN' IN (SELECT CivilizationType FROM Civilizations);
