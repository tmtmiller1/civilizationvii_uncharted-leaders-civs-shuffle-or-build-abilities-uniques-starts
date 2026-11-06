-- Probe 1: one Pachacuti bullet (10% of a city's Food as Production) on Amina through a trait of our own.
INSERT INTO Types (Type, Kind) VALUES ('TRAIT_LSHUF_PROBE_AMINA', 'KIND_TRAIT');
INSERT INTO Traits (TraitType, Name, Description, InternalOnly)
VALUES ('TRAIT_LSHUF_PROBE_AMINA', 'LOC_TRAIT_LSHUF_PROBE_AMINA_NAME', 'LOC_TRAIT_LSHUF_PROBE_AMINA_DESCRIPTION', 1);
INSERT INTO LeaderTraits (LeaderType, TraitType) VALUES ('LEADER_AMINA', 'TRAIT_LSHUF_PROBE_AMINA');
INSERT INTO TraitModifiers (TraitType, ModifierId)
SELECT 'TRAIT_LSHUF_PROBE_AMINA', ModifierId FROM Modifiers WHERE ModifierId = 'PACHACUTI_MOD_CITY_PRODUCTION_FROM_FOOD';
