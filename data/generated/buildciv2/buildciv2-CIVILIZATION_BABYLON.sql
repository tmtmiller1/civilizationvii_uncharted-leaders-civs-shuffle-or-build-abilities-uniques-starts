UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_BABYLON' WHERE Slot = 2 AND 'CIVILIZATION_BABYLON' IN (SELECT CivilizationType FROM Civilizations);
