// The deal's tables on the setup side (CONTRACTS 5.2): our own LShuf* tables as they are, the game's tables from the
// setup copy (LShufSetup_*), kept to the leaders and civs this player has, as the game's own database would keep
// them. Read once per session. The preview (ui/display/lshuf-setup-display.js) and your share from your own mode
// (ui/setup/lshuf-setup-config.js, CONTRACTS 33) read the same rows.

// Gameplay tables the deal reads (CONTRACTS.md 4.2), with the columns that name a leader or a civ.
const LEADER_COLUMN = {
  Leaders: "LeaderType",
  LeaderTraits: "LeaderType",
  LeaderCivPriorities: "Leader"
};
const CIV_COLUMN = { LeaderCivPriorities: "Civilization", LegacyCivilizations: "CivilizationType" };

const state = { tables: new Map(), installedLeaders: null, installedCivs: null };

export function configRows(sql) {
  try {
    return Database.query("config", sql) || [];
  } catch (error) {
    console.error(`[lshuf] query ${sql.slice(0, 80)}: ${error}`);
    return [];
  }
}

function installed() {
  if (!state.installedLeaders) {
    state.installedLeaders = new Set(configRows("SELECT LeaderType FROM Leaders").map((r) => r.LeaderType));
    state.installedCivs = new Set(configRows("SELECT CivilizationType FROM Civilizations").map((r) => r.CivilizationType));
  }
  return state;
}

function keepRow(name, row) {
  const { installedLeaders, installedCivs } = installed();
  const leaderColumn = LEADER_COLUMN[name] || (name.startsWith("StartBias") ? "LeaderType" : null);
  const civColumn = CIV_COLUMN[name] || (name.startsWith("StartBias") ? "CivilizationType" : null);
  if (leaderColumn && row[leaderColumn] != null && !installedLeaders.has(row[leaderColumn])) return false;
  if (civColumn && row[civColumn] != null && !installedCivs.has(row[civColumn])) return false;
  return true;
}

// readTable for buildDealInput.
export function readSetupTable(name) {
  if (!state.tables.has(name)) {
    const rows = name.startsWith("LShuf")
      ? configRows(`SELECT * FROM ${name}`)
      : configRows(`SELECT * FROM LShufSetup_${name}`).filter((row) => keepRow(name, row));
    state.tables.set(name, rows);
  }
  return state.tables.get(name);
}
