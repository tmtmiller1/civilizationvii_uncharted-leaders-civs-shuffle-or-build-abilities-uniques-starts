UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_MAURYA' WHERE Slot = 3 AND 'CIVILIZATION_MAURYA' IN (SELECT CivilizationType FROM Civilizations);
