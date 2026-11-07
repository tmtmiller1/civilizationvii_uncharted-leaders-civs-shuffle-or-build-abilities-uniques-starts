UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_ROME' WHERE Slot = 4 AND 'CIVILIZATION_ROME' IN (SELECT CivilizationType FROM Civilizations);
