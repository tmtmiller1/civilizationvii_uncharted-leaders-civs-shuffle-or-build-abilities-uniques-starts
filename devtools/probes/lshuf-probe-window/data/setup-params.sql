-- Probe 16: a hidden setup option, never drawn by the advanced screen.
INSERT INTO Parameters (ParameterID, Name, Description, Domain, Array, DefaultValue, ConfigurationGroup,
  ConfigurationKey, GroupID, Hidden, ReadOnly, SupportsSinglePlayer, SupportsLANMultiplayer, SupportsInternetMultiplayer,
  SupportsHotseatMultiplayer, SortIndex)
VALUES ('LShufP16Hidden', 'LOC_LSHUF_P16_HIDDEN', 'LOC_LSHUF_P16_HIDDEN', 'bool', 0, 0, 'Game', 'LShufP16Hidden',
  'GameOptions', 1, 0, 1, 1, 1, 1, 9000);
