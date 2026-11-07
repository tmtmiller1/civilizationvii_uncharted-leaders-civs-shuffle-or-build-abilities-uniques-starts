UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_DAI_VIET' WHERE Slot = 3 AND 'CIVILIZATION_DAI_VIET' IN (SELECT CivilizationType FROM Civilizations);
