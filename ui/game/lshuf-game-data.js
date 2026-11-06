// What the game dealt, read from the gameplay LShufResult* tables (CONTRACTS.md 5.3), and the lookups the display
// text needs in the game scope. GameInfo first; a custom table GameInfo doesn't expose is read with
// Database.query("gameplay") instead (CONTRACTS.md 11).
import { OPTION_DEFAULTS, MODE } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";
import { guarded, mapSetsStarts, rowsOf } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/display/lshuf-display-util.js";
import { attributeTags, readLeaderRows } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/display/lshuf-config-rows.js";

export function readGameplay(name) {
  const fromInfo = guarded(`GameInfo.${name}`, () => {
    const table = GameInfo[name];
    return table ? rowsOf(table) : null;
  }, null);
  if (fromInfo && fromInfo.length) return fromInfo;
  return guarded(`gameplay ${name}`, () => Database.query("gameplay", `SELECT * FROM ${name}`) || [], []);
}

const readConfig = (sql) => guarded(`config ${sql.slice(0, 60)}`, () => Database.query("config", sql) || [], []);

// The GameInfo table holding each bias target's name.
const TARGET_TABLE = {
  StartBiasBiomes: "Biomes",
  StartBiasTerrains: "Terrains",
  StartBiasFeatureClasses: "FeatureClasses",
  StartBiasResources: "Resources"
};

function targetName(tableName, targetType) {
  const table = TARGET_TABLE[tableName];
  if (!table || !targetType) return null;
  return guarded("target name", () => {
    const row = GameInfo[table] && GameInfo[table].lookup(targetType);
    return row && row.Name ? row.Name : null;
  }, null);
}

function mapScript() {
  return guarded("map script", () => {
    const map = Configuration.getMap();
    const script = map && map.script;
    return script ? String(script) : String(Configuration.getMapValue("Name") || "");
  }, "");
}

const metaValue = (meta, name) => {
  const row = (meta || []).find((r) => r.Name === name);
  return row ? row.Value : null;
};

/**
 * Everything the game scope shows, read once. Null when the deal tables are empty (the mod's data didn't load).
 */
export function readGameDeal() {
  const deal = {
    leaders: readGameplay("LShufResultLeaders"),
    pieces: readGameplay("LShufResultPieces"),
    attributes: readGameplay("LShufResultAttributes"),
    biases: readGameplay("LShufResultBiases"),
    unlocks: [],
    meta: readGameplay("LShufResultMeta")
  };
  if (!deal.leaders.length) return null;
  const options = readGameplay("LShufOptions");
  const option = (name) => {
    const row = options.find((r) => r.Name === name);
    return row ? row.Value : OPTION_DEFAULTS[name];
  };
  return {
    deal,
    mode: metaValue(deal.meta, "Mode") || option("Mode"),
    seed: metaValue(deal.meta, "Seed"),
    reveal: option("Reveal"),
    tooFew: (deal.meta || []).filter((r) => String(r.Name).startsWith("Fallback_")).map((r) => r.Name)
  };
}

/**
 * The lookups for leaderView in the game: shipped ability keys come from the trait each leader's LeaderItems row
 * names (the mod never changes that column), with GameInfo.Traits holding the keys.
 */
export function gameContext(mode) {
  const tagOf = attributeTags(readGameplay);
  const tagTypes = [...new Set(tagOf.values())];
  const rows = readLeaderRows(tagTypes);
  const setupTraits = readConfig("SELECT TraitType, Name, Description FROM LShufSetup_Traits");
  const abilityOf = (leaderType) => {
    const row = rows.get(leaderType);
    if (!row) return null;
    const trait = guarded("trait", () => GameInfo.Traits.lookup(row.type), null)
      || setupTraits.find((t) => t.TraitType === row.type);
    if (trait && trait.Name) return { name: trait.Name, description: trait.Description };
    return { name: row.name, description: row.description };
  };
  return {
    rows,
    tagTypes,
    ctx: {
      mode: mode || MODE.None,
      abilityOf,
      compose: (key, ...args) => Locale.compose(key, ...args),
      targetName,
      mapSetsStarts: mapSetsStarts(mapScript()),
      tagOf
    }
  };
}

/**
 * A leader as shipped, for a leader the local player hasn't met yet: its own ability keys and its shipped attribute
 * tags from the setup copy in config (the gameplay rows have been dealt). Null for a leader the copy doesn't hold.
 */
export function shippedViewOf(leaderType, context) {
  const own = context.ctx.abilityOf(leaderType);
  if (!own) return null;
  const safe = String(leaderType).replace(/'/g, "''");
  const traits = readConfig(`SELECT TraitType FROM LShufSetup_LeaderTraits WHERE LeaderType = '${safe}'`);
  if (!traits.length) return null;
  const tags = [];
  for (const row of traits) {
    const tag = context.ctx.tagOf.get(row.TraitType);
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  return { name: own.name, description: own.description, tags };
}

