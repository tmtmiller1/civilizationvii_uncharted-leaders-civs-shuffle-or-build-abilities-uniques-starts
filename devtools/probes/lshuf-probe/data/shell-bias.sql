-- Probe 10: a setup-side start-bias table, read back at a fresh main menu.
CREATE TABLE IF NOT EXISTS LShufSetupBias (LeaderType TEXT, CivilizationType TEXT, Kind TEXT, Target TEXT, Score INTEGER);
INSERT INTO LShufSetupBias VALUES ('LEADER_PACHACUTI', NULL, 'Terrain', 'TERRAIN_MOUNTAIN', 40);
INSERT INTO LShufSetupBias VALUES ('LEADER_AMINA', NULL, 'Biome', 'BIOME_PLAINS', 20);
INSERT INTO LShufSetupBias VALUES (NULL, 'CIVILIZATION_ENGLAND', 'Islands', NULL, 50000);
