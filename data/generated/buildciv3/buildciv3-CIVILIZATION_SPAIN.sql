UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_SPAIN' WHERE Slot = 3 AND 'CIVILIZATION_SPAIN' IN (SELECT CivilizationType FROM Civilizations);
