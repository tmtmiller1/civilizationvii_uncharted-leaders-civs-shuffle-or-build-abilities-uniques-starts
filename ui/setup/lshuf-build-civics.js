// A civilization's unique civics on the civ build screen (CONTRACTS 18 and 21): the whole-tree card's text, one card
// per civic of the tree, and the per-node data the tree view draws. Read from the setup copy's LShufSetup_CivicNodes
// (node, name, cost, depth, prerequisites) and LShufSetup_CivCivics (what each node unlocks), the shell's Traditions
// (tradition text) and its CivilizationItems rows (the unlocks' text and icons). The three setup tables don't change
// while the shell is up, so they're read once.

import { BUILD, BUILD_KIND } from "/uncharted-leaders-and-civs/shared/lshuf-constants.js";
import { joinBullets } from "/uncharted-leaders-and-civs/shared/lshuf-text.js";
import {
  compose, composedOrEmpty, plainWords, query, sq
} from "/uncharted-leaders-and-civs/ui/setup/lshuf-build-query.js";

export const UNIQUE_KIND_KEY = {
  unit: "LOC_LSHUF_BUILD_UNIQUE_KIND_UNIT",
  building: "LOC_LSHUF_BUILD_UNIQUE_KIND_BUILDING",
  quarter: "LOC_LSHUF_BUILD_UNIQUE_KIND_QUARTER",
  improvement: "LOC_LSHUF_BUILD_UNIQUE_KIND_IMPROVEMENT"
};
const CIVIC_KIND_WORD = {
  KIND_BUILDING: "building", KIND_QUARTER: "quarter", KIND_IMPROVEMENT: "improvement", KIND_UNIT: "unit"
};
const plainType = (type) => plainWords(String(type || "")
  .replace(/^(NODE_CIVIC|TRADITION|BUILDING|QUARTER|IMPROVEMENT|UNIT)_/, ""));
// A name the shell can't compose reads as plain words from its type.
const nameOrType = (key, type) => composedOrEmpty(key) || plainType(type);

// --- the tables, read once ---

let nodesByCiv = null;
let unlocksByCiv = null;
let traditionsByType = null;
let riderRows = null;

function groupByCiv(rows) {
  const out = new Map();
  for (const r of rows) {
    if (!out.has(r.CivilizationType)) out.set(r.CivilizationType, []);
    out.get(r.CivilizationType).push(r);
  }
  return out;
}

// The civ's nodes in depth then node order.
function nodeRows(civ) {
  if (!nodesByCiv) {
    nodesByCiv = groupByCiv(query("SELECT CivilizationType, NodeType, NameKey, Cost, Depth, Prereqs "
      + "FROM LShufSetup_CivicNodes ORDER BY CivilizationType, Depth, NodeType"));
  }
  return nodesByCiv.get(civ) || [];
}

// The civ's unlock rows, with a type on each.
function unlockRows(civ) {
  if (!unlocksByCiv) {
    unlocksByCiv = groupByCiv(query("SELECT CivilizationType, NodeType, NodeNameKey, UnlockType, UnlockKind, UnlockNameKey "
      + "FROM LShufSetup_CivCivics ORDER BY CivilizationType, NodeType, UnlockKind, UnlockType"));
  }
  return (unlocksByCiv.get(civ) || []).filter((r) => r.UnlockType);
}

function traditions() {
  if (!traditionsByType) {
    traditionsByType = new Map();
    for (const t of query("SELECT TraditionType, TraitType, Name, Description FROM Traditions")) {
      traditionsByType.set(t.TraditionType, t);
    }
  }
  return traditionsByType;
}

// Cards that travel with another card (CONTRACTS 23, LShufSetup_CivRiders): lead id -> [rider ids], and every rider.
function riders() {
  if (!riderRows) {
    riderRows = { byLead: new Map(), ids: new Set() };
    for (const r of query("SELECT LeadId, RiderId FROM LShufSetup_CivRiders ORDER BY LeadId, RiderId")) {
      if (!riderRows.byLead.has(r.LeadId)) riderRows.byLead.set(r.LeadId, []);
      riderRows.byLead.get(r.LeadId).push(r.RiderId);
      riderRows.ids.add(r.RiderId);
    }
  }
  return riderRows;
}

// The ids that come with a card, a card's slot weight (itself and what comes with it), and whether an id rides with
// another card instead of being one.
export const ridersOf = (id) => riders().byLead.get(id) || [];
export const slotWeight = (id) => 1 + ridersOf(id).length;
export const isRider = (id) => riders().ids.has(id);
// The card a rider comes in on, or null.
export function leadOf(id) {
  for (const [lead, ids] of riders().byLead) if (ids.includes(id)) return lead;
  return null;
}

// --- text ---

const traditionLine = (t, nameKey, type) => compose("LOC_LSHUF_BUILD_CIVICS_TRADITION",
  nameOrType(t ? t.Name : nameKey, type), t ? composedOrEmpty(t.Description) : "");

// One unlock's line: "<icon> <Kind> <Name>: <description>" from its CivilizationItems row where the shell has one.
function civicsUnlockLine(r, item) {
  const kind = CIVIC_KIND_WORD[item ? item.Kind : r.UnlockKind] || (r.UnlockKind === "KIND_UNIT" ? "unit" : "building");
  const name = nameOrType(item ? item.Name : r.UnlockNameKey, r.UnlockType);
  const icon = kind === "quarter" ? "" : `[icon:${r.UnlockType}] `;
  const text = item ? composedOrEmpty(item.Description) : "";
  // The setup screen's text lacks some descriptions (the Highland Power Station's); then the line is kind and name.
  const line = text ? compose("LOC_LSHUF_BUILD_CIVICS_UNLOCK", compose(UNIQUE_KIND_KEY[kind]), name, text)
    : compose("LOC_LSHUF_BUILD_CIVICS_UNLOCK_NAME", compose(UNIQUE_KIND_KEY[kind]), name);
  return `${icon}${line}`;
}

function civItemRows(civ) {
  const items = new Map();
  for (const r of query(`SELECT Kind, Type, Name, Description FROM CivilizationItems WHERE CivilizationType = '${sq(civ)}'`)) {
    if (!items.has(r.Type)) items.set(r.Type, r);
  }
  return items;
}

// The buildings, quarters, improvements and units these unlock rows name, one line each, traditions left out.
function civicsUnlockLines(items, rows) {
  const lines = [];
  const seen = new Set();
  for (const r of rows) {
    if (r.UnlockKind === "KIND_TRADITION" || seen.has(r.UnlockType)) continue;
    seen.add(r.UnlockType);
    lines.push(civicsUnlockLine(r, items.get(r.UnlockType)));
  }
  return lines;
}

// The tree for the civ build screen's tree view and the civic cards: [{ node, name, cost, depth, prereqs: [...],
// unlocks: [lines] }] in depth then node order, each node's unlock lines (its traditions first) in the detail the
// civics card has. Empty when the setup copy has no nodes for the civ.
export function civicsTreeData(civ) {
  const nodes = nodeRows(civ);
  if (!nodes.length) return [];
  const rows = unlockRows(civ);
  const items = civItemRows(civ);
  return nodes.map((n) => {
    const own = rows.filter((r) => r.NodeType === n.NodeType);
    const unlocks = own.filter((r) => r.UnlockKind === "KIND_TRADITION")
      .map((r) => traditionLine(traditions().get(r.UnlockType), r.UnlockNameKey, r.UnlockType));
    unlocks.push(...civicsUnlockLines(items, own));
    return {
      node: n.NodeType, name: nameOrType(n.NameKey, n.NodeType), cost: Number(n.Cost || 0), depth: Number(n.Depth || 0),
      prereqs: String(n.Prereqs || "").split("|").filter(Boolean), unlocks
    };
  });
}

// The whole-tree card's text (CONTRACTS 18): the tree's civics, then each tradition with its description, then each
// building, quarter, improvement and civics-only unit with its icon and description. Traditions come from the
// shell's Traditions table by the civ's base trait.
export function civCivicsText(civ, treeName, baseTrait) {
  const rows = unlockRows(civ);
  const civics = [...new Set(rows.map((r) => nameOrType(r.NodeNameKey, r.NodeType)).filter(Boolean))].join(", ");
  const lines = [compose("LOC_LSHUF_BUILD_CIVICS_TREE", treeName, civics || "-")];
  const own = baseTrait ? [...traditions().values()].filter((t) => t.TraitType === baseTrait) : [];
  own.sort((a, b) => String(a.TraditionType).localeCompare(String(b.TraditionType)));
  for (const t of own) lines.push(traditionLine(t, t.Name, t.TraditionType));
  lines.push(...civicsUnlockLines(civItemRows(civ), rows));
  return joinBullets(lines);
}

// What comes with a unique card (CONTRACTS 23): the riders' names, and one line each in the civics card's detail.
export function uniqueRiders(civ, id) {
  const items = civItemRows(civ);
  const names = [];
  const lines = [];
  for (const rider of ridersOf(id)) {
    const type = rider.slice("CIVUNQ_".length);
    const item = items.get(type);
    names.push(nameOrType(item ? item.Name : null, type));
    lines.push(civicsUnlockLine({ UnlockType: type, UnlockKind: item ? item.Kind : "KIND_IMPROVEMENT" }, item));
  }
  return { names, lines };
}

export const withLine = (names) => (names.length ? compose("LOC_LSHUF_BUILD_WITH", names.join(", ")) : "");

// --- the civic cards (CONTRACTS 21) ---

// One card per civic of the civ's tree: the node's name, its culture cost, each tradition it unlocks with its text,
// and each building, quarter, improvement or unit it unlocks. The card's value is the civic's cost. Civics that need
// each other (CONTRACTS 23) are one card: the lead's, naming the others ("With: ...") and listing what they unlock,
// with their costs added in.
export function civicCards(civ, base, treeName) {
  const kindLine = compose("LOC_LSHUF_BUILD_KIND_CIVCIVIC");
  const data = civicsTreeData(civ);
  const byId = new Map(data.map((n) => [BUILD.civCivic(n.node), n]));
  return data.filter((n) => !isRider(BUILD.civCivic(n.node))).map((n) => {
    const id = BUILD.civCivic(n.node);
    const others = ridersOf(id).map((r) => byId.get(r)).filter(Boolean);
    const cost = others.reduce((sum, o) => sum + o.cost, n.cost);
    const names = others.map((o) => o.name);
    const lines = [compose("LOC_LSHUF_TREE_COST", String(cost)), ...n.unlocks];
    for (const o of others) lines.push(...o.unlocks);
    return {
      ...base, id, kind: BUILD_KIND.CivCivic, name: n.name, kindLine, tree: treeName, node: n.node,
      withNames: names, withLine: withLine(names),
      text: joinBullets(names.length ? [withLine(names), ...lines] : lines), value: Math.max(1, Math.round(cost / 100))
    };
  });
}
