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
