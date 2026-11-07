UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_BABYLON' WHERE Slot = 4 AND 'CIVILIZATION_BABYLON' IN (SELECT CivilizationType FROM Civilizations);
