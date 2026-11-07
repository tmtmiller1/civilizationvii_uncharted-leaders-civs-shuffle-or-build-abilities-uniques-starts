UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_ROME' WHERE Slot = 2 AND 'CIVILIZATION_ROME' IN (SELECT CivilizationType FROM Civilizations);
