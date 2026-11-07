// Card data for the Build your own leader screen (CONTRACTS section 13, SPEC 7b), shell scope. Every card is one
// build piece id: a bullet or whole ability from LShufMapping, an attribute kind from LShufAttributeTraits, a
// leader's AI behavior, a leader's start terrain, or a civilization's start terrain. Read from the setup-side copies
// the shell group loads (LShufSetup_*, the mapping) and the frontend Leaders / Civilizations rows, with the game's
// text composed in the player's language. The picks live in the hidden text parameter LShufBuildPicks.

import {
  A_MODE, B_MODE, BUILD, BUILD_KIND, BUILD_UNREVIEWED_BULLETS, BIAS_TABLES, GENERIC_BIASES, ONOFF, PARAM, T_MODE,
  biasTableOfTag, pieceId,
  splitTags, joinTags, buildKindOf
} from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";
import { KNOWN_LEADERS } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-known-leaders.js";
import { joinBullets, splitBullets } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-text.js";
import {
  findParam, paramValue, setParam
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-params.js";
import { isLocalHost } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-config.js";
import {
  attributeIcon, civBackground, civSymbol, leaderPortrait, uniqueIcon
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-art.js";

export const PICKS_PARAM = "LShufBuildPicks";
const PLAIN_RANDOM = "RANDOM";

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
const composedOrEmpty = (key) => {
  if (!key) return "";
  const text = compose(key);
  return text === key ? "" : text;
};

const plainWords = (type) => String(type || "").replace(/^(BIOME|TERRAIN|FEATURE_CLASS|RESOURCE)_/, "")
  .toLowerCase().split("_").map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");

function query(sql) {
  try {
    return Database.query("config", sql) || [];
  } catch (e) {
    log(`query failed: ${e} :: ${sql.slice(0, 120)}`);
    return [];
  }
}

// --- the host's slot ---

export function hostLeader() {
  try {
    const p = Configuration.getPlayer(GameContext.localPlayerID);
    const l = p ? String(p.leaderTypeName || PLAIN_RANDOM) : PLAIN_RANDOM;
    return l === PLAIN_RANDOM ? null : l;
  } catch (_) {
    return null;
  }
}

export function hostCiv() {
  try {
    const p = Configuration.getPlayer(GameContext.localPlayerID);
    const c = p ? String(p.civilizationTypeName || PLAIN_RANDOM) : PLAIN_RANDOM;
    return c === PLAIN_RANDOM ? null : c;
  } catch (_) {
    return null;
  }
}

// Why the screen is disabled, or null when the player can build: the matching LOC_LSHUF_BUILD_* note.
// Any of the three parts doing something (not Normal, not Off), the deal's `active`.
export function partsActive() {
  const live = (paramId, normal) => {
    const v = paramValue(paramId) || normal;
    return v !== normal && v !== ONOFF.Off;
  };
  return live(PARAM.Abilities, A_MODE.Normal) || live(PARAM.Attributes, T_MODE.Normal)
    || live(PARAM.Biases, B_MODE.Normal);
}

export function disabledNote() {
  if (!findParam(PICKS_PARAM)) return "LOC_LSHUF_BUILD_NO_LEADER";
  if (!isLocalHost()) return "LOC_LSHUF_BUILD_HOST_ONLY";
  if (!partsActive()) return "LOC_LSHUF_BUILD_MODE_OFF";
  if (!hostLeader()) return "LOC_LSHUF_BUILD_NO_LEADER";
  return null;
}

// --- picks ---

// Builder slot n's picks parameter (slot 1 is PICKS_PARAM; CONTRACTS 13, builder slots).
export const picksParam = (n = 1) => (n === 1 ? PICKS_PARAM : `${PICKS_PARAM}${n}`);

export const readPicks = (n = 1) => splitTags(paramValue(picksParam(n)));

export function writePicks(ids, n = 1) {
  const value = joinTags([...new Set(ids)]);
  return setParam(picksParam(n), value === null ? "" : value);
}

// --- reading the tables ---

function leaderRows() {
  const names = new Map();
  for (const r of query("SELECT LeaderType, LeaderName, LeaderIcon FROM Leaders WHERE LeaderType <> 'RANDOM'")) {
    if (!names.has(r.LeaderType)) names.set(r.LeaderType, { name: compose(r.LeaderName), icon: r.LeaderIcon });
  }
  return names;
}

function leaderTags() {
  const tags = new Map();
  for (const r of query("SELECT LeaderType, TagType FROM LeaderTags WHERE TagType LIKE 'TAG_TRAIT_%'")) {
    if (!tags.has(r.LeaderType)) tags.set(r.LeaderType, []);
    if (!tags.get(r.LeaderType).includes(r.TagType)) tags.get(r.LeaderType).push(r.TagType);
  }
  return tags;
}

function tagNames() {
  const names = new Map();
  for (const r of query("SELECT TagType, Name FROM Tags WHERE TagType LIKE 'TAG_TRAIT_%'")) {
    names.set(r.TagType, compose(r.Name));
  }
  return names;
}

function civRows() {
  const civs = new Map();
  const rows = query(
    "SELECT CivilizationType, CivilizationName, CivilizationIcon FROM Civilizations WHERE CivilizationType <> 'RANDOM'"
  );
  for (const r of rows) {
    if (!civs.has(r.CivilizationType)) {
      civs.set(r.CivilizationType, { name: compose(r.CivilizationName), icon: r.CivilizationIcon });
    }
  }
  return civs;
}

// The civilizations' abilities and uniques from the setup copy (CONTRACTS 14): CivilizationType -> rows of
// { kind: 'ability' | 'unit' | 'building' | 'quarter' | 'improvement', type, nameKey, descKey }. Empty until the
// setup copy carries the table.
function civItems() {
  const out = new Map();
  const rows = query("SELECT CivilizationType, Age, Kind, Type, NameKey, DescKey, TraitType FROM LShufSetup_CivItems "
    + "ORDER BY CivilizationType, Kind, Type");
  for (const r of rows) {
    if (!out.has(r.CivilizationType)) out.set(r.CivilizationType, []);
    out.get(r.CivilizationType).push({
      kind: r.Kind, type: r.Type, nameKey: r.NameKey, descKey: r.DescKey, age: r.Age, trait: r.TraitType
    });
  }
  return out;
}

// CivilizationType -> its age (LShufSetup_LegacyCivilizations).
// The civics card text (CONTRACTS 18), in the detail the other cards have: the tree's civics, then each tradition
// with its description, then each building, quarter, improvement and civics-only unit with its icon and description.
// Traditions come from the shell's own Traditions table (by the civ's base trait), the unlocks' text and icons from
// its CivilizationItems rows; LShufSetup_CivCivics says which types the tree unlocks. A name the shell can't compose
// reads as plain words from its type.
const CIVIC_KIND_WORD = {
  KIND_BUILDING: "building", KIND_QUARTER: "quarter", KIND_IMPROVEMENT: "improvement", KIND_UNIT: "unit"
};
const sq = (text) => String(text).replace(/'/g, "''");
const plainType = (type) => plainWords(String(type || "").replace(/^(NODE_CIVIC|TRADITION|BUILDING|QUARTER|IMPROVEMENT|UNIT)_/, ""));
const nameOrType = (key, type) => composedOrEmpty(key) || plainType(type);

// One unlock's line: "<icon> <Kind> <Name>: <description>" from its CivilizationItems row where the shell has one.
function civicsUnlockLine(r, item) {
  const kind = CIVIC_KIND_WORD[item ? item.Kind : r.UnlockKind] || (r.UnlockKind === "KIND_UNIT" ? "unit" : "building");
  const name = nameOrType(item ? item.Name : r.UnlockNameKey, r.UnlockType);
  const icon = kind === "quarter" ? "" : `[icon:${r.UnlockType}] `;
  const text = item ? composedOrEmpty(item.Description) : "";
  return `${icon}${compose("LOC_LSHUF_BUILD_CIVICS_UNLOCK", compose(UNIQUE_KIND_KEY[kind]), name, text)}`;
}

function civicsUnlockLines(civ, rows) {
  const items = new Map();
  for (const r of query(`SELECT Kind, Type, Name, Description FROM CivilizationItems WHERE CivilizationType = '${sq(civ)}'`)) {
    if (!items.has(r.Type)) items.set(r.Type, r);
  }
  const lines = [];
  const seen = new Set();
  for (const r of rows) {
    if (!r.UnlockType || r.UnlockKind === "KIND_TRADITION" || seen.has(r.UnlockType)) continue;
    seen.add(r.UnlockType);
    lines.push(civicsUnlockLine(r, items.get(r.UnlockType)));
  }
  return lines;
}

// The tree for the civ build screen's tree view: [{ node, name, cost, depth, prereqs: [...], unlocks: [lines] }] in
// depth then node order, each node's unlock lines in the detail the civics card has.
export function civicsTreeData(civ) {
  const nodes = query("SELECT NodeType, NameKey, Cost, Depth, Prereqs FROM LShufSetup_CivicNodes "
    + `WHERE CivilizationType = '${sq(civ)}' ORDER BY Depth, NodeType`);
  if (!nodes.length) return [];
  const rows = query("SELECT NodeType, NodeNameKey, UnlockType, UnlockKind, UnlockNameKey FROM LShufSetup_CivCivics "
    + `WHERE CivilizationType = '${sq(civ)}' ORDER BY NodeType, UnlockKind, UnlockType`);
  const traditions = new Map();
  for (const t of query("SELECT TraditionType, Name, Description FROM Traditions")) traditions.set(t.TraditionType, t);
  return nodes.map((n) => {
    const own = rows.filter((r) => r.NodeType === n.NodeType && r.UnlockType);
    const unlocks = own.filter((r) => r.UnlockKind === "KIND_TRADITION").map((r) => {
      const t = traditions.get(r.UnlockType);
      return compose("LOC_LSHUF_BUILD_CIVICS_TRADITION", nameOrType(t ? t.Name : r.UnlockNameKey, r.UnlockType),
        t ? composedOrEmpty(t.Description) : "");
    });
    unlocks.push(...civicsUnlockLines(civ, own));
    return {
      node: n.NodeType, name: nameOrType(n.NameKey, n.NodeType), cost: Number(n.Cost || 0), depth: Number(n.Depth || 0),
      prereqs: String(n.Prereqs || "").split("|").filter(Boolean), unlocks
    };
  });
}

function civCivicsText(civ, treeName, baseTrait) {
  const rows = query("SELECT NodeType, NodeNameKey, UnlockType, UnlockKind, UnlockNameKey FROM LShufSetup_CivCivics "
    + `WHERE CivilizationType = '${sq(civ)}' ORDER BY NodeType, UnlockKind, UnlockType`);
  const civics = [...new Set(rows.map((r) => nameOrType(r.NodeNameKey, r.NodeType)).filter(Boolean))].join(", ");
  const lines = [compose("LOC_LSHUF_BUILD_CIVICS_TREE", treeName, civics || "-")];
  const traditions = baseTrait
    ? query(`SELECT TraditionType, Name, Description FROM Traditions WHERE TraitType = '${sq(baseTrait)}' ORDER BY TraditionType`)
    : [];
  for (const t of traditions) {
    lines.push(compose("LOC_LSHUF_BUILD_CIVICS_TRADITION", nameOrType(t.Name, t.TraditionType), composedOrEmpty(t.Description)));
  }
  lines.push(...civicsUnlockLines(civ, rows));
  return joinBullets(lines);
}

// CivilizationType -> its movable bonus pieces (CONTRACTS 19), from the civilization mapping the shell loads.
function civPieces() {
  const out = new Map();
  const rows = query("SELECT PieceId, CivilizationType, Age, BulletIndex, BulletCount, Value FROM LShufCivMapping "
    + "WHERE Kind = 'bullet' AND Movable = 1 ORDER BY CivilizationType, BulletIndex");
  for (const r of rows) {
    if (!out.has(r.CivilizationType)) out.set(r.CivilizationType, []);
    out.get(r.CivilizationType).push(r);
  }
  return out;
}

function civAges() {
  const out = new Map();
  for (const r of query("SELECT CivilizationType, Age FROM LShufSetup_LegacyCivilizations")) {
    if (!out.has(r.CivilizationType)) out.set(r.CivilizationType, r.Age);
  }
  return out;
}

// Each leader's shipped ability: { trait, name, description } composed.
function abilities() {
  const out = new Map();
  const rows = query(`SELECT lt.LeaderType, t.TraitType, t.Name, t.Description FROM LShufSetup_LeaderTraits lt
    JOIN LShufSetup_Traits t ON t.TraitType = lt.TraitType WHERE t.Name IS NOT NULL`);
  for (const r of rows) {
    if (!out.has(r.LeaderType)) {
      const description = composedOrEmpty(r.Description);
      out.set(r.LeaderType, { trait: r.TraitType, name: composedOrEmpty(r.Name), description });
    }
  }
  return out;
}

// Each leader's agendas, from the setup copy: name key plus the game's _DESC, _DESC_LIKES and _DESC_DISLIKES text
// beside it (whichever of them the game has).
function agendas() {
  const out = new Map();
  const failed = [];
  for (const r of query("SELECT LeaderType, NameKey FROM LShufSetup_LeaderAgendas ORDER BY LeaderType, NameKey")) {
    const stem = String(r.NameKey).replace(/_NAME$/, "");
    const composedName = composedOrEmpty(r.NameKey);
    if (!composedName) failed.push(`${r.NameKey} -> ${JSON.stringify(compose(r.NameKey))}`);
    const agenda = {
      // A name key that won't compose here still gets a readable name from the key itself.
      name: composedName || plainWords(stem.replace(/^LOC_DIPLOMACY_AGENDA_/, "")),
      text: composedOrEmpty(`${stem}_DESC`),
      likes: composedOrEmpty(`${stem}_DESC_LIKES`),
      dislikes: composedOrEmpty(`${stem}_DESC_DISLIKES`)
    };
    if (!out.has(r.LeaderType)) out.set(r.LeaderType, []);
    out.get(r.LeaderType).push(agenda);
  }
  if (failed.length) console.warn(`[lshuf-build] agenda names that didn't compose: ${failed.join("; ")}`);
  const thin = [...out].filter(([, list]) => list.some((a) => !a.likes && !a.dislikes && !a.text)).map(([l]) => l);
  if (thin.length) console.warn(`[lshuf-build] agendas with no text: ${thin.join(", ")}`);
  return out;
}

// Each leader's favorite civilizations, best first, as composed names.
function favoredCivs(civNames) {
  const out = new Map();
  const rows = query("SELECT Leader, Civilization, Priority FROM LShufSetup_LeaderCivPriorities ORDER BY Leader, Priority DESC, Civilization");
  for (const r of rows) {
    const civ = civNames.get(r.Civilization);
    if (!civ) continue;
    if (!out.has(r.Leader)) out.set(r.Leader, []);
    out.get(r.Leader).push(civ.name);
  }
  return out;
}

// What an AI behavior card holds, line by line: each agenda with its text, likes and dislikes, then the favorites.
function behaviorText(leader, ctx) {
  const lines = [];
  for (const a of ctx.agendas.get(leader) || []) {
    if (a.name) lines.push(compose("LOC_LSHUF_BUILD_AGENDA", a.name));
    // The game's _DESC repeats what _DESC_LIKES and _DESC_DISLIKES say; show the pair when it has them.
    if (a.likes || a.dislikes) {
      if (a.likes) lines.push(compose("LOC_LSHUF_BUILD_LIKES", a.likes));
      if (a.dislikes) lines.push(compose("LOC_LSHUF_BUILD_DISLIKES", a.dislikes));
    } else if (a.text) lines.push(a.text);
  }
  const favorites = ctx.favorites.get(leader) || [];
  if (favorites.length) lines.push(compose("LOC_LSHUF_BUILD_FAVORS", favorites.slice(0, 6).join(", ")));
  return joinBullets(lines);
}

function biasRows() {
  const byLeader = new Map();
  const byCiv = new Map();
  const target = { StartBiasBiomes: "BiomeType", StartBiasTerrains: "TerrainType", StartBiasFeatureClasses: "FeatureClassType",
    StartBiasResources: "ResourceType" };
  for (const table of BIAS_TABLES) {
    const col = target[table] ? `${target[table]} AS TargetType` : "NULL AS TargetType";
    for (const r of query(`SELECT LeaderType, CivilizationType, ${col}, Score FROM LShufSetup_${table}`)) {
      const row = { TableName: table, TargetType: r.TargetType, Score: r.Score };
      const map = r.LeaderType ? byLeader : byCiv;
      const key = r.LeaderType || r.CivilizationType;
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
  }
  return { byLeader, byCiv };
}

// Start terrain in words. The game's name key for each target comes from the setup copy (LShufSetup_TypeNames); a
// key the text database doesn't hold falls back to the type's own words ("BIOME_TROPICAL" -> "Tropical"), so a card
// never shows a LOC tag, and a leader or civilization with rows never reads as "starts anywhere".
const BIAS_WORD_KEYS = {
  StartBiasAdjacentToCoasts: "LOC_LSHUF_BIAS_COAST",
  StartBiasRivers: "LOC_LSHUF_BIAS_RIVER",
  StartBiasLakes: "LOC_LSHUF_BIAS_LAKE",
  StartBiasNaturalWonders: "LOC_LSHUF_BIAS_NATURAL_WONDER",
  StartBiasIslands: "LOC_LSHUF_BIAS_ISLAND"
};
let typeNameKeys = null;
function typeNames() {
  if (!typeNameKeys) {
    typeNameKeys = new Map();
    for (const r of query("SELECT Type, Name FROM LShufSetup_TypeNames")) typeNameKeys.set(r.Type, r.Name);
  }
  return typeNameKeys;
}
function sayKey(key, fallback) {
  const text = key ? compose(key) : "";
  return !text || text === key || /^LOC_/.test(text) ? fallback : text;
}
function biasText(rows) {
  const sorted = (rows || []).filter((r) => Number(r.Score) > 0)
    .sort((a, b) => Number(b.Score) - Number(a.Score)
      || BIAS_TABLES.indexOf(a.TableName) - BIAS_TABLES.indexOf(b.TableName));
  const labels = [];
  for (const r of sorted) {
    const word = BIAS_WORD_KEYS[r.TableName];
    let label = word ? sayKey(word, plainWords(r.TableName.replace("StartBias", ""))) : "";
    if (!word && r.TargetType) {
      label = sayKey(typeNames().get(r.TargetType), plainWords(r.TargetType));
      if (r.TableName === "StartBiasResources") label = `[icon:${r.TargetType}] ${label}`;
    }
    if (label && !labels.includes(label)) labels.push(label);
  }
  if (!labels.length) return sayKey("LOC_LSHUF_BIAS_NONE", "Starts anywhere the map puts them");
  const list = labels.join(", ");
  const line = compose("LOC_LSHUF_BIAS_LINE", list);
  return !line || /^LOC_/.test(line) ? `Starts near: ${list}` : line;
}

// --- the cards ---

// A bullet piece's text: the generated per-bullet key first, else the bullet(s) cut from the live description.
// Written as a bullet list, so a single bonus reads the way the whole ability does.
function bulletPieceText(piece, liveBullets, prefix = "LOC_LSHUF_PIECE_") {
  const first = Number(piece.BulletIndex);
  const count = Math.max(1, Number(piece.BulletCount || 1));
  const generated = composedOrEmpty(`${prefix}${piece.PieceId}`);
  const parts = generated ? generated.split("[N]") : liveBullets.slice(first - 1, first - 1 + count);
  return joinBullets(parts.filter(Boolean));
}

function abilityCards(ctx) {
  const cards = [];
  const mapping = query(
    "SELECT PieceId, LeaderType, BulletIndex, BulletCount, Value, Reviewed FROM LShufMapping WHERE Kind = 'bullet' ORDER BY LeaderType, BulletIndex"
  );
  const bulletsOf = new Map();
  for (const r of mapping) {
    if (!bulletsOf.has(r.LeaderType)) bulletsOf.set(r.LeaderType, []);
    bulletsOf.get(r.LeaderType).push(r);
  }
  for (const leader of ctx.leaders) {
    const ability = ctx.abilities.get(leader);
    if (!ability) continue;
    const bullets = bulletsOf.get(leader) || [];
    const reviewed = bullets.length > 0 && bullets.every((b) => Number(b.Reviewed) === 1);
    const base = {
      leader, civ: null, tags: ctx.tags.get(leader) || [], portrait: leaderPortrait(leader),
      from: ctx.names.get(leader).name
    };
    const wholeValue = bullets.reduce((sum, b) => sum + Number(b.Value || 1), 0) || 5;
    cards.push({
      ...base, id: pieceId.whole(leader), kind: BUILD_KIND.Whole, name: ability.name, text: ability.description,
      value: wholeValue, reviewed: true, bullets: bullets.length
    });
    const live = splitBullets(ability.description).bullets;
    for (const b of bullets) {
      const first = Number(b.BulletIndex);
      const text = bulletPieceText(b, live);
      cards.push({
        ...base, id: b.PieceId, kind: BUILD_KIND.Bullet, name: `${ability.name} ${first}`, text,
        value: Number(b.Value || 1), reviewed: reviewed || BUILD_UNREVIEWED_BULLETS, bullets: 1
      });
    }
  }
  return cards;
}

function attributeCards(ctx) {
  const cards = [];
  const rows = query("SELECT TraitType, AttributeType, TagType FROM LShufAttributeTraits");
  const holders = new Map();
  for (const r of query("SELECT LeaderType, TraitType FROM LShufSetup_LeaderTraits")) {
    if (!holders.has(r.TraitType)) holders.set(r.TraitType, []);
    holders.get(r.TraitType).push(r.LeaderType);
  }
  const actions = new Map();
  const sql = "SELECT TraitType, ActionType, ActionNameKey FROM LShufSetup_AttributeActions ORDER BY TraitType, ActionType";
  for (const a of query(sql)) {
    if (!actions.has(a.TraitType)) actions.set(a.TraitType, []);
    const name = composedOrEmpty(a.ActionNameKey) || plainWords(String(a.ActionType).replace(/^DIPLOMACY_ACTION_/, ""));
    actions.get(a.TraitType).push(name);
  }
  for (const r of rows) {
    const who = (holders.get(r.TraitType) || []).filter((l) => ctx.names.has(l)).map((l) => ctx.names.get(l).name);
    const kind = ctx.tagNames.get(r.TagType) || r.AttributeType;
    const lines = [compose("LOC_LSHUF_BUILD_ATTRIBUTE_DESC", kind, (actions.get(r.TraitType) || []).join(", "))];
    if (who.length) lines.push(compose("LOC_LSHUF_BUILD_HELD_BY", who.join(", ")));
    cards.push({
      id: BUILD.attribute(r.TraitType), kind: BUILD_KIND.Attribute, leader: null, civ: null, tags: [r.TagType],
      name: kind, text: joinBullets(lines), value: 2, reviewed: true,
      icon: attributeIcon(r.TagType), from: "", attributeTrait: r.TraitType
    });
  }
  return cards;
}

function personaAndBiasCards(ctx) {
  const cards = [];
  for (const leader of ctx.leaders) {
    const name = ctx.names.get(leader).name;
    const base = {
      leader, civ: null, tags: ctx.tags.get(leader) || [], portrait: leaderPortrait(leader), from: name, reviewed: true
    };
    const agendaName = (ctx.agendas.get(leader) || []).map((a) => a.name).filter(Boolean).join(", ");
    cards.push({ ...base, id: BUILD.persona(leader), kind: BUILD_KIND.Persona, name: agendaName || name,
      text: behaviorText(leader, ctx), value: 1 });
    const biasRowsHere = (ctx.biases.byLeader.get(leader) || []).filter((r) => Number(r.Score) > 0);
    cards.push({ ...base, id: BUILD.bias(leader), kind: BUILD_KIND.Bias, name, noTerrain: !biasRowsHere.length,
      text: joinBullets([biasRowsHere.length ? biasText(biasRowsHere) : compose("LOC_LSHUF_BUILD_NO_OWN_TERRAIN")]),
      value: 1 });
  }
  for (const [tag, score] of GENERIC_BIASES) {
    const word = BIAS_WORD_KEYS[biasTableOfTag(tag)];
    const label = word ? sayKey(word, plainWords(tag)) : sayKey(typeNames().get(tag), plainWords(tag));
    cards.push({
      id: BUILD.genericBias(tag), kind: BUILD_KIND.Bias, leader: null, civ: null, tags: [], name: label, generic: true,
      family: tag.replace(/^(BIOME|TERRAIN|FEATURE_CLASS|RESOURCE)_/, ""),
      from: compose("LOC_LSHUF_BUILD_KIND_GENERIC"), text: joinBullets([compose("LOC_LSHUF_BUILD_GENERIC_DESC", label)]),
      value: Math.max(1, Math.round(Math.log10(score + 1))), reviewed: true, icon: attributeIcon("TAG_TRAIT_EXPANSIONIST")
    });
  }
  for (const [civ, info] of ctx.civs) {
    const rows = ctx.biases.byCiv.get(civ);
    if (!rows || !rows.length) continue;
    cards.push({
      id: BUILD.civBias(civ), kind: BUILD_KIND.CivBias, leader: null, civ, tags: [], name: info.name,
      text: joinBullets([biasText(rows)]), value: 1, reviewed: true, from: "", background: civBackground(civ),
      symbol: civSymbol(civ, info.icon)
    });
  }
  return cards;
}

// The civ build screen's ability and unique cards (CONTRACTS 14): every civilization of the builder civ's age, one
// card for its ability and one per unique. A unique's text is the game's own description; the ability's text is its
// description as a bullet list, like a leader's.
const UNIQUE_KIND_KEY = {
  unit: "LOC_LSHUF_BUILD_UNIQUE_KIND_UNIT",
  building: "LOC_LSHUF_BUILD_UNIQUE_KIND_BUILDING",
  quarter: "LOC_LSHUF_BUILD_UNIQUE_KIND_QUARTER",
  improvement: "LOC_LSHUF_BUILD_UNIQUE_KIND_IMPROVEMENT"
};

function civTextOf(descKey, fallback) {
  const text = composedOrEmpty(descKey);
  if (!text) return joinBullets([fallback].filter(Boolean));
  const parts = splitBullets(text).bullets;
  return parts.length ? joinBullets(parts) : joinBullets([text]);
}

// One bonus card per movable piece of the civ's own age (CONTRACTS 19): "<ability name> n", the piece's text from
// its generated key, else cut from the live description like the leader bullets.
function civBulletCards(ctx, civ, base, ability) {
  const age = ctx.civAges.get(civ);
  const live = splitBullets(composedOrEmpty(ability.descKey)).bullets;
  return (ctx.civPieces.get(civ) || [])
    .filter((p) => age == null || p.Age === age)
    .map((p) => ({
      ...base, id: p.PieceId, kind: BUILD_KIND.CivBullet, name: `${ability.name} ${Number(p.BulletIndex)}`,
      text: bulletPieceText(p, live, "LOC_LSHUF_CIVPIECE_"), value: Number(p.Value || 1)
    }));
}

function civCards(ctx, builderCiv) {
  const cards = [];
  if (!builderCiv) return cards;
  const age = ctx.civAges.get(builderCiv);
  for (const [civ, info] of ctx.civs) {
    if (age != null && ctx.civAges.get(civ) !== age) continue;
    const base = { leader: null, civ, tags: [], from: info.name, reviewed: true, background: civBackground(civ),
      symbol: civSymbol(civ, info.icon), own: civ === builderCiv };
    for (const item of ctx.civItems.get(civ) || []) {
      const name = composedOrEmpty(item.nameKey) || item.type;
      if (item.kind === "ability") {
        cards.push({ ...base, id: BUILD.civAbility(civ), kind: BUILD_KIND.CivAbility, name,
          text: civTextOf(item.descKey, name), value: 4 });
        cards.push(...civBulletCards(ctx, civ, base, { name, descKey: item.descKey }));
      } else if (item.kind === "civics") {
        cards.push({ ...base, id: BUILD.civCivics(civ), kind: BUILD_KIND.CivCivics, name,
          text: civCivicsText(civ, name, item.trait), value: 3 });
      } else if (UNIQUE_KIND_KEY[item.kind]) {
        cards.push({ ...base, id: BUILD.civUnique(item.type), kind: BUILD_KIND.CivUnique, name,
          text: civTextOf(item.descKey, name), value: 2, icon: uniqueIcon(item.type), uniqueKind: item.kind,
          kindLine: compose(UNIQUE_KIND_KEY[item.kind]) });
      }
    }
  }
  return cards;
}

// Every card, in grid order: the player's own leader's cards first within each kind.
export function buildCards(builder, builderCiv = null) {
  const names = leaderRows();
  const ctx = {
    names,
    leaders: KNOWN_LEADERS.filter((l) => names.has(l)),
    tags: leaderTags(),
    tagNames: tagNames(),
    civs: civRows(),
    abilities: abilities(),
    biases: biasRows()
  };
  ctx.agendas = agendas();
  ctx.favorites = favoredCivs(ctx.civs);
  ctx.civItems = civItems();
  ctx.civAges = civAges();
  ctx.civPieces = civPieces();
  const cards = [...abilityCards(ctx), ...attributeCards(ctx), ...personaAndBiasCards(ctx)];
  for (const c of cards) c.own = !!builder && c.leader === builder;
  cards.push(...civCards(ctx, builderCiv));
  const kindOrder = Object.values(BUILD_KIND);
  // Kind by kind; within start terrain the generic cards sit together at the front; then the builder's own, then
  // by name.
  cards.sort((a, b) => kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind)
    || Number(!!b.generic) - Number(!!a.generic)
    || Number(b.own) - Number(a.own) || String(a.name).localeCompare(String(b.name)));
  return { cards, tagNames: ctx.tagNames, leaderNames: names, civNames: ctx.civs, civItems: ctx.civItems };
}

// --- slots ---

// The builder's slots: what its leader gave up. ability: bullet count in the mapping (0 -> 1 whole slot);
// attributes: its own attribute count; behavior 1; terrain 1; civAbility: the civ's own movable bonus count (0 -> 1
// whole slot), civCivics 1 (a civ with a civics tree) and civTerrain 1 when the civ is picked by hand.
export function slotCounts(builder, civ, cards) {
  const bullets = cards.filter((c) => c.kind === BUILD_KIND.Bullet && c.leader === builder).length;
  const civBullets = cards.filter((c) => c.kind === BUILD_KIND.CivBullet && c.civ === civ).length;
  const quoted = String(builder).replace(/'/g, "''");
  const attrs = query(`SELECT count(*) AS n FROM LShufSetup_LeaderTraits WHERE LeaderType = '${quoted}'
    AND TraitType IN (SELECT TraitType FROM LShufAttributeTraits)`);
  const ownUniques = civ
    ? cards.filter((c) => c.kind === BUILD_KIND.CivUnique && c.civ === civ).length
    : 0;
  const ownCivics = civ ? cards.filter((c) => c.kind === BUILD_KIND.CivCivics && c.civ === civ).length : 0;
  return {
    ability: Math.max(1, bullets),
    attributes: attrs.length ? Number(attrs[0].n) : 2,
    behavior: 1,
    terrain: 1,
    civAbility: civ ? Math.max(1, civBullets) : 0,
    civUniques: civ ? Math.max(1, ownUniques) : 0,
    civCivics: Math.min(1, ownCivics),
    civTerrain: civ ? 1 : 0
  };
}

const SLOT_OF_KIND = {
  [BUILD_KIND.Bullet]: "ability",
  [BUILD_KIND.Whole]: "ability",
  [BUILD_KIND.Attribute]: "attributes",
  [BUILD_KIND.Persona]: "behavior",
  [BUILD_KIND.Bias]: "terrain",
  [BUILD_KIND.CivAbility]: "civAbility",
  [BUILD_KIND.CivBullet]: "civAbility",
  [BUILD_KIND.CivUnique]: "civUniques",
  [BUILD_KIND.CivCivics]: "civCivics",
  [BUILD_KIND.CivBias]: "civTerrain"
};
export const slotOfKind = (kind) => SLOT_OF_KIND[kind];

// Whole cards: a whole leader ability or a whole civilization ability fills every slot of its group.
export const isWholeCard = (kind) => kind === BUILD_KIND.Whole || kind === BUILD_KIND.CivAbility;

// Slots used by the current picks, per slot group. A whole ability fills every slot of its group.
export function slotsUsed(picks, counts) {
  const used = {
    ability: 0, attributes: 0, behavior: 0, terrain: 0, civAbility: 0, civUniques: 0, civCivics: 0, civTerrain: 0
  };
  for (const id of picks) {
    const kind = buildKindOf(id);
    if (isWholeCard(kind)) used[slotOfKind(kind)] = counts[slotOfKind(kind)];
    else used[slotOfKind(kind)] += 1;
  }
  return used;
}

// Whether a card can go into a slot now, and why not: "taken", "full", "unreviewed" or null.
// The card an id belongs to: the id's own card, or for an attribute's second copy the attribute's card.
export function cardFor(byId, id) {
  if (byId.has(id)) return byId.get(id);
  if (buildKindOf(id) === BUILD_KIND.Attribute) return byId.get(BUILD.attribute(BUILD.attributeTrait(id))) || null;
  return null;
}

// An attribute can be taken twice (the second copy is BUILD.attribute(trait, 2)); the ids a card's picks use.
export function attributeIdsOf(card, picks) {
  if (card.kind !== BUILD_KIND.Attribute) return picks.includes(card.id) ? [card.id] : [];
  const trait = BUILD.attributeTrait(card.id);
  return picks.filter((id) => buildKindOf(id) === BUILD_KIND.Attribute && BUILD.attributeTrait(id) === trait);
}

// The id the next click adds for this card, or null when it's already in as far as it can go.
export function nextIdFor(card, picks) {
  if (card.kind !== BUILD_KIND.Attribute) return picks.includes(card.id) ? null : card.id;
  const have = attributeIdsOf(card, picks).length;
  return have >= 2 ? null : BUILD.attribute(BUILD.attributeTrait(card.id), have + 1);
}

export function cantTake(card, picks, counts) {
  if (nextIdFor(card, picks) == null) return "taken";
  if (!card.reviewed) return "unreviewed";
  const used = slotsUsed(picks, counts);
  const group = slotOfKind(card.kind);
  if (isWholeCard(card.kind)) return used[group] > 0 ? "full" : null;
  return used[group] >= counts[group] ? "full" : null;
}
