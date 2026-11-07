UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_ENGLAND' WHERE Slot = 3 AND 'CIVILIZATION_ENGLAND' IN (SELECT CivilizationType FROM Civilizations);
