-- Breakdown label probe: Pachacuti's Food-to-Production modifier copied under a new id with Amina's ability name as
-- its Tooltip, attached to Amina through a trait of our own. Copied generically: every column and argument of the
-- source row, with only the id and the Tooltip changed.
INSERT INTO Types (Type, Kind) VALUES ('TRAIT_LSHUF_LABEL_AMINA', 'KIND_TRAIT');
INSERT INTO Traits (TraitType, InternalOnly) VALUES ('TRAIT_LSHUF_LABEL_AMINA', 1);
INSERT INTO LeaderTraits (LeaderType, TraitType) VALUES ('LEADER_AMINA', 'TRAIT_LSHUF_LABEL_AMINA');
INSERT INTO Modifiers (ModifierId, ModifierType, NewOnly, OwnerRequirementSetId, OwnerStackLimit, Permanent, RunOnce,
  SubjectRequirementSetId, SubjectStackLimit)
SELECT 'LSHUF_LEADER_AMINA_PACHACUTI_PROD_FROM_FOOD', ModifierType, NewOnly, OwnerRequirementSetId, OwnerStackLimit,
  Permanent, RunOnce, SubjectRequirementSetId, SubjectStackLimit
FROM Modifiers WHERE ModifierId = 'PACHACUTI_MOD_CITY_PRODUCTION_FROM_FOOD';
INSERT INTO ModifierArguments (ModifierId, Name, Extra, SecondExtra, Type, Value)
SELECT 'LSHUF_LEADER_AMINA_PACHACUTI_PROD_FROM_FOOD', Name, Extra, SecondExtra, Type,
  CASE WHEN Name = 'Tooltip' THEN 'LOC_TRAIT_LEADER_AMINA_ABILITY_NAME' ELSE Value END
FROM ModifierArguments WHERE ModifierId = 'PACHACUTI_MOD_CITY_PRODUCTION_FROM_FOOD';
INSERT INTO TraitModifiers (TraitType, ModifierId)
SELECT 'TRAIT_LSHUF_LABEL_AMINA', ModifierId FROM Modifiers WHERE ModifierId = 'LSHUF_LEADER_AMINA_PACHACUTI_PROD_FROM_FOOD';
