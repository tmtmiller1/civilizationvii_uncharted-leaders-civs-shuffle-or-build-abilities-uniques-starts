// Reading and writing the config rows the leader screens draw from (SPEC section 2, "What the leader screens read"):
// each leader's KIND_TRAIT row in LeaderItems (ability name and text) and its TAG_TRAIT_* rows in LeaderTags (the
// attribute icons). Both scopes: the shell writes them before the game starts, the game writes them again for a loaded
// save. Probe 8 watched both writes reach the screens.
//
// Name keeps a text key where one fits (the screens stylize it); Description holds composed text in the player's
// language, since a dealt description has no key of its own (CONTRACTS.md 8, 11).
import { DEAL_VERSION_UNKNOWN, fnv1a } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/display/lshuf-display-util.js";
import {
  assembleDescription,
  biasLine,
  biasRowsOf
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/display/lshuf-display-text.js";
import { MODE } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";

const sqlText = (value) => (value == null ? "NULL" : `'${String(value).replace(/'/g, "''")}'`);

function configQuery(sql) {
  try {
    return Database.query("config", sql) || [];
  } catch (error) {
    console.error(`[lshuf] config query failed: ${error} :: ${sql.slice(0, 160)}`);
    return null;
  }
}

/**
 * The attribute tags the mod rewrites, from LShufAttributeTraits (the lead's rows, loaded in both scopes).
 * @param {(name: string) => object[]} readTable
 * @returns {Map<string, string>} TraitType -> TagType
 */
export function attributeTags(readTable) {
  const map = new Map();
  for (const row of readTable("LShufAttributeTraits") || []) map.set(row.TraitType, row.TagType);
  return map;
}

/**
 * The leader screens' rows as they stand now: LeaderType -> { domain, type, name, description, tags }.
 * @param {Iterable<string>} tagTypes the TAG_TRAIT_* tags the mod rewrites
 */
export function readLeaderRows(tagTypes) {
  const tags = [...tagTypes];
  const rows = new Map();
  for (const item of configQuery("SELECT LeaderDomain, LeaderType, Type, Name, Description FROM LeaderItems "
    + "WHERE Kind = 'KIND_TRAIT'") || []) {
    if (rows.has(item.LeaderType)) continue;
    rows.set(item.LeaderType, {
      domain: item.LeaderDomain,
      type: item.Type,
      name: item.Name,
      description: item.Description,
      tags: []
    });
  }
  if (tags.length) {
    const list = tags.map(sqlText).join(", ");
    for (const tag of configQuery(`SELECT LeaderType, TagType FROM LeaderTags WHERE TagType IN (${list})`) || []) {
      rows.get(tag.LeaderType)?.tags.push(tag.TagType);
    }
  }
  return rows;
}

/**
 * Writes one leader's ability name, description and attribute tags. Returns false when a query failed.
 * @param {string} leaderType
 * @param {{ name: string, description: string, tags: string[] }} view
 * @param {{ domain: string }} current its row from readLeaderRows
 * @param {string[]} tagTypes every tag the mod rewrites
 */
export function writeLeaderRows(leaderType, view, current, tagTypes) {
  const domain = current && current.domain ? current.domain : "StandardLeaders";
  const where = `LeaderType = ${sqlText(leaderType)}`;
  const ok = [
    configQuery(`UPDATE LeaderItems SET Name = ${sqlText(view.name)}, Description = ${sqlText(view.description)} `
      + `WHERE ${where} AND Kind = 'KIND_TRAIT'`),
    configQuery(`DELETE FROM LeaderTags WHERE ${where} AND TagType IN (${tagTypes.map(sqlText).join(", ")})`)
  ];
  for (const tag of view.tags) {
    ok.push(configQuery("INSERT OR IGNORE INTO LeaderTags (LeaderDomain, LeaderType, TagType) VALUES "
      + `(${sqlText(domain)}, ${sqlText(leaderType)}, ${sqlText(tag)})`));
  }
  return ok.every((result) => result !== null);
}

const isSplit = (mode) => mode === MODE.SplitMatched || mode === MODE.SplitRandom;

/**
 * What the leader screens show for one leader after a deal.
 * @param {string} leaderType
 * @param {{leaders: object[], pieces: object[], attributes: object[], biases: object[]}} deal DealResult-shaped rows
 * @param {object} ctx { mode, abilityOf, compose, targetName, mapSetsStarts, tagOf: Map, extraLines }
 * @returns {{ name: string, description: string, tags: string[] } | null}
 */
export function leaderView(leaderType, deal, ctx) {
  const own = ctx.abilityOf(leaderType);
  if (!own) return null;
  const leader = (deal.leaders || []).find((row) => row.LeaderType === leaderType);
  if (!leader) return null;
  const from = !isSplit(ctx.mode) && leader.AbilityFrom ? ctx.abilityOf(leader.AbilityFrom) : null;
  const pieces = (deal.pieces || []).filter((row) => row.LeaderType === leaderType);
  const bias = biasLine(biasRowsOf(deal.biases, leaderType), ctx);
  const description = assembleDescription(pieces, { ...ctx, extraLines: [bias, ...(ctx.extraLines || [])] });
  return { name: (from || own).name, description, tags: tagsOf(leaderType, deal.attributes, ctx.tagOf) };
}

/** The attribute tags for a leader's LShufResultAttributes rows (TRAIT_LSHUF_EQUAL_ACTIONS has none). */
export function tagsOf(leaderType, attributes, tagOf) {
  const tags = [];
  for (const row of attributes || []) {
    if (row.LeaderType !== leaderType) continue;
    const tag = tagOf.get(row.TraitType);
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

/**
 * A short fingerprint of one leader's deal (pieces in order, attributes, biases), so the game can tell whether the
 * setup screen's preview matched what the game dealt.
 */
export function leaderSignature(leaderType, deal) {
  const pieces = (deal.pieces || [])
    .filter((row) => row.LeaderType === leaderType)
    .sort((a, b) => Number(a.SortIndex) - Number(b.SortIndex))
    .map((row) => row.PieceId);
  const attributes = (deal.attributes || [])
    .filter((row) => row.LeaderType === leaderType)
    .map((row) => row.TraitType)
    .sort();
  const biases = biasRowsOf(deal.biases, leaderType)
    .map((row) => `${row.TableName}:${row.TargetType || ""}:${row.Score}`)
    .sort();
  return fnv1a(`${pieces.join(",")}|${attributes.join(",")}|${biases.join(",")}`);
}

/** The preview the shell stores in LShufPreview: { v, seed, leaders: { LEADER_X: signature } }. */
export function previewOf(deal, seed, dealVersion) {
  const leaders = {};
  for (const row of deal.leaders || []) leaders[row.LeaderType] = leaderSignature(row.LeaderType, deal);
  return { v: dealVersion == null ? DEAL_VERSION_UNKNOWN : dealVersion, seed, leaders };
}

/**
 * The leaders whose game deal differs from the stored preview. Leaders only one side knows (a mod installed after
 * setup, a DLC the shell listed but the game didn't load) count as different only when the other side dealt them.
 */
export function previewDifferences(preview, deal) {
  if (!preview || !preview.leaders) return [];
  const differs = [];
  for (const row of deal.leaders || []) {
    const before = preview.leaders[row.LeaderType];
    if (before == null) continue;
    if (before !== leaderSignature(row.LeaderType, deal)) differs.push(row.LeaderType);
  }
  return differs;
}
