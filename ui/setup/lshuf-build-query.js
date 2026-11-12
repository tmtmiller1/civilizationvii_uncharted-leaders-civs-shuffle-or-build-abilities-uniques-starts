// The build screens' smallest shared helpers: a guarded read of the shell's config database and the game's text
// composed in the player's language. lshuf-build-cards.js and lshuf-build-civics.js both build on these.

const log = (msg) => console.warn(`[lshuf-build] ${msg}`);

export function compose(key, ...args) {
  try {
    const text = Locale.compose(key, ...args);
    return text === undefined || text === null ? "" : String(text);
  } catch (_) {
    return "";
  }
}

// Composed text, or "" when the key isn't in the text database.
export const composedOrEmpty = (key) => {
  if (!key) return "";
  const text = compose(key);
  return text === key ? "" : text;
};

// "BIOME_TROPICAL" -> "Tropical": readable words from a type when the text database has no name for it.
export const plainWords = (type) => String(type || "").replace(/^(BIOME|TERRAIN|FEATURE_CLASS|RESOURCE)_/, "")
  .toLowerCase().split("_").map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");

// A text value quoted for SQL.
export const sq = (text) => String(text).replace(/'/g, "''");

export function query(sql) {
  try {
    return Database.query("config", sql) || [];
  } catch (e) {
    log(`query failed: ${e} :: ${sql.slice(0, 120)}`);
    return [];
  }
}
