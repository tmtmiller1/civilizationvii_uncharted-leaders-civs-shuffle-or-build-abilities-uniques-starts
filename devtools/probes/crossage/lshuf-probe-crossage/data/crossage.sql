-- America's Modern-age "+1 Production on Resources" on every Antiquity civilization's ability.
INSERT OR IGNORE INTO TraitModifiers (TraitType, ModifierId)
  SELECT ct.TraitType, 'TRAIT_MOD_FRONTIER_EXPANSION_PRODUCTION_ON_RESOURCES' FROM CivilizationTraits ct
  WHERE ct.TraitType LIKE 'TRAIT\_%\_ABILITY' ESCAPE '\'
    AND ct.CivilizationType IN (SELECT CivilizationType FROM LegacyCivilizations WHERE Age = 'AGE_ANTIQUITY')
    AND EXISTS (SELECT 1 FROM Modifiers WHERE ModifierId = 'TRAIT_MOD_FRONTIER_EXPANSION_PRODUCTION_ON_RESOURCES');
