// Shell UIScripts entry. Shows the deal on the leader-select screen while the player sets up, and writes the final
// rows just before the game starts, so the loading screen, Civilopedia and diplomacy panel show it too (probe 8).
//
// The deal is worked out here with the same module the game's SQL is generated from (shared/deal/lshuf-deal.js),
// over the setup-side copy of the gameplay rows (LShufSetup_*), kept to the leaders and civs this player has.
// With "Show what everyone got: As you meet them" only the local player's own leader is shown.
import { DEAL_VERSION, buildDealInput, computeDeal } from "/uncharted-leaders-and-civs/shared/deal/lshuf-deal.js";
import { readDealConfigFromSetup, isLocalHost } from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-config.js";
import { readSetupTable } from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-tables.js";
import {
  EVENT, KEY, REVEAL, OPTION_DEFAULTS, BIAS_TABLES, BIAS_TARGET_COLUMN, A_MODE, T_MODE,
  B_MODE
} from "/uncharted-leaders-and-civs/shared/lshuf-constants.js";
import { biasLine, LINE_BREAK } from "/uncharted-leaders-and-civs/ui/display/lshuf-display-text.js";
import {
  attributeTags,
  leaderView,
  previewOf,
  readCivItemRows,
  readLeaderRows,
  SHIPPED_CIV_ITEMS,
  shippedCivView,
  writeCivItemRows,
  writeLeaderRows
} from "/uncharted-leaders-and-civs/ui/display/lshuf-config-rows.js";
import { guarded, mapSetsStarts } from "/uncharted-leaders-and-civs/ui/display/lshuf-display-util.js";
import { civDealViews } from "/uncharted-leaders-and-civs/ui/display/lshuf-civ-views.js";

const LOG = "[lshuf-setup-display]";
const POLL_MS = 500;

const state = {
  shipped: null,
  tagOf: null,
  tagTypes: [],
  written: new Map(),
  civShipped: null,
  civWritten: new Map(),
  lastInputs: "",
  revision: null
};

// readTable for buildDealInput: the shared setup-side reader (ui/setup/lshuf-setup-tables.js).
const readTable = readSetupTable;

// The shipped ability keys of a leader: its LeaderItems row names the trait, the setup copy holds the keys.
function abilityOf(leaderType) {
  const row = state.shipped && state.shipped.get(leaderType);
  if (!row) return null;
  const trait = readTable("Traits").find((t) => t.TraitType === row.type);
  if (trait) return { name: trait.Name, description: trait.Description };
  return { name: row.name, description: row.description };
}

function setup() {
  if (state.shipped) return true;
  state.tagOf = attributeTags(readTable);
  state.tagTypes = [...new Set(state.tagOf.values())];
  state.shipped = readLeaderRows(state.tagTypes);
  return state.shipped.size > 0;
}

function localLeader() {
  return guarded("local leader", () => Configuration.getPlayer(GameContext.localPlayerID)?.leaderTypeName || null, null);
}

function mapScript() {
  return guarded("map script", () => {
    const value = GameSetup.findGameParameter("Map")?.value?.value;
    return value == null ? "" : String(value);
  }, "");
}

const optionOf = (config, name) => {
  const value = config && config.options ? config.options[name] : null;
  return value == null ? OPTION_DEFAULTS[name] : value;
};

// Every part on Normal deals nothing: the screens show the game as shipped (CONTRACTS 15).
function asShipped(config) {
  return optionOf(config, "Abilities") === A_MODE.Normal
    && optionOf(config, "Attributes") === T_MODE.Normal
    && optionOf(config, "Biases") === B_MODE.Normal;
}

function shippedView(leaderType) {
  const row = state.shipped.get(leaderType);
  return { name: row.name, description: row.description, tags: [...row.tags] };
}

function sameView(a, b) {
  return !!a && !!b && a.name === b.name && a.description === b.description && a.tags.join() === b.tags.join();
}

function writeView(leaderType, view) {
  // Rows we haven't touched still hold what the game shipped.
  const current = state.written.get(leaderType) || shippedView(leaderType);
  if (sameView(current, view)) return;
  if (writeLeaderRows(leaderType, view, state.shipped.get(leaderType), state.tagTypes)) {
    state.written.set(leaderType, view);
  }
}

// A leader's shipped bias rows from the setup copy, in LShufResultBiases shape.
function shippedBiasRows(leaderType) {
  const out = [];
  for (const table of BIAS_TABLES) {
    const column = BIAS_TARGET_COLUMN[table];
    for (const row of readTable(table)) {
      if (row.LeaderType !== leaderType) continue;
      out.push({ TableName: table, LeaderType: leaderType, TargetType: column ? row[column] : null, Score: row.Score });
    }
  }
  return out;
}

// A game as shipped: the shipped ability text and tags, with the start-bias line after it. A leader the setup copy
// doesn't hold has nothing to add and keeps its vanilla row.
function showShipped(config) {
  const ctx = viewContext(config);
  const copied = new Set(readTable("Leaders").map((r) => r.LeaderType));
  for (const leaderType of state.shipped.keys()) {
    const row = state.shipped.get(leaderType);
    if (!copied.has(leaderType)) {
      writeView(leaderType, shippedView(leaderType));
      continue;
    }
    const bias = biasLine(shippedBiasRows(leaderType), ctx);
    const text = Locale.compose(row.description);
    writeView(leaderType, { name: row.name, description: [text, bias].filter(Boolean).join(LINE_BREAK),
      tags: [...row.tags] });
  }
}

function viewContext(config) {
  return {
    mode: optionOf(config, "Mode"),
    abilities: optionOf(config, "Abilities"),
    abilityOf,
    compose: (key, ...args) => Locale.compose(key, ...args),
    targetName: null,
    mapSetsStarts: mapSetsStarts(mapScript()),
    tagOf: state.tagOf
  };
}

// Writes every leader the player may see, and puts the others back as shipped.
function showDeal(config, deal, extraFor) {
  const ctx = viewContext(config);
  const onlyMine = optionOf(config, "Reveal") === REVEAL.Met;
  const mine = localLeader();
  for (const leaderType of state.shipped.keys()) {
    const show = !onlyMine || leaderType === mine;
    const view = show ? leaderView(leaderType, deal, { ...ctx, extraLines: extraFor(leaderType) }) : null;
    writeView(leaderType, view || shippedView(leaderType));
  }
}

function dealFor(config) {
  return computeDeal(buildDealInput(readTable, config));
}

// --- the civ select (CONTRACTS 14): the host's civ build ---

function civShipped() {
  if (!state.civShipped) state.civShipped = readCivItemRows(SHIPPED_CIV_ITEMS);
  return state.civShipped;
}

const sameCivView = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function writeCivView(civType, view) {
  const shipped = civShipped().get(civType);
  if (!shipped) return;
  const current = state.civWritten.get(civType) || shippedCivView(shipped);
  if (sameCivView(current, view)) return;
  if (writeCivItemRows(civType, view, shipped)) state.civWritten.set(civType, view);
}

function showCivBuild(deal) {
  const views = guarded("civ deal views", () => civDealViews((deal && deal.civPieces) || [], civShipped()), new Map());
  for (const civType of civShipped().keys()) {
    const view = views.get(civType) || shippedCivView(civShipped().get(civType));
    writeCivView(civType, view);
  }
}

function refresh(force) {
  if (!setup()) return;
  const config = guarded("read setup", () => readDealConfigFromSetup(), null);
  if (!config) return;
  const inputs = JSON.stringify([config, localLeader(), mapScript()]);
  if (!force && inputs === state.lastInputs) return;
  state.lastInputs = inputs;
  // The civ cards follow the deal whatever the leader parts say, since the civilization rows have their own.
  const deal = guarded("preview deal", () => dealFor(config), null);
  guarded("civ build preview", () => showCivBuild(deal));
  if (asShipped(config)) {
    showShipped(config);
    return;
  }
  if (deal) showDeal(config, deal, () => []);
}

// Just before startGame: the final deal, with the deal number on the local player's own leader for the loading
// screen, and the preview kept in the game config so the game can say when its own deal came out different.
function onFinal(event) {
  if (!setup()) return;
  const config = (event && event.detail) || guarded("read setup", () => readDealConfigFromSetup(), null);
  if (!config) return;
  const deal = guarded("final deal", () => dealFor(config), null);
  if (!deal) return;
  guarded("civ build final", () => showCivBuild(deal));
  if (asShipped(config)) showShipped(config);
  else {
    const mine = localLeader();
    const seedLine = Locale.compose("LOC_LSHUF_DEAL_NUMBER", String(config.seed));
    showDeal(config, deal, (leaderType) => (leaderType === mine ? [seedLine] : []));
  }
  guarded("write preview", () => {
    const host = guarded("host check", () => isLocalHost(), false);
    if (!host) return;
    Configuration.editGame().setValue(KEY.Preview, JSON.stringify(previewOf(deal, config.seed, DEAL_VERSION)));
  });
  state.lastInputs = "";
}

function poll() {
  const revision = guarded("revision", () => GameSetup.currentRevision, null);
  if (revision === state.revision) return;
  state.revision = revision;
  guarded("refresh", () => refresh(false));
}

window.addEventListener(EVENT.SetupChanged, () => guarded("refresh", () => refresh(true)));
window.addEventListener(EVENT.SetupFinal, (event) => guarded("final", () => onFinal(event)));
setInterval(poll, POLL_MS);
console.warn(`${LOG} loaded`);
