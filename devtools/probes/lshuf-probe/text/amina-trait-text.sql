-- Probe 1: Amina's ability text plus Pachacuti's third bullet, in each language the game has.
INSERT OR REPLACE INTO LocalizedText (Language, Tag, Text)
SELECT a.Language, 'LOC_TRAIT_LSHUF_PROBE_AMINA_DESCRIPTION',
  replace(a.Text, '[/BLIST]', '') ||
  substr(p.Text,
    instr(p.Text, '[LI]') + 3
    + instr(substr(p.Text, instr(p.Text, '[LI]') + 4), '[LI]')
    + instr(substr(p.Text, instr(p.Text, '[LI]') + 4 + instr(substr(p.Text, instr(p.Text, '[LI]') + 4), '[LI]')), '[LI]'))
FROM LocalizedText a
JOIN LocalizedText p ON p.Language = a.Language AND p.Tag = 'LOC_TRAIT_LEADER_PACHACUTI_ABILITY_DESCRIPTION'
WHERE a.Tag = 'LOC_TRAIT_LEADER_AMINA_ABILITY_DESCRIPTION';
INSERT OR REPLACE INTO LocalizedText (Language, Tag, Text)
SELECT Language, 'LOC_TRAIT_LSHUF_PROBE_AMINA_NAME', Text FROM LocalizedText
WHERE Tag = 'LOC_TRAIT_LEADER_AMINA_ABILITY_NAME';
