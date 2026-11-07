UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_ICELAND' WHERE Slot = 1 AND 'CIVILIZATION_ICELAND' IN (SELECT CivilizationType FROM Civilizations);
