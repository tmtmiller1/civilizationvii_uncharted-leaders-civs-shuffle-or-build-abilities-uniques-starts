UPDATE LShufBuild SET CivilizationType = 'CIVILIZATION_DAI_VIET' WHERE Slot = 1 AND 'CIVILIZATION_DAI_VIET' IN (SELECT CivilizationType FROM Civilizations);
