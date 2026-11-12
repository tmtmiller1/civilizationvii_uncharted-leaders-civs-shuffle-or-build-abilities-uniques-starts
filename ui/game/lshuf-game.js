// Game UIScripts entry. Writes each leader's dealt ability, attributes and start-bias line, and each civ's
// ability and uniques, into the config rows the loading screen, Civilopedia and diplomacy panel read, from the game's
// own result tables, so a loaded save (whose setup screen never ran) shows the deal too. The loading screen is
// handled earlier by lshuf-load-screen.js (CONTRACTS 8). Also adds the "Who got what" section to the diplomacy leader
// panel and the City Details bonus-line names.
//
// With "Show what everyone got: As you meet them", a leader shows as shipped until the local player meets them.
import { KEY } from "/uncharted-leaders-and-civs/shared/lshuf-constants.js";
import {
  leaderView,
  previewDifferences,
  readCivItemRows,
  SHIPPED_CIV_ITEMS,
  shippedCivView,
  writeCivItemRows,
  writeLeaderRows
} from "/uncharted-leaders-and-civs/ui/display/lshuf-config-rows.js";
import { civDealViews } from "/uncharted-leaders-and-civs/ui/display/lshuf-civ-views.js";
import { guarded } from "/uncharted-leaders-and-civs/ui/display/lshuf-display-util.js";
import {
  gameContext,
  readGameDeal,
  readGameplay,
  shippedViewOf
} from "/uncharted-leaders-and-civs/ui/game/lshuf-game-data.js";
import {
  installRevealSection,
  isMetMode,
  setRevealSource
} from "/uncharted-leaders-and-civs/ui/game/lshuf-reveal-panel.js";
import { installCityDetailsNames } from "/uncharted-leaders-and-civs/ui/game/lshuf-city-details-names.js";
import { installTraditionOwners } from "/uncharted-leaders-and-civs/ui/game/lshuf-civ-panels.js";
import { installTransitionButtons } from "/uncharted-leaders-and-civs/ui/game/lshuf-game-transition.js";

const LOG = "[lshuf-game]";
const state = {
  data: null, context: null, written: new Map(), views: new Map(), differs: [], civWritten: new Map()
};

function leaderTypeOf(player) {
  return guarded("leader type", () => {
    const row = GameInfo.Leaders.lookup(player.leaderType);
    return row ? row.LeaderType : null;
  }, null);
}

function localLeaderType() {
  const player = guarded("local player", () => Players.get(GameContext.localPlayerID), null);
  const fromPlayer = player ? leaderTypeOf(player) : null;
  if (fromPlayer) return fromPlayer;
  return guarded("local config", () => Configuration.getPlayer(GameContext.localPlayerID).leaderTypeName, null);
}

function civTypeOf(player) {
  return guarded("civ type", () => {
    const row = GameInfo.Civilizations.lookup(player.civilizationType);
    return row ? row.CivilizationType : null;
  }, null);
}

// The major players in the game, local player first: { id, leaderType, civType, met }.
function majorPlayers() {
  const local = GameContext.localPlayerID;
  const me = guarded("local player", () => Players.get(local), null);
  const out = [];
  for (const player of guarded("players", () => Players.getAlive(), []) || []) {
    if (!player || !player.isMajor) continue;
    const met = player.id === local || !!guarded("met", () => me.Diplomacy.hasMet(player.id), false);
    out.push({ id: player.id, leaderType: leaderTypeOf(player), civType: civTypeOf(player), met });
  }
  out.sort((a, b) => (a.id === local ? -1 : 0) - (b.id === local ? -1 : 0) || a.id - b.id);
  return out;
}

function knownLeaders() {
  const known = new Set();
  const mine = localLeaderType();
  if (mine) known.add(mine);
  for (const player of majorPlayers()) if (player.met && player.leaderType) known.add(player.leaderType);
  return known;
}

function viewOf(leaderType) {
  if (!state.views.has(leaderType)) {
    state.views.set(leaderType, leaderView(leaderType, state.data.deal, state.context.ctx));
  }
  return state.views.get(leaderType);
}

function sameView(a, b) {
  return !!a && !!b && a.name === b.name && a.description === b.description && a.tags.join() === b.tags.join();
}

function writeAll() {
  const metOnly = isMetMode(state.data.reveal);
  const known = metOnly ? knownLeaders() : null;
  for (const row of state.data.deal.leaders) {
    const leaderType = row.LeaderType;
    const view = !metOnly || known.has(leaderType) ? viewOf(leaderType) : shippedViewOf(leaderType, state.context);
    if (!view || sameView(state.written.get(leaderType), view)) continue;
    const current = state.context.rows.get(leaderType);
    if (!current) continue;
    if (writeLeaderRows(leaderType, view, current, state.context.tagTypes)) state.written.set(leaderType, view);
  }
}

function readPreview() {
  return guarded("preview", () => {
    const text = Configuration.getGame().getValue(KEY.Preview);
    return text ? JSON.parse(String(text)) : null;
  }, null);
}

// What the diplomacy panel's section reads (ui/game/lshuf-reveal-panel.js).
function revealContent() {
  const data = state.data;
  const attributeOf = new Map();
  for (const row of readGameplay("LShufAttributeTraits")) attributeOf.set(row.TraitType, row.AttributeType);
  const metOnly = isMetMode(data.reveal);
  return {
    deal: data.deal,
    seed: data.seed,
    mode: data.mode,
    attributeOf,
    abilityOf: state.context.ctx.abilityOf,
    whyOf: (leaderType) => guarded("why", () => Configuration.getGame().getValue(KEY.modWhy(leaderType)), null),
    viewOf,
    // With As you meet them, only the local player's leader and the leaders they've met show their deal.
    shown: (leaderType) => !metOnly || knownLeaders().has(leaderType),
    players: () => majorPlayers()
      .map((p) => ({ leaderType: p.leaderType, shown: !!p.leaderType && (!metOnly || p.met) }))
  };
}

function onTurn(event) {
  if (!state.data || !event || event.player !== GameContext.localPlayerID) return;
  guarded("turn write", () => writeAll());
}

// Every civilization's config rows: its dealt ability and the uniques it holds, which the loading screen, the
// Civilopedia and the diplomacy panel read (CONTRACTS 25; before, only the local civ's were written, so every other
// civ showed what it shipped with). With As you meet them, a civ of a player not met yet shows as shipped.
function knownCivs() {
  const known = new Set();
  const mine = guarded("local civ", () => Configuration.getPlayer(GameContext.localPlayerID).civilizationTypeName, null);
  if (mine && mine !== "RANDOM") known.add(mine);
  for (const player of majorPlayers()) if (player.met && player.civType) known.add(player.civType);
  return known;
}

// Which civs show their deal: all of them, or with As you meet them the local civ, met players' civs and civs nobody
// plays. null while the players can't be read yet (the next write settles it).
function civsShown() {
  if (!isMetMode(state.data.reveal)) return { all: true };
  const playing = new Set(majorPlayers().map((p) => p.civType).filter(Boolean));
  if (!playing.size) return null;
  return { known: knownCivs(), playing };
}

// The shipped civ rows and every civ's dealt view, read once (the deal is fixed for the game).
function civViewsOnce() {
  if (!state.civViews) {
    state.shippedCivs = readCivItemRows(SHIPPED_CIV_ITEMS);
    state.civViews = civDealViews(state.data.deal.civPieces, state.shippedCivs);
  }
  return { shipped: state.shippedCivs, views: state.civViews };
}

function writeCivRows() {
  if (!(state.data.deal.civPieces || []).length) return;
  const shown = civsShown();
  if (!shown) return;
  const { shipped, views } = civViewsOnce();
  for (const [civ, own] of shipped) {
    const dealt = shown.all || shown.known.has(civ) || !shown.playing.has(civ);
    const view = (dealt && views.get(civ)) || shippedCivView(own);
    const sign = JSON.stringify(view);
    if (state.civWritten.get(civ) === sign) continue;
    if (writeCivItemRows(civ, view, own)) state.civWritten.set(civ, sign);
  }
}

function prepare() {
  if (state.data) return true;
  state.data = readGameDeal();
  if (!state.data) return false;
  state.context = gameContext(state.data.mode);
  const preview = readPreview();
  state.differs = previewDifferences(preview, state.data.deal);
  return true;
}

function start() {
  if (!prepare()) {
    console.warn(`${LOG} no deal tables in this game; leader screens left as they are`);
    return;
  }
  writeAll();
  writeCivRows();
  setRevealSource(revealContent);
  engine.on("PlayerTurnActivated", onTurn);
  const onMeet = () => guarded("meet write", () => {
    writeAll();
    writeCivRows();
  });
  engine.on("DiplomacyMeet", onMeet);
  engine.on("DiplomacyMeetMajors", onMeet);
  console.warn(`${LOG} wrote ${state.written.size} leaders; preview differs for ${state.differs.length}`);
}

// Every leader's rows go in as the script loads (the Civilopedia and diplomacy panel read them); the loading
// screen's own rows went in earlier, from lshuf-load-screen.js.
guarded("early rows", () => {
  if (!prepare()) return;
  writeAll();
  writeCivRows();
  installTraditionOwners(state.data.deal.civPieces);
});
guarded("city details", () => installCityDetailsNames());
guarded("transition buttons", () => installTransitionButtons());
guarded("diplomacy section", () => installRevealSection());
const ready = guarded("whenReady", () => engine.whenReady, null);
if (ready && typeof ready.then === "function") ready.then(() => guarded("start", start));
else guarded("start", start);
