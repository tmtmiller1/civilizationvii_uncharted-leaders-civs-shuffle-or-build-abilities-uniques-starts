// The game's own civilization panels in play (CONTRACTS 25). The diplomacy panel lists a civilization's traditions
// from the gameplay Traditions table, keeping the rows whose TraitType is the civ's own base trait
// (LegacyCivilizationTraits). Under Civilization civics Split up or a civics swap, a tradition goes with its civic
// while the row keeps the giver's trait, so the giver's panel kept listing it and the new holder's never did. While
// a game with moved civics runs, the panel's traditions query answers with each tradition under the base trait of the
// civilization in the game that holds it now (the loading screen's civicUnlockJudge decides), and a tradition its
// civilization gave away to nobody in the game drops out. Every other query passes through untouched.
import { guarded } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/display/lshuf-display-util.js";
import { civicTables, civicUnlockJudge } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/game/lshuf-load-screen.js";

const LOG = "[lshuf-game]";
// A trait no civilization holds, for a tradition whose civilization gave it away to nobody in this game.
export const NOBODY = "TRAIT_LSHUF_NONE";
// The diplomacy panel's query (panel-diplomacy-actions.js): every tradition, filtered by TraitType afterwards.
const TRADITIONS_QUERY = /\bFROM\s+Traditions\b/i;

/**
 * TraditionType -> the trait the panels should file it under. `traditions` [{ TraditionType, TraitType }], `civs` the
 * civilizations in the game, `legacyOf` civ -> its base trait, `judgeOf` civ -> (row) => true | false | null (the
 * loading screen's civicUnlockJudge for what the civ holds), `held` civ -> Set of traits. A tradition some civ in
 * the game holds goes under that civ's base trait (the first in `civs` order); one whose own civ is in the game but
 * no longer holds it goes under NOBODY; anything else is left out of the map (unchanged). Pure.
 */
export function traditionOwners(traditions, civs, legacyOf, judgeOf, held) {
  const out = new Map();
  const ownerOfBase = new Map();
  for (const civ of civs) if (legacyOf.has(civ)) ownerOfBase.set(legacyOf.get(civ), civ);
  for (const t of traditions) {
    if (!t.TraitType || !t.TraditionType) continue;
    const holds = (civ) => {
      const byNode = judgeOf.has(civ) ? judgeOf.get(civ)(t) : null;
      return byNode == null ? (held.get(civ) || new Set()).has(t.TraitType) : byNode;
    };
    const holder = civs.find((civ) => legacyOf.has(civ) && holds(civ));
    if (holder != null) {
      if (legacyOf.get(holder) !== t.TraitType) out.set(t.TraditionType, legacyOf.get(holder));
    } else if (ownerOfBase.has(t.TraitType)) out.set(t.TraditionType, NOBODY);
  }
  return out;
}

/** The query's rows with each remapped tradition under its new trait. Pure. */
export function remapTraditionRows(rows, owners) {
  if (!Array.isArray(rows) || !owners.size) return rows;
  return rows.map((row) => {
    const type = row && (row.TraditionType || row.Type);
    return type && owners.has(type) ? { ...row, TraitType: owners.get(type) } : row;
  });
}

// The civilizations of the major players in the game.
function civsInGame() {
  const out = [];
  for (const player of guarded("players", () => Players.getAlive(), []) || []) {
    if (!player || !player.isMajor) continue;
    const civ = guarded("civ", () => GameInfo.Civilizations.lookup(player.civilizationType), null);
    if (civ && !out.includes(civ.CivilizationType)) out.push(civ.CivilizationType);
  }
  return out;
}

function readOwners() {
  const civs = civsInGame();
  const held = new Map();
  for (const row of GameInfo.CivilizationTraits) {
    if (!civs.includes(row.CivilizationType)) continue;
    if (!held.has(row.CivilizationType)) held.set(row.CivilizationType, new Set());
    held.get(row.CivilizationType).add(row.TraitType);
  }
  const legacyOf = new Map();
  for (const civ of civs) {
    const row = GameInfo.LegacyCivilizationTraits.lookup(civ);
    if (row && row.TraitType) legacyOf.set(civ, row.TraitType);
  }
  const tables = civicTables();
  const judgeOf = new Map();
  for (const civ of civs) judgeOf.set(civ, civicUnlockJudge(held.get(civ) || new Set(), tables));
  const traditions = [];
  for (const t of GameInfo.Traditions) traditions.push({ TraditionType: t.TraditionType, TraitType: t.TraitType });
  return traditionOwners(traditions, civs, legacyOf, judgeOf, held);
}

let installed = false;

/** Wraps Database.query for the traditions query, when this game's deal moved civics. */
export function installTraditionOwners(civPieces) {
  if (installed) return;
  const moved = (civPieces || []).filter((r) => r.Kind === "civic" || r.Kind === "civics").length > 0;
  if (!moved || typeof Database === "undefined" || typeof Database.query !== "function") return;
  let owners = null;
  const original = Database.query;
  const wrapped = function query(scope, sql, ...rest) {
    const rows = original.call(this, scope, sql, ...rest);
    if (scope !== "gameplay" || !TRADITIONS_QUERY.test(String(sql))) return rows;
    if (owners == null) owners = guarded("tradition owners", () => readOwners(), new Map());
    return guarded("tradition rows", () => remapTraditionRows(rows, owners), rows);
  };
  try {
    Database.query = wrapped;
    installed = Database.query === wrapped;
  } catch (e) {
    console.warn(`${LOG} traditions query not wrapped: ${e}`);
  }
  if (!installed) console.warn(`${LOG} traditions query not wrapped; panels list traditions as shipped`);
}
