// Reading and writing the config rows the leader screens draw from (SPEC section 2, "What the leader screens read"):
// each leader's KIND_TRAIT row in LeaderItems (ability name and text) and its TAG_TRAIT_* rows in LeaderTags (the
// attribute icons). Both scopes: the shell writes them before the game starts, the game writes them again for a loaded
// save. Probe 8 watched both writes reach the screens.
//
// Name keeps a text key where one fits (the screens stylize it); Description holds composed text in the player's
// language, since a dealt description has no key of its own (CONTRACTS.md 8, 11).
import { DEAL_VERSION_UNKNOWN, fnv1a } from "/uncharted-leaders-and-civs/ui/display/lshuf-display-util.js";
import {
  assembleDescription,
  biasLine,
  biasRowsOf
} from "/uncharted-leaders-and-civs/ui/display/lshuf-display-text.js";
import {
  MODE, A_MODE
} from "/uncharted-leaders-and-civs/shared/lshuf-constants.js";

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

// --- the civ select's rows (CONTRACTS 14) ---

const UNIQUE_KINDS = ["KIND_UNIT", "KIND_BUILDING", "KIND_QUARTER", "KIND_IMPROVEMENT"];

/**
 * The civ select's rows: CivilizationType -> { rows: [every row of that civ, as the table holds it] }. The civ cards
 * read the KIND_TRAIT row (the ability) and the unique rows per age domain. The live table has been rewritten once
 * the mod has shown a deal, so a civ's shipped rows come from the copy in SHIPPED_CIV_ITEMS
 * (data/frontend/civ-items-copy.sql).
 * @returns {Map<string, { rows: object[] }>}
 */
export const SHIPPED_CIV_ITEMS = "LShufSetup_CivilizationItems";
const SHIPPED_CIV_TAGS = "LShufSetup_CivilizationTags";
const TAG_LIKE = "TagType LIKE 'TAG\\_TRAIT\\_%' ESCAPE '\\'";

// Each civ's rows, and its attribute tags (TAG_TRAIT_*, CONTRACTS 30) by domain: the shipped copy's when reading the
// shipped rows, the live ones otherwise. A database without the tags copy leaves `tagRows` out.
export function readCivItemRows(table = "CivilizationItems") {
  const out = new Map();
  const sql = "SELECT CivilizationDomain, CivilizationType, AgeType, Type, Kind, Name, Description, Icon, SortIndex, "
    + `CanSyncretize FROM ${table} ORDER BY CivilizationType, CivilizationDomain, SortIndex`;
  for (const row of configQuery(sql) || []) {
    if (!out.has(row.CivilizationType)) out.set(row.CivilizationType, { rows: [] });
    out.get(row.CivilizationType).rows.push({ ...row });
  }
  const tagTable = table === SHIPPED_CIV_ITEMS ? SHIPPED_CIV_TAGS : "CivilizationTags";
  const tags = configQuery(`SELECT CivilizationDomain, CivilizationType, TagType FROM ${tagTable} WHERE ${TAG_LIKE} `
    + "ORDER BY CivilizationType, CivilizationDomain, TagType");
  for (const t of tags || []) {
    const civ = out.get(t.CivilizationType);
    if (civ) (civ.tagRows || (civ.tagRows = [])).push({ ...t });
  }
  return out;
}

// A civ's attribute tags, in its first domain's order; null when its rows carry none.
const tagsOfRows = (tagRows) => {
  if (!tagRows || !tagRows.length) return null;
  const first = tagRows[0].CivilizationDomain;
  return tagRows.filter((t) => t.CivilizationDomain === first).map((t) => t.TagType);
};

// The civ's attribute tags in every domain its shipped tags sit in (CONTRACTS 30).
function writeCivTags(civType, tags, shipped) {
  const domains = [...new Set(((shipped && shipped.tagRows) || []).map((t) => t.CivilizationDomain))];
  if (!tags || !domains.length) return [];
  const where = `CivilizationType = ${sqlText(civType)}`;
  const ok = [configQuery(`DELETE FROM CivilizationTags WHERE ${where} AND ${TAG_LIKE}`)];
  for (const domain of domains) {
    for (const tag of tags) {
      ok.push(configQuery("INSERT OR IGNORE INTO CivilizationTags (CivilizationDomain, CivilizationType, TagType) VALUES ("
        + `${sqlText(domain)}, ${sqlText(civType)}, ${sqlText(tag)})`));
    }
  }
  return ok;
}

/**
 * What the civ select should show for one civilization: its ability row(s) with these Name/Description keys, and
 * these unique rows (CivilizationItems-shaped) in place of its own. Returns false when a query failed.
 * @param {string} civType
 * @param {{ ability: { Name: string, Description: string } | null, uniques: object[] }} view
 * @param {{ rows: object[] }} shipped the civ's rows from readCivItemRows
 */
export function writeCivItemRows(civType, view, shipped) {
  const where = `CivilizationType = ${sqlText(civType)}`;
  const ok = [];
  if (view.ability) {
    ok.push(configQuery(`UPDATE CivilizationItems SET Name = ${sqlText(view.ability.Name)}, `
      + `Description = ${sqlText(view.ability.Description)} WHERE ${where} AND Kind = 'KIND_TRAIT'`));
  }
  const kinds = UNIQUE_KINDS.map(sqlText).join(", ");
  ok.push(configQuery(`DELETE FROM CivilizationItems WHERE ${where} AND Kind IN (${kinds})`));
  // The domains the civ's own unique rows sit in (as shipped, the home age's, with no age on the row), so a unique
  // shows where the civ's uniques show and once only.
  const rows = shipped ? shipped.rows : [];
  const uniqueRows = rows.filter((r) => UNIQUE_KINDS.includes(r.Kind));
  const domains = [...new Set((uniqueRows.length ? uniqueRows : rows).map((r) => `${r.CivilizationDomain}|${r.AgeType || ""}`))];
  for (const key of domains) {
    const [domain, age] = key.split("|");
    for (const u of view.uniques) {
      ok.push(configQuery("INSERT OR IGNORE INTO CivilizationItems (CivilizationDomain, CivilizationType, AgeType, Type, "
        + "Kind, Name, Description, Icon, SortIndex, CanSyncretize) VALUES ("
        + [domain, civType, age || null, u.Type, u.Kind, u.Name, u.Description, u.Icon, u.SortIndex, u.CanSyncretize]
          .map((v) => (typeof v === "number" ? String(v) : sqlText(v))).join(", ") + ")"));
    }
  }
  ok.push(...writeCivTags(civType, view.tags, shipped));
  return ok.every((result) => result !== null);
}

/**
 * A civ's shipped view: its ability keys and its own unique rows (first age domain's), from readCivItemRows.
 */
export function shippedCivView(shipped) {
  const rows = shipped ? shipped.rows : [];
  const trait = rows.find((r) => r.Kind === "KIND_TRAIT") || null;
  const firstDomain = rows.length ? rows[0].CivilizationDomain : null;
  const uniques = rows.filter((r) => UNIQUE_KINDS.includes(r.Kind) && r.CivilizationDomain === firstDomain);
  return { ability: trait ? { Name: trait.Name, Description: trait.Description } : null, uniques,
    tags: tagsOfRows(shipped && shipped.tagRows) };
}

// Abilities split into bonuses: the ctx's Abilities part (CONTRACTS 15), with the old mode names as a fallback.
const isSplit = (ctx) => ctx.abilities === A_MODE.Split
  || (!ctx.abilities && (ctx.mode === MODE.SplitMatched || ctx.mode === MODE.SplitRandom));

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
  const from = !isSplit(ctx) && leader.AbilityFrom ? ctx.abilityOf(leader.AbilityFrom) : null;
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
