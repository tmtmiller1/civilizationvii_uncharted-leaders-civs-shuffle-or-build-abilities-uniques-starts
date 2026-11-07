// Game UIScripts entry. Writes each leader's dealt ability, attributes and start-bias line into the config rows the
// Civilopedia and diplomacy panel read, from the game's own result tables, so a loaded save (whose setup screen never
// ran) shows the deal too. A new game's loading screen was written by the setup screen; this script runs too late
// for it (probe 8). Also adds the reveal panel and the City Details bonus-line names.
//
// With "Show what everyone got: As you meet them", a leader shows as shipped until the local player meets them.
import { KEY } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";
import {
  leaderView,
  previewDifferences,
  writeLeaderRows
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/display/lshuf-config-rows.js";
import { guarded } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/display/lshuf-display-util.js";
import {
  gameContext,
  readGameDeal,
  readGameplay,
  shippedViewOf
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/game/lshuf-game-data.js";
import {
  installRevealDock,
  isMetMode,
  openRevealPanel,
  setRevealSource
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/game/lshuf-reveal-panel.js";
import { installCityDetailsNames } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/game/lshuf-city-details-names.js";
import { installTransitionButtons } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/game/lshuf-game-transition.js";

const LOG = "[lshuf-game]";
const state = { data: null, context: null, written: new Map(), views: new Map(), opened: false, differs: [] };

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

// The major players in the game, local player first: { id, leaderType, met }.
function majorPlayers() {
  const local = GameContext.localPlayerID;
  const me = guarded("local player", () => Players.get(local), null);
  const out = [];
  for (const player of guarded("players", () => Players.getAlive(), []) || []) {
    if (!player || !player.isMajor) continue;
    const met = player.id === local || !!guarded("met", () => me.Diplomacy.hasMet(player.id), false);
    out.push({ id: player.id, leaderType: leaderTypeOf(player), met });
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

function revealContent() {
  const data = state.data;
  const attributeOf = new Map();
  for (const row of readGameplay("LShufAttributeTraits")) attributeOf.set(row.TraitType, row.AttributeType);
  return {
    deal: data.deal,
    seed: data.seed,
    mode: data.mode,
    tooFew: data.tooFew,
    differs: state.differs,
    attributeOf,
    whyOf: (leaderType) => guarded("why", () => Configuration.getGame().getValue(KEY.modWhy(leaderType)), null),
    viewOf,
    players: () => {
      const metOnly = isMetMode(data.reveal);
      return majorPlayers().map((p) => ({ leaderType: p.leaderType, shown: !!p.leaderType && (!metOnly || p.met) }));
    }
  };
}

function onTurn(event) {
  if (!state.data || !event || event.player !== GameContext.localPlayerID) return;
  guarded("turn write", () => writeAll());
  if (state.opened) return;
  state.opened = true;
  const firstTurn = guarded("turn", () => Game.turn === 1, false);
  if (firstTurn && (state.differs.length || state.data.tooFew.length)) openRevealPanel();
}

function start() {
  state.data = readGameDeal();
  if (!state.data) {
    console.warn(`${LOG} no deal tables in this game; leader screens left as they are`);
    return;
  }
  state.context = gameContext(state.data.mode);
  state.differs = previewDifferences(readPreview(), state.data.deal);
  writeAll();
  setRevealSource(revealContent);
  engine.on("PlayerTurnActivated", onTurn);
  const onMeet = () => guarded("meet write", () => writeAll());
  engine.on("DiplomacyMeet", onMeet);
  engine.on("DiplomacyMeetMajors", onMeet);
  console.warn(`${LOG} wrote ${state.written.size} leaders; preview differs for ${state.differs.length}`);
}

guarded("city details", () => installCityDetailsNames());
guarded("transition buttons", () => installTransitionButtons());
installRevealDock(() => readGameplay("LShufResultLeaders").length > 0);
const ready = guarded("whenReady", () => engine.whenReady, null);
if (ready && typeof ready.then === "function") ready.then(() => guarded("start", start));
else guarded("start", start);
