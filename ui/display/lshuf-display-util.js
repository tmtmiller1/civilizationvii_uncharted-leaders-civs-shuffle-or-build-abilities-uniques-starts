// Small helpers the display scripts share in both scopes. Pure.

export const DEAL_VERSION_UNKNOWN = -1;

// 32-bit FNV-1a over the string's UTF-16 units, as 8 hex digits. Only compared with itself.
export function fnv1a(text) {
  let hash = 0x811c9dc5;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

// LOC_LSHUF_REASON_ + the REASON value upper-cased with "-" as "_" (CONTRACTS.md 8).
export const reasonKey = (reason) => `LOC_LSHUF_REASON_${String(reason).toUpperCase().replace(/-/g, "_")}`;

// The check-1 detail written by the setup screen as LShufModWhy_<LEADER> ("script", "uiscript", ...).
export const whyKey = (why) => `LOC_LSHUF_WHY_${String(why).toUpperCase().replace(/-/g, "_")}`;

// Every value of a GameInfo-style table or array as a plain array (GameInfo tables have no map/some/every).
export function rowsOf(table) {
  const out = [];
  if (!table) return out;
  for (const row of table) out.push(row);
  return out;
}

// Map scripts that place starts themselves and don't read the start-bias tables: the game's Earth maps and the
// true-start-location maps COMPATIBILITY.md lists. Matched on the map script's file name.
const MAP_SETS_STARTS = /earth|tsl|true[-_ ]?start|ynamp|yamem|custom[-_ ]?start/i;
export const mapSetsStarts = (mapScript) => MAP_SETS_STARTS.test(String(mapScript || ""));

// Calls fn and logs instead of throwing, so one failed write doesn't stop the others.
export function guarded(label, fn, fallback) {
  try {
    return fn();
  } catch (error) {
    console.error(`[lshuf] ${label}: ${error}`);
    return fallback;
  }
}

const AGE_SUFFIX = { AGE_ANTIQUITY: "AQ", AGE_EXPLORATION: "EX", AGE_MODERN: "MO" };

/** The age being played: the running game's, or on the setup screens the start age row; null when neither reads. */
export function currentAge() {
  try {
    const row = typeof Game !== "undefined" && Game.age != null ? GameInfo.Ages.lookup(Game.age) : null;
    if (row && row.AgeType) return String(row.AgeType);
  } catch (_) { /* not in a game */ }
  try {
    const p = GameSetup.findGameParameter("Age");
    const v = p && p.value ? p.value.value : null;
    return v ? String(v) : null;
  } catch (_) {
    return null;
  }
}

/**
 * The text key of a civilization bonus in the age being played. The game scales an ability's numbers by age
 * (Spain's coastal yields read +1 in Antiquity, +2 in Exploration, +3 in Modern), so a bonus whose wording differs
 * in that age has its own key there (LOC_LSHUF_CIVPIECE_<PieceId>__AQ, __EX, __MO); the rest read the plain one.
 * @param {string} pieceId
 * @param {string | null} [age]
 */
export function civPieceKey(pieceId, age = currentAge()) {
  const plain = `LOC_LSHUF_CIVPIECE_${pieceId}`;
  const suffix = age ? AGE_SUFFIX[age] : null;
  if (!suffix) return plain;
  const aged = `${plain}__${suffix}`;
  try {
    const text = Locale.compose(aged);
    return text && text !== aged ? aged : plain;
  } catch (_) {
    return plain;
  }
}
