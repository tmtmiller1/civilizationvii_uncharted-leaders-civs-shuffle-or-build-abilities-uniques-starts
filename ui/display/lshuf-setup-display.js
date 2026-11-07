// Shell UIScripts entry. Shows the deal on the leader-select screen while the player sets up, and writes the final
// rows just before the game starts, so the loading screen, Civilopedia and diplomacy panel show it too (probe 8).
//
// The deal is worked out here with the same module the game's SQL is generated from (shared/deal/lshuf-deal.js),
// over the setup-side copy of the gameplay rows (LShufSetup_*), kept to the leaders and civs this player has.
// With "Show what everyone got: As you meet them" only the local player's own leader is shown.
import { DEAL_VERSION, buildDealInput, computeDeal } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/deal/lshuf-deal.js";
import { readDealConfigFromSetup, isLocalHost } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-config.js";
import {
  EVENT, KEY, REVEAL, OPTION_DEFAULTS, BIAS_TABLES, BIAS_TARGET_COLUMN, A_MODE, T_MODE,
  B_MODE
} from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";
import { biasLine, LINE_BREAK } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/display/lshuf-display-text.js";
import { bulletAt, joinBullets } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-text.js";
import {
  attributeTags,
  leaderView,
  previewOf,
  readCivItemRows,
  readLeaderRows,
  shippedCivView,
  writeCivItemRows,
  writeLeaderRows
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/display/lshuf-config-rows.js";
import { guarded, mapSetsStarts } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/display/lshuf-display-util.js";

const LOG = "[lshuf-setup-display]";
const POLL_MS = 500;

// Gameplay tables the deal reads (CONTRACTS.md 4.2), with the columns that name a leader or a civ, so rows of a
// leader or civ this player doesn't have are left out, as the game's own database would leave them out.
const LEADER_COLUMN = {
  Leaders: "LeaderType",
  LeaderTraits: "LeaderType",
  LeaderCivPriorities: "Leader"
};
const CIV_COLUMN = { LeaderCivPriorities: "Civilization", LegacyCivilizations: "CivilizationType" };

const state = {
  tables: new Map(),
  installedLeaders: null,
  installedCivs: null,
  shipped: null,
  tagOf: null,
  tagTypes: [],
  written: new Map(),
  civShipped: null,
  civWritten: new Map(),
  lastInputs: "",
  revision: null
};

function configRows(sql) {
  return guarded(`query ${sql.slice(0, 80)}`, () => Database.query("config", sql) || [], []);
}

function installed() {
  if (!state.installedLeaders) {
    state.installedLeaders = new Set(configRows("SELECT LeaderType FROM Leaders").map((r) => r.LeaderType));
    const civs = configRows("SELECT CivilizationType FROM Civilizations");
    state.installedCivs = new Set(civs.map((r) => r.CivilizationType));
  }
  return state;
}

function keepRow(name, row) {
  const { installedLeaders, installedCivs } = installed();
  const leaderColumn = LEADER_COLUMN[name] || (name.startsWith("StartBias") ? "LeaderType" : null);
  const civColumn = CIV_COLUMN[name] || (name.startsWith("StartBias") ? "CivilizationType" : null);
  if (leaderColumn && row[leaderColumn] != null && !installedLeaders.has(row[leaderColumn])) return false;
  if (civColumn && row[civColumn] != null && !installedCivs.has(row[civColumn])) return false;
  return true;
}

// readTable for buildDealInput: our own LShuf* tables as they are, the game's tables from the setup copy.
function readTable(name) {
  if (!state.tables.has(name)) {
    const rows = name.startsWith("LShuf")
      ? configRows(`SELECT * FROM ${name}`)
      : configRows(`SELECT * FROM LShufSetup_${name}`).filter((row) => keepRow(name, row));
    state.tables.set(name, rows);
  }
  return state.tables.get(name);
}

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

const CIV_UNIQUE = "CIVUNQ_";
const UNIQUE_ROW_KIND = { unit: "KIND_UNIT", building: "KIND_BUILDING", quarter: "KIND_QUARTER", improvement: "KIND_IMPROVEMENT" };

function civShipped() {
  if (!state.civShipped) state.civShipped = readCivItemRows();
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

// A unique's shipped row, found by its type among every civ's rows.
function uniqueRow(type) {
  for (const { rows } of civShipped().values()) {
    const row = rows.find((r) => r.Type === type && UNIQUE_ROW_KIND[String(r.Kind).replace("KIND_", "").toLowerCase()]);
    if (row) return row;
  }
  return null;
}

// The civ select rows a civics tree carries with it (CONTRACTS 18): its unique buildings, quarters and
// improvements. Units stay with the uniques.
const CIVICS_ROW_KINDS = ["KIND_BUILDING", "KIND_QUARTER", "KIND_IMPROVEMENT"];
const CIV_CIVICS = "CIVCIVC_";

// The views the deal asks for (CONTRACTS 16 and 18): every civ shows the ability it took (the source civ's keys),
// the uniques it took in place of its own, and with its civics the buildings, quarters and improvements of the civ
// whose civics it got; a unique or civics another civ took is gone from the giver's card. A civ nothing touched
// shows what it ships with. The Off flags have no card text to show, so the ability row is left as shipped then.
const isCivicsRow = (u) => CIVICS_ROW_KINDS.includes(u.Kind);

// The deal's civ rows, by civ, with the uniques and civics that left their civ.
function civMoves(deal) {
  const byCiv = new Map();
  const movedUniques = new Set();
  const movedCivics = new Set();
  for (const r of (deal && deal.civPieces) || []) {
    if (!byCiv.has(r.CivilizationType)) byCiv.set(r.CivilizationType, []);
    byCiv.get(r.CivilizationType).push(r);
    if (r.Kind === "unique") movedUniques.add(String(r.PieceId).slice(CIV_UNIQUE.length));
    if (r.Kind === "civics") movedCivics.add(r.FromCivilization);
  }
  return { byCiv, movedUniques, movedCivics };
}

// A held bonus's text (CONTRACTS 19): its generated key, else the bullet cut from the giver's live description.
function civPieceText(row, shipped) {
  const key = `LOC_LSHUF_CIVPIECE_${row.PieceId}`;
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

function civView(civ, own, moves, shipped) {
  const rows = moves.byCiv.get(civ) || [];
  const ownView = shippedCivView(own);
  const view = { ability: ownView.ability, uniques: ownView.uniques.filter((u) => !moves.movedUniques.has(u.Type)) };
  const ability = rows.find((r) => r.Kind === "ability");
  if (ability && shipped.has(ability.FromCivilization)) {
    view.ability = shippedCivView(shipped.get(ability.FromCivilization)).ability;
  }
  view.ability = civPiecesView(civ, rows, ownView, shipped) || view.ability;
  const uniques = rows.filter((r) => r.Kind === "unique")
    .sort((x, y) => Number(x.SortIndex) - Number(y.SortIndex))
    .map((r) => uniqueRow(String(r.PieceId).slice(CIV_UNIQUE.length))).filter(Boolean);
  if (uniques.length) view.uniques = [...uniques, ...view.uniques.filter(isCivicsRow)];
  const civics = rows.find((r) => r.Kind === "civics");
  if (civics || moves.movedCivics.has(civ)) {
    view.uniques = view.uniques.filter((u) => !isCivicsRow(u));
    const from = civics && shipped.get(String(civics.PieceId).slice(CIV_CIVICS.length));
    if (from) view.uniques.push(...shippedCivView(from).uniques.filter(isCivicsRow));
  }
  view.uniques = view.uniques.map((u, i) => ({ ...u, SortIndex: i }));
  return view;
}

function civDealViews(deal) {
  const views = new Map();
  const shipped = civShipped();
  const moves = civMoves(deal);
  for (const [civ, own] of shipped) views.set(civ, civView(civ, own, moves, shipped));
  return views;
}

function showCivBuild(deal) {
  const views = guarded("civ deal views", () => civDealViews(deal), new Map());
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
