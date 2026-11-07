UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_ROME' WHERE Slot = 3 AND 'CIVILIZATION_ROME' IN (SELECT CivilizationType FROM Civilizations);
