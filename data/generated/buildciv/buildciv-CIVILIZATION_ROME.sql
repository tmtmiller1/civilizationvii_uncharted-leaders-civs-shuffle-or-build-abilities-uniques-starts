UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_ROME' WHERE Slot = 1 AND 'CIVILIZATION_ROME' IN (SELECT CivilizationType FROM Civilizations);
