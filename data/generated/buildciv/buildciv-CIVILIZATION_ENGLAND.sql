UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_ENGLAND' WHERE Slot = 1 AND 'CIVILIZATION_ENGLAND' IN (SELECT CivilizationType FROM Civilizations);
