-- Probe (feature gate, 2026-11-10): does a civilization attribute tag moved in CivilizationTraits carry its quest?
-- Rome ships Cultural + Militaristic. Here it has Cultural + Expansionist; four settlements should then earn Rome
-- +1 Expansionist attribute point (ATTRIBUTE_QUEST_1005A), and Greece (Cultural + Political, unchanged) nothing.
DELETE FROM CivilizationTraits WHERE CivilizationType = 'CIVILIZATION_ROME' AND TraitType = 'TRAIT_ATTRIBUTE_MILITARISTIC';
INSERT OR IGNORE INTO CivilizationTraits (CivilizationType, TraitType)
  SELECT 'CIVILIZATION_ROME', 'TRAIT_ATTRIBUTE_EXPANSIONIST' WHERE 'TRAIT_ATTRIBUTE_EXPANSIONIST' IN (SELECT TraitType FROM Traits);
