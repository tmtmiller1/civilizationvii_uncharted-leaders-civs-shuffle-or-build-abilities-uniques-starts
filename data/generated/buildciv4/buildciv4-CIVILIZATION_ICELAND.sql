UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_ICELAND' WHERE Slot = 4 AND 'CIVILIZATION_ICELAND' IN (SELECT CivilizationType FROM Civilizations);
