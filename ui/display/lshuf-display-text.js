// The leader-screen text for a dealt leader, in both scopes: the ability description assembled from its pieces and the
// start-bias line. Pure: every engine call comes in through `lookups`, so tests can pass plain functions.
//
// lookups (both functions):
//   compose(key, ...args) -> string     Locale.compose in the game and the shell
//   abilityOf(leaderType) -> { name, description } | null
//                                        the leader's shipped ability Name and Description keys
//   targetName(tableName, targetType) -> key | null   (biasLine) the game's own name key for a bias target
//   mapSetsStarts -> boolean             (biasLine) the map places starts itself and ignores start biases
import { BIAS_TABLES } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";
import {
  splitBullets,
  bulletAt,
  joinBullets
} from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-text.js";

// Lines in a description are separated with the game's own newline markup.
export const LINE_BREAK = "[n]";

// Bias tables with no target column, and the word each one shows as.
const BIAS_WORDS = {
  StartBiasAdjacentToCoasts: "LOC_LSHUF_BIAS_COAST",
  StartBiasRivers: "LOC_LSHUF_BIAS_RIVER",
  StartBiasLakes: "LOC_LSHUF_BIAS_LAKE",
  StartBiasNaturalWonders: "LOC_LSHUF_BIAS_NATURAL_WONDER",
  StartBiasIslands: "LOC_LSHUF_BIAS_ISLAND"
};

const BULLET_ID = /__B(\d+)$/;

// The game's name key for a bias target, by the pattern its own tables use (LOC_BIOME_PLAINS_NAME,
// LOC_TERRAIN_MOUNTAIN_NAME, LOC_FEATURE_CLASS_VEGETATED_NAME, LOC_RESOURCE_HORSES_NAME). The shell has no Biomes or
// Terrains table, so this is its lookup; in the game GameInfo's Name column comes first.
export const nameKeyOfType = (targetType) => (targetType ? `LOC_${targetType}_NAME` : null);

const composed = (lookups, key, ...args) => {
  if (!key) return "";
  const text = lookups.compose(key, ...args);
  return text == null ? "" : String(text);
};

// A key the localization database doesn't hold composes to itself (or to nothing).
const missing = (text, key) => !text || text === key;

function bulletText(piece, lookups) {
  const key = `LOC_LSHUF_PIECE_${piece.PieceId}`;
  const text = composed(lookups, key);
  if (!missing(text, key)) return text.trim();
  // No generated key (a piece the text file doesn't know yet): split the source's live description here.
  const match = BULLET_ID.exec(String(piece.PieceId));
  const ability = lookups.abilityOf(piece.FromLeaderType);
  if (!match || !ability) return "";
  return bulletAt(composed(lookups, ability.description), Number(match[1]));
}

function wholeText(piece, lookups) {
  const ability = lookups.abilityOf(piece.FromLeaderType);
  return ability ? composed(lookups, ability.description) : "";
}

function restText(piece, lookups) {
  const ability = lookups.abilityOf(piece.FromLeaderType);
  return composed(lookups, "LOC_LSHUF_PIECE_REST", ability ? ability.name : piece.FromLeaderType);
}

// Each piece as bullet lines. A whole ability among other pieces gives its own bullets (or its whole text when it has
// none), so every line lines up in one list.
function piecesAsBullets(sorted, lookups) {
  const bullets = [];
  for (const piece of sorted) {
    if (piece.Kind === "bullet") {
      const text = bulletText(piece, lookups);
      if (text) bullets.push(text);
    } else if (piece.Kind === "remainder") {
      bullets.push(restText(piece, lookups));
    } else if (piece.Kind === "whole") {
      const text = wholeText(piece, lookups);
      const split = splitBullets(text);
      if (split.bullets.length) bullets.push(...split.bullets);
      else if (text.trim()) bullets.push(text.trim());
    }
  }
  return bullets;
}

/**
 * A leader's dealt ability text, from its LShufResultPieces rows (any order; SortIndex decides), plus extra lines
 * (the start-bias line, the deal number) after it. No pieces means the leader has no ability this game.
 * @param {{PieceId: string, FromLeaderType: string, Kind: string, SortIndex: number}[]} pieces
 * @param {{compose: Function, abilityOf: Function, extraLines?: string[]}} lookups
 * @returns {string}
 */
export function assembleDescription(pieces, lookups) {
  const sorted = [...(pieces || [])].sort((a, b) => Number(a.SortIndex) - Number(b.SortIndex));
  let body;
  if (!sorted.length) body = composed(lookups, "LOC_LSHUF_ABILITY_OFF");
  else if (sorted.length === 1 && sorted[0].Kind === "whole") body = wholeText(sorted[0], lookups);
  else body = joinBullets(piecesAsBullets(sorted, lookups));
  const lines = [body, ...(lookups.extraLines || [])].filter((line) => line && String(line).trim());
  return lines.join(LINE_BREAK);
}

function targetLabel(row, lookups) {
  const word = BIAS_WORDS[row.TableName];
  if (word) return composed(lookups, word);
  if (!row.TargetType) return "";
  const own = lookups.targetName ? lookups.targetName(row.TableName, row.TargetType) : null;
  const key = own || nameKeyOfType(row.TargetType);
  const name = composed(lookups, key);
  const label = missing(name, key) ? row.TargetType : name;
  return row.TableName === "StartBiasResources" ? `[icon:${row.TargetType}] ${label}` : label;
}

/**
 * "Starts near: Plains, Desert" for one leader's start-bias rows, in the game's own names, strongest pull first.
 * Rows are LShufResultBiases-shaped: { TableName, TargetType, Score }. Only rows with a positive score count.
 * @returns {string} composed text
 */
export function biasLine(biasRows, lookups) {
  if (lookups.mapSetsStarts) return composed(lookups, "LOC_LSHUF_BIAS_MAP_SETS");
  const order = (table) => {
    const i = BIAS_TABLES.indexOf(table);
    return i < 0 ? BIAS_TABLES.length : i;
  };
  const rows = (biasRows || [])
    .filter((row) => Number(row.Score) > 0)
    .sort((a, b) => Number(b.Score) - Number(a.Score)
      || order(a.TableName) - order(b.TableName)
      || String(a.TargetType || "").localeCompare(String(b.TargetType || "")));
  const labels = [];
  for (const row of rows) {
    const label = targetLabel(row, lookups);
    if (label && !labels.includes(label)) labels.push(label);
  }
  if (!labels.length) return composed(lookups, "LOC_LSHUF_BIAS_NONE");
  return composed(lookups, "LOC_LSHUF_BIAS_LINE", labels.join(", "));
}

/**
 * Bias rows of one leader from a set of LShufResultBiases rows.
 */
export const biasRowsOf = (biases, leaderType) => (biases || []).filter((row) => row.LeaderType === leaderType);
