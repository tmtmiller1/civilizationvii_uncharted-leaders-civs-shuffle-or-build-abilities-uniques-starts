// What the civ select and the loading screen show for each civilization once the deal is in (CONTRACTS 14, 16, 18,
// 19, 21): the ability it holds, the uniques it holds in place of its own, with its civics the buildings, quarters
// and improvements of the civ whose civics it got, and with a single civic the buildings that civic unlocks. Shared
// by the setup screen (lshuf-setup-display.js) and the game (lshuf-game.js), which both write the result into the
// config rows with writeCivItemRows.
import { bulletAt, joinBullets } from "/uncharted-leaders-and-civs/shared/lshuf-text.js";
import { BOUND_PIECE_OF } from "/uncharted-leaders-and-civs/shared/lshuf-constants.js";
import { shippedCivView } from "/uncharted-leaders-and-civs/ui/display/lshuf-config-rows.js";
import { civPieceKey } from "/uncharted-leaders-and-civs/ui/display/lshuf-display-util.js";

const CIV_UNIQUE = "CIVUNQ_";
const UNIQUE_ROW_KIND = { unit: "KIND_UNIT", building: "KIND_BUILDING", quarter: "KIND_QUARTER", improvement: "KIND_IMPROVEMENT" };

// A unique's shipped row, found by its type among every civ's rows.
function uniqueRow(type, shipped) {
  for (const { rows } of shipped.values()) {
    const row = rows.find((r) => r.Type === type && UNIQUE_ROW_KIND[String(r.Kind).replace("KIND_", "").toLowerCase()]);
    if (row) return row;
  }
  return null;
}

// Bonuses someone holds as a card of their own (a builder's pick), so a bound one isn't also shown on its unit.
function heldAloneOf(byCiv) {
  const held = new Set();
  for (const rows of byCiv.values()) {
    for (const r of rows) if (r.Kind === "bullet") held.add(String(r.PieceId));
  }
  return held;
}

// A unit that brings whole bonuses with it (BOUND_PIECE_OF) says so in its own text on the civ it went to.
function withBonus(row, heldAlone) {
  const pieces = (row && BOUND_PIECE_OF[row.Type]) || [];
  const added = [];
  for (const piece of pieces) {
    if (heldAlone.has(piece)) continue;
    const key = civPieceKey(piece);
    const bonus = String(Locale.compose(key) || "").trim();
    if (bonus && bonus !== key) added.push(bonus);
  }
  if (!added.length) return row;
  return { ...row, Description: `${String(Locale.compose(row.Description) || "")} ${added.join(" ")}`.trim() };
}

// The civ select rows a civics tree carries with it (CONTRACTS 18 and 23): its unique buildings and quarters always,
// and the improvements and units the civics unlock (the Watonathi, the great people tied to a quarter). Unit cards and
// improvements a main tree unlocks stay with the uniques. With no unlock list to read, improvements go with the
// civics and units stay.
const ALWAYS_CIVICS = ["KIND_BUILDING", "KIND_QUARTER"];
const BY_UNLOCK = ["KIND_IMPROVEMENT", "KIND_UNIT"];
const CIV_CIVICS = "CIVCIVC_";

// The views the deal asks for (CONTRACTS 14, 16 and 18): every civ shows the ability it took (the source civ's keys),
// the uniques it took alongside its own (the game keeps a builder's own uniques; watched 2026-11-07), and with its
// civics the buildings, quarters and improvements of the civ whose civics it got; a unique or civics another civ
// took is gone from the giver's card. A civ nothing touched shows what it ships with. The Off flags have no card
// text to show, so the ability row is left as shipped then.
function civicsRowTest(nodeUnlocks) {
  const types = new Set();
  for (const list of (nodeUnlocks || new Map()).values()) for (const t of list) types.add(t);
  return (u) => ALWAYS_CIVICS.includes(u.Kind)
    || (types.size ? BY_UNLOCK.includes(u.Kind) && types.has(u.Type) : u.Kind === "KIND_IMPROVEMENT");
}

// A single civic (CONTRACTS 21): PieceId CIVNODE_<node>, FromCivilization the giver. It carries the giver's unique
// building, quarter and improvement rows of the types the node unlocks; the setup copy's LShufSetup_CivCivics says
// which those are (NodeType -> [UnlockType]).
const CIV_CIVIC = "CIVNODE_";
const nodeOf = (pieceId) => String(pieceId).slice(CIV_CIVIC.length);
const isCivicPiece = (r) => r.Kind === "civic";

let nodeUnlockCache = null;
// NodeType -> [UnlockType] from the shell's or the game's config database, read once; empty when it can't be read.
function readNodeUnlocks() {
  if (nodeUnlockCache) return nodeUnlockCache;
  const out = new Map();
  try {
    const sql = "SELECT NodeType, UnlockType FROM LShufSetup_CivCivics WHERE UnlockKind <> 'KIND_TRADITION'";
    for (const r of Database.query("config", sql) || []) {
      if (!out.has(r.NodeType)) out.set(r.NodeType, []);
      out.get(r.NodeType).push(r.UnlockType);
    }
  } catch (e) {
    console.warn(`[lshuf] civic unlocks: ${e}`);
  }
  nodeUnlockCache = out;
  return out;
}

let quarterCache = null;
// QuarterType -> [BuildingType1, BuildingType2] from the setup copy (LShufSetup_UniqueQuarters), read once.
function readQuarters() {
  if (quarterCache) return quarterCache;
  const out = new Map();
  try {
    const sql = "SELECT QuarterType, BuildingType1, BuildingType2 FROM LShufSetup_UniqueQuarters";
    for (const r of Database.query("config", sql) || []) out.set(r.QuarterType, [r.BuildingType1, r.BuildingType2]);
  } catch (e) {
    console.warn(`[lshuf] quarters: ${e}`);
  }
  quarterCache = out;
  return out;
}

// A quarter's row follows its two buildings (pure): a view keeps a quarter only while it holds both buildings, and
// gains the quarter (its row from whichever civ ships it) once it holds both. `rowOfType` finds any civ's shipped row.
export function settleQuarters(uniques, quarters, rowOfType) {
  const have = new Set(uniques.map((u) => u.Type));
  const kept = uniques.filter((u) => {
    const parts = u.Kind === "KIND_QUARTER" ? quarters.get(u.Type) : null;
    return !parts || parts.every((b) => have.has(b));
  });
  for (const [quarter, parts] of quarters) {
    if (have.has(quarter) || !parts.every((b) => have.has(b))) continue;
    const row = rowOfType(quarter);
    if (row) kept.push(row);
  }
  return kept;
}

// The civ select rows one civic carries (pure): the giver's rows of the kinds a civics tree moves, of the types the
// node unlocks.
export function civicNodeRows(nodeType, giverRows, nodeUnlocks) {
  const types = nodeUnlocks.get(nodeType) || [];
  const isCivicsRow = civicsRowTest(nodeUnlocks);
  return (giverRows || []).filter((r) => isCivicsRow(r) && types.includes(r.Type));
}

// The deal's civ rows, by civ, with the uniques and civics that left their civ, and per giver the types its single
// civics took with them.
function civMoves(pieces, nodeUnlocks) {
  const byCiv = new Map();
  const movedUniques = new Set();
  const movedCivics = new Set();
  const movedByCivic = new Map();
  for (const r of pieces || []) {
    if (!byCiv.has(r.CivilizationType)) byCiv.set(r.CivilizationType, []);
    byCiv.get(r.CivilizationType).push(r);
    if (r.Kind === "unique") movedUniques.add(String(r.PieceId).slice(CIV_UNIQUE.length));
    if (r.Kind === "civics") movedCivics.add(r.FromCivilization);
    if (isCivicPiece(r)) {
      if (!movedByCivic.has(r.FromCivilization)) movedByCivic.set(r.FromCivilization, new Set());
      for (const t of nodeUnlocks.get(nodeOf(r.PieceId)) || []) movedByCivic.get(r.FromCivilization).add(t);
    }
  }
  return { byCiv, movedUniques, movedCivics, movedByCivic, heldAlone: heldAloneOf(byCiv) };
}

// A held bonus's text (CONTRACTS 19): its generated key, else the bullet cut from the giver's live description.
function civPieceText(row, shipped) {
  const key = civPieceKey(row.PieceId);
  const text = String(Locale.compose(key) || "");
  if (text && text !== key) return text.trim();
  const from = shipped.get(row.FromCivilization);
  const ability = from && shippedCivView(from).ability;
  const match = /__B(\d+)$/.exec(String(row.PieceId));
  return ability && match ? bulletAt(String(Locale.compose(ability.Description) || ""), Number(match[1])) : "";
}

// A civ holding bonuses shows them as one list under its own ability name, the remainder last.
function civPiecesView(civ, rows, ownView, shipped) {
  const held = rows.filter((r) => r.Kind === "bullet" || r.Kind === "remainder")
    .sort((x, y) => Number(x.SortIndex) - Number(y.SortIndex));
  if (!held.length || !ownView.ability) return null;
  const ownName = String(Locale.compose(ownView.ability.Name) || "");
  const lines = held.map((r) => (r.Kind === "remainder" ? Locale.compose("LOC_LSHUF_PIECE_REST", ownName) : civPieceText(r, shipped)))
    .filter((line) => line && String(line).trim());
  return { Name: ownView.ability.Name, Description: joinBullets(lines) };
}

// The attribute tags a civ was dealt (CONTRACTS 30): its giver's, as shipped; null when it kept its own.
function dealtTags(rows, shipped) {
  const tags = rows.find((r) => r.Kind === "tags");
  return tags && shipped.has(tags.FromCivilization) ? shippedCivView(shipped.get(tags.FromCivilization)).tags : null;
}

function civView(civ, own, moves, shipped) {
  const rows = moves.byCiv.get(civ) || [];
  const ownView = shippedCivView(own);
  const view = {
    ability: ownView.ability,
    uniques: ownView.uniques.filter((u) => !moves.movedUniques.has(u.Type)),
    tags: dealtTags(rows, shipped) || ownView.tags
  };
  const ability = rows.find((r) => r.Kind === "ability");
  if (ability && shipped.has(ability.FromCivilization)) {
    view.ability = shippedCivView(shipped.get(ability.FromCivilization)).ability;
  }
  view.ability = civPiecesView(civ, rows, ownView, shipped) || view.ability;
  const uniques = rows.filter((r) => r.Kind === "unique")
    .sort((x, y) => Number(x.SortIndex) - Number(y.SortIndex))
    .map((r) => withBonus(uniqueRow(String(r.PieceId).slice(CIV_UNIQUE.length), shipped), moves.heldAlone))
    .filter(Boolean);
  if (uniques.length) view.uniques = [...uniques, ...view.uniques];
  applyCivics(view, civ, rows, moves, shipped);
  const touched = rows.some(isCivicPiece) || moves.movedByCivic.has(civ);
  if (touched && moves.quarters && moves.quarters.size) {
    view.uniques = settleQuarters(view.uniques, moves.quarters, (type) => uniqueRow(type, shipped));
  }
  view.uniques = view.uniques.map((u, i) => ({ ...u, SortIndex: i }));
  return view;
}

// The civics moves on one civ's view: a whole tree swaps the civics rows wholesale; single civics bring the giver's
// rows of what they unlock and take the same rows off the giver.
function applyCivics(view, civ, rows, moves, shipped) {
  const isCivicsRow = civicsRowTest(moves.nodeUnlocks);
  const civics = rows.find((r) => r.Kind === "civics");
  if (civics || moves.movedCivics.has(civ)) {
    view.uniques = view.uniques.filter((u) => !isCivicsRow(u));
    const from = civics && shipped.get(String(civics.PieceId).slice(CIV_CIVICS.length));
    if (from) view.uniques.push(...shippedCivView(from).uniques.filter(isCivicsRow));
  }
  const gone = moves.movedByCivic.get(civ);
  if (gone) view.uniques = view.uniques.filter((u) => !(isCivicsRow(u) && gone.has(u.Type)));
  const have = new Set(view.uniques.map((u) => u.Type));
  for (const r of rows.filter(isCivicPiece).sort((x, y) => Number(x.SortIndex) - Number(y.SortIndex))) {
    const giver = shipped.get(r.FromCivilization);
    for (const row of civicNodeRows(nodeOf(r.PieceId), giver ? giver.rows : [], moves.nodeUnlocks)) {
      if (!have.has(row.Type)) view.uniques.push(row);
      have.add(row.Type);
    }
  }
}

// Every civ's view for these deal rows (LShufResultCivPieces shape), over the shipped rows from readCivItemRows.
// nodeUnlocks (NodeType -> [UnlockType]) is read from the config database when single civics were dealt and the
// caller didn't pass it.
export function civDealViews(pieces, shipped, nodeUnlocks = null, quarters = null) {
  const views = new Map();
  const anyCivic = (pieces || []).some(isCivicPiece);
  const anyCivics = anyCivic || (pieces || []).some((r) => r.Kind === "civics");
  const unlocks = nodeUnlocks || (anyCivics ? readNodeUnlocks() : new Map());
  const moves = {
    ...civMoves(pieces, unlocks), nodeUnlocks: unlocks, quarters: quarters || (anyCivic ? readQuarters() : new Map())
  };
  for (const [civ, own] of shipped) views.set(civ, civView(civ, own, moves, shipped));
  return views;
}
