UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_ICELAND' WHERE Slot = 2 AND 'CIVILIZATION_ICELAND' IN (SELECT CivilizationType FROM Civilizations);
