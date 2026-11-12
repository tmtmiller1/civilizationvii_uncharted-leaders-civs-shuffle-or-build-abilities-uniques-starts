// The loading screen with the deal in (CONTRACTS 8). Its Unique Buildings, Unique Units and Traditions pages list by
// the one trait LegacyCivilizationTraits names for the player's civ, so a unique the civ took (on
// TRAIT_LSHUF_CIV_<C>) or a civics tree it received (another civ's base trait) never shows, while what it gave away
// still does. While the screen reads, the GameInfo tables it filters answer for every trait the civ holds in
// CivilizationTraits instead; the tables go back to normal when the curtain opens on the game. The leader and
// civilization pages read config rows, written here for the local player so a loaded save shows the deal too.
//
// The screen reads once GameCore is initialized, before any mod UI script loads, so the mod's copy of the game's
// load-screen-bootstrap.js (base-standard/ui-next/screens/load-screen/) calls prepareLoadScreen() first.
import { guarded } from "/uncharted-leaders-and-civs/ui/display/lshuf-display-util.js";
import {
  leaderView, readCivItemRows, SHIPPED_CIV_ITEMS, shippedCivView, writeCivItemRows, writeLeaderRows
} from "/uncharted-leaders-and-civs/ui/display/lshuf-config-rows.js";
import { civDealViews } from "/uncharted-leaders-and-civs/ui/display/lshuf-civ-views.js";
import { gameContext, readGameDeal } from "/uncharted-leaders-and-civs/ui/game/lshuf-game-data.js";

const LOG = "[lshuf-load]";
const RANDOM = "RANDOM";
const CURTAIN_CLOSED = "load-curtain-closed-event";

// The GameInfo tables the screen filters by trait (load-screen-model.js).
export const PAGE_TABLES = ["Units", "Buildings", "Improvements", "Routes", "UniqueQuarters", "Traditions"];

// `rows` filtered the way the screen asked, for a civ that holds the traits in `held`: a test that takes the civ's
// base trait (the screen's `TraitType == base`) takes every held trait instead, and drops the rows of a trait the
// civ gave away; any other test passes through. `mine(row)`, when given, decides instead for a row a civic unlocks
// (CONTRACTS 21: civics move between trees while traditions and buildings keep the giver's trait): true when the
// unlocking civic sits in one of the civ's trees, false when it left, null when no civic unlocks it. Pure.
export function heldFilter(rows, pred, base, held, mine = null) {
  let asksBase = false;
  try {
    asksBase = !!base && !!pred({ TraitType: base });
  } catch (_) {
    asksBase = false;
  }
  if (!asksBase) return rows.filter((row) => pred(row));
  const holds = (row) => {
    const byNode = mine ? mine(row) : null;
    return byNode == null ? held.has(row.TraitType) : byNode;
  };
  return rows.filter((row) => holds(row) && pred({ ...row, TraitType: base }));
}

const rowType = (row) => row.TraditionType || row.ConstructibleType || row.UniqueQuarterType || row.UnitType
  || row.RouteType;

// key -> [values], from rows.
function groupRows(rows, keyOf, valueOf, keep = () => true) {
  const out = new Map();
  for (const r of rows) {
    if (!keep(r)) continue;
    const k = keyOf(r);
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(valueOf(r));
  }
  return out;
}

const isCivTree = (tree) => /^TREE_CIVICS_/.test(tree) && !/_MAIN$/.test(tree);

// [tree, traits that reveal it] for every modifier that reveals a civics tree.
function treeReveals() {
  const setOfReq = new Map();
  for (const rr of GameInfo.RequirementSetRequirements) setOfReq.set(rr.RequirementId, rr.RequirementSetId);
  const traitsOfSet = groupRows(GameInfo.RequirementArguments, (a) => setOfReq.get(a.RequirementId), (a) => a.Value,
    (a) => a.Name === "TraitType" && setOfReq.has(a.RequirementId));
  const setOfMod = new Map();
  for (const m of GameInfo.Modifiers) {
    if (m.SubjectRequirementSetId) setOfMod.set(m.ModifierId, m.SubjectRequirementSetId);
  }
  const reveals = [];
  for (const a of GameInfo.ModifierArguments) {
    if (a.Name !== "ProgressionTreeType" || !/^TREE_CIVICS_/.test(String(a.Value))) continue;
    reveals.push([String(a.Value), traitsOfSet.get(setOfMod.get(a.ModifierId)) || []]);
  }
  return reveals;
}

// What the civics judges share, read once from the gameplay tables: which tree each reveal modifier opens for which
// traits, each civ civics tree's nodes, the trait gates on nodes, and the civics that unlock each type.
function civicTables() {
  const nodeTree = new Map();
  for (const n of GameInfo.ProgressionTreeNodes) {
    const tree = String(n.ProgressionTree || "");
    if (isCivTree(tree)) nodeTree.set(n.ProgressionTreeNodeType, tree);
  }
  const gates = groupRows(GameInfo.ProgressionTreeNodeTraits || [], (g) => g.ProgressionTreeNodeType,
    (g) => g.RequiredTraitType);
  const nodesOf = groupRows(GameInfo.ProgressionTreeNodeUnlocks, (u) => u.TargetType, (u) => u.ProgressionTreeNodeType,
    (u) => nodeTree.has(u.ProgressionTreeNodeType));
  return { reveals: treeReveals(), nodeTree, gates, nodesOf };
}

// Decides a row a civic unlocks (any TREE_CIVICS_* tree but an age's main one) for a civ holding `held`: true when
// one of its unlocking civics sits in a tree the civ has (a civic gated on traits, the Test of Time tree's, only when
// the civ holds one of them), false when they all left, null for a row no civic unlocks. `tables` from civicTables()
// lets several civs share one read.
export function civicUnlockJudge(held, tables = civicTables()) {
  const { reveals, nodeTree, gates, nodesOf } = tables;
  const myTrees = new Set();
  for (const [tree, traits] of reveals) if (traits.some((t) => held.has(t))) myTrees.add(tree);
  const nodeMine = (node) => myTrees.has(nodeTree.get(node))
    && (!gates.has(node) || gates.get(node).some((t) => held.has(t)));
  const judgeType = (type) => {
    const nodes = nodesOf.get(type);
    return nodes && nodes.length ? nodes.some(nodeMine) : null;
  };
  // A unique quarter goes by its two buildings: held when both are, gone when either left.
  return (row) => {
    if (row.UniqueQuarterType) {
      const parts = [row.BuildingType1, row.BuildingType2].map(judgeType);
      return parts.every((v) => v == null) ? null : parts.every((v) => v !== false);
    }
    return judgeType(rowType(row));
  };
}

export { civicTables };

const installed = [];

function install(base, held) {
  const mine = guarded("civic unlock judge", () => civicUnlockJudge(held), null);
  for (const name of PAGE_TABLES) {
    const table = GameInfo[name];
    const proto = table ? Object.getPrototypeOf(table) : null;
    const original = proto && typeof proto.filter === "function" ? proto.filter : null;
    if (!original || Object.prototype.hasOwnProperty.call(table, "filter")) continue;
    Object.defineProperty(table, "filter", {
      configurable: true,
      writable: true,
      value(pred) {
        return heldFilter(original.call(this, () => true), pred, base, held, mine);
      }
    });
    installed.push(table);
  }
}

function uninstall() {
  for (const table of installed.splice(0)) delete table.filter;
}

function localCiv() {
  const player = Configuration.getPlayer(GameContext.localPlayerID);
  const civ = player ? String(player.civilizationTypeName || "") : "";
  return civ && civ !== RANDOM ? civ : null;
}

export function installLoadScreenTraits() {
  const civ = localCiv();
  if (!civ || !GameInfo.LShufResultLeaders || !GameInfo.LShufResultLeaders.length) return false;
  const legacy = GameInfo.LegacyCivilizationTraits.lookup(civ);
  const base = legacy ? legacy.TraitType : null;
  const held = new Set();
  for (const row of GameInfo.CivilizationTraits) if (row.CivilizationType === civ) held.add(row.TraitType);
  if (!base || !held.size) return false;
  install(base, held);
  // The tables go back to normal when the curtain opens on the game; Loading.runWhenLoaded would fire at once in a
  // script that loads after the game has, and take the wrappers down before the screen reads.
  window.addEventListener(CURTAIN_CLOSED, () => guarded("load screen traits off", () => uninstall()), { once: true });
  const flags = guarded("loading flags", () => `initialized ${Loading.isInitialized}, loaded ${Loading.isLoaded}, state ${UI.getGameLoadingState()}`, "?");
  console.warn(`${LOG} ${civ} lists ${held.size} traits on the loading screen (${flags})`);
  return true;
}

function localLeader() {
  const player = Configuration.getPlayer(GameContext.localPlayerID);
  const leader = player ? String(player.leaderTypeName || "") : "";
  return leader && leader !== RANDOM ? leader : null;
}

// The local player's leader and civilization config rows from the game's own result tables (the setup screen wrote
// them for a new game; a loaded save has only what's here).
export function writeLocalRows() {
  const data = readGameDeal();
  if (!data) return false;
  const leader = localLeader();
  const context = gameContext(data.mode);
  if (leader && context.rows.has(leader)) {
    // The deal number on the player's own leader, as the setup screen writes it (CONTRACTS 11).
    const extraLines = data.seed ? [Locale.compose("LOC_LSHUF_DEAL_NUMBER", String(data.seed))] : [];
    const view = leaderView(leader, data.deal, { ...context.ctx, extraLines });
    if (view) writeLeaderRows(leader, view, context.rows.get(leader), context.tagTypes);
  }
  const civ = localCiv();
  const shipped = readCivItemRows(SHIPPED_CIV_ITEMS);
  if (civ && shipped.has(civ)) {
    const views = civDealViews(data.deal.civPieces, shipped);
    writeCivItemRows(civ, views.get(civ) || shippedCivView(shipped.get(civ)), shipped.get(civ));
  }
  return true;
}

// From the bootstrap copy, at page load: the work waits for GameCore, and runs before the screen's own read, which
// the screen registers later (after its image preloads).
export function prepareLoadScreen() {
  guarded("load screen prepare", () => {
    Loading.runWhenInitialized(() => {
      guarded("load screen rows", () => writeLocalRows());
      guarded("load screen traits", () => installLoadScreenTraits());
    });
  });
}
