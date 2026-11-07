UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_ENGLAND' WHERE Slot = 2 AND 'CIVILIZATION_ENGLAND' IN (SELECT CivilizationType FROM Civilizations);
