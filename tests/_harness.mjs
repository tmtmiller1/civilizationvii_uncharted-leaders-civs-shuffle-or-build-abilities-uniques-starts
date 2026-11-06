// Test harness: builds a fixture database the way the game would for a given setup, and the helpers the tests share.
//
// loadGame({ fixture, config }) copies tests/fixtures/db/<fixture>/gameplay.sqlite, then runs every game-scope
// ActionGroup of the modinfo (scripts/build-modinfo.mjs buildModinfo(): the template plus workstream B's fragments)
// whose criteria match `config`, in LoadOrder order (document order within one LoadOrder), running the SQL items of
// each UpdateDatabase action. UpdateText, UIScripts and ImportFiles don't touch the gameplay database and are skipped.
// Criteria follow CONTRACTS.md section 9: ConfigurationValueMatches is true when the config value, as a string,
// equals Value (a bool matches "1" and "true"; a number or a missing key never matches); ConfigurationValueContains
// is true when any entry of the value (an array, or a string split on commas) equals any entry of Value split on
// commas. Any other criterion type throws, so a new one is noticed.
//
// The database as it stood just before the first group at DEAL_LOAD_ORDER is kept as `pre` (read-only), so a test
// can feed the same tables to computeDeal() and compare the shipped rows with what the deal SQL left.
//
// Owned by workstream E.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  DLC_LEADER,
  ensureFixtures,
  fixturePaths,
  foreignKeyCheck,
  openDb,
  PROJECT_ROOT
} from "../scripts/fixtures/build-fixtures.mjs";
import {
  CONFIG_KEY,
  configKeyOf,
  KEY,
  listValue,
  OPTION_DEFAULTS,
  PARAM,
  REASON
} from "../shared/lshuf-constants.js";
import { KNOWN_LEADERS, MODDED_LEADER_TYPES, VANILLA_LEADERS } from "../shared/lshuf-known-leaders.js";

export { DLC_LEADER, foreignKeyCheck, openDb, PROJECT_ROOT, fixturePaths, ensureFixtures };
export const DEAL_LOAD_ORDER = 20100;
export const RESULT_TABLES = {
  leaders: "LShufResultLeaders",
  pieces: "LShufResultPieces",
  attributes: "LShufResultAttributes",
  biases: "LShufResultBiases",
  unlocks: "LShufResultUnlocks",
  meta: "LShufResultMeta"
};
export const BOOL_OPTIONS = ["KeepMine", "ModdedAbilities", "ModdedAttributes", "ModdedBiases"];

// ---------------------------------------------------------------------------------------------------------------
// Files that other workstreams haven't written yet.

const OWNERS = [
  ["shared/deal/", "B"],
  ["scripts/generate/", "B"],
  ["data/generated/", "B"],
  ["scripts/mapping/", "A"],
  ["data/mapping/", "A"],
  ["ui/setup/", "C"],
  ["data/frontend/", "C"],
  ["ui/game/", "D"],
  ["ui/display/", "D"],
  ["data/text-generated/", "D"],
  ["data/setup-copy/", "D"],
  ["scripts/setup-copy/", "D"],
  ["text/", "F"]
];
export const ownerOf = (rel) => (OWNERS.find(([prefix]) => rel.startsWith(prefix)) || [null, "lead"])[1];

export class WaitingError extends Error {
  constructor(rel, detail = "") {
    const owner = ownerOf(rel);
    super(`WAITING ON ${owner === "lead" ? "the lead" : `workstream ${owner}`}: ${rel} doesn't exist yet${detail}`);
    this.name = "WaitingError";
    this.owner = owner;
    this.rel = rel;
  }
}

export function need(rel) {
  const abs = path.join(PROJECT_ROOT, rel);
  if (!fs.existsSync(abs)) throw new WaitingError(rel);
  return abs;
}

// Imports a shipped module through its game path, after checking the file is there.
export async function importShipped(rel) {
  need(rel);
  return import(pathToFileURL(path.join(PROJECT_ROOT, rel)).href);
}

export const dealModule = () => importShipped("shared/deal/lshuf-deal.js");

// ---------------------------------------------------------------------------------------------------------------
// The modinfo.

const stripComments = (xml) => xml.replace(/<!--[\s\S]*?-->/g, "");
const attr = (text, name) => (text.match(new RegExp(`\\b${name}="([^"]*)"`)) || [])[1];
const tagText = (text, name) => {
  const m = text.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : undefined;
};

const CONDITION_TYPES = ["AlwaysMet", "ConfigurationValueMatches", "ConfigurationValueContains"];

export function parseModinfo(xml) {
  const text = stripComments(xml);
  const criteria = new Map();
  for (const m of text.matchAll(/<Criteria\b([^>]*)>([\s\S]*?)<\/Criteria>/g)) {
    const id = attr(m[1], "id");
    const conditions = [];
    for (const c of m[2].matchAll(/<(\w+)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
      const type = c[1];
      if (!CONDITION_TYPES.includes(type)) throw new Error(`harness: criterion ${id} uses ${type}, not handled`);
      conditions.push({
        type,
        group: tagText(c[2], "Group"),
        key: tagText(c[2], "ConfigurationId"),
        value: tagText(c[2], "Value")
      });
    }
    criteria.set(id, { id, any: attr(m[1], "any") === "true", conditions });
  }
  const groups = [];
  let index = 0;
  for (const m of text.matchAll(/<ActionGroup\b([^>]*)>([\s\S]*?)<\/ActionGroup>/g)) {
    const body = m[2];
    const actions = [];
    const actionsBody = tagText(body, "Actions") || "";
    for (const a of actionsBody.matchAll(/<(\w+)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
      const items = [...a[2].matchAll(/<Item\b[^>]*>([^<]+)<\/Item>/g)].map((i) => i[1].trim());
      actions.push({ type: a[1], items });
    }
    const loadOrder = Number(tagText(body, "LoadOrder") || 0);
    groups.push({
      id: attr(m[1], "id"),
      scope: attr(m[1], "scope"),
      criteria: attr(m[1], "criteria"),
      loadOrder,
      index: index++,
      actions
    });
  }
  return { criteria, groups };
}

let builderModule = null;
export async function builder() {
  builderModule = builderModule || (await import(pathToFileURL(path.join(PROJECT_ROOT, "scripts/build-modinfo.mjs")).href));
  return builderModule;
}

export async function modinfoText({ fromFile = false } = {}) {
  if (fromFile) {
    return fs.readFileSync(need("re-dealable-leader-abilities-attributes-and-start-biases.modinfo"), "utf8");
  }
  return (await builder()).buildModinfo();
}

// ---------------------------------------------------------------------------------------------------------------
// Criteria.

function matchStrings(value) {
  if (typeof value === "string") return [value];
  if (typeof value === "boolean") return value ? ["1", "true"] : ["0", "false"];
  return null;
}

function containsEntries(value) {
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  if (typeof value === "string") return value.split(",");
  if (typeof value === "boolean") return value ? ["1"] : ["0"];
  return [];
}

export function conditionMet(cond, config) {
  if (cond.type === "AlwaysMet") return true;
  if (cond.group && cond.group !== "Game") throw new Error(`harness: config group ${cond.group} not handled`);
  const value = config[cond.key];
  if (cond.type === "ConfigurationValueMatches") {
    const strings = matchStrings(value);
    return strings !== null && strings.includes(cond.value);
  }
  const wanted = String(cond.value ?? "").split(",");
  return containsEntries(value).some((entry) => wanted.includes(entry));
}

export function criteriaMet(criteria, id, config) {
  const c = criteria.get(id);
  if (!c) throw new Error(`harness: ActionGroup names criteria ${id}, which isn't defined`);
  if (!c.conditions.length) return false;
  return c.any ? c.conditions.some((x) => conditionMet(x, config)) : c.conditions.every((x) => conditionMet(x, config));
}

// ---------------------------------------------------------------------------------------------------------------
// Setup values, written the way the setup screen writes them (CONTRACTS sections 2 and 3).

// spec: { seed, options: {Name: value}, kept: [], excluded: [], moddedExcluded: [], notInGame: [], modOK: [] }
export function normalizeOptions(options = {}) {
  const out = { ...OPTION_DEFAULTS };
  for (const [k, v] of Object.entries(options)) {
    if (!(k in OPTION_DEFAULTS)) throw new Error(`unknown option ${k}`);
    out[k] = BOOL_OPTIONS.includes(k) ? (v === true || v === "1" || v === 1 ? "1" : "0") : v;
  }
  return out;
}

const anyModdedBox = (o) => o.ModdedAbilities === "1" || o.ModdedAttributes === "1" || o.ModdedBiases === "1";

export function gameConfig(spec = {}) {
  const options = normalizeOptions(spec.options);
  const config = {};
  for (const [name, value] of Object.entries(options)) {
    config[configKeyOf(PARAM[name])] = BOOL_OPTIONS.includes(name) ? value === "1" : value;
  }
  config[PARAM.Seed] = String(spec.seed ?? 1);
  config[CONFIG_KEY[PARAM.LeadersOut]] = (spec.excluded || []).map(listValue);
  config[CONFIG_KEY[PARAM.ModdedOut]] = (spec.moddedExcluded || []).map(listValue);
  config[PARAM.Pool1] = [];
  config[PARAM.Pool2] = [];
  const kept = options.KeepMine === "1" ? spec.kept || [] : [];
  for (const leader of KNOWN_LEADERS) config[KEY.keep(leader)] = kept.includes(leader) ? "1" : "0";
  if (anyModdedBox(options)) {
    for (const leader of MODDED_LEADER_TYPES) config[KEY.modOK(leader)] = (spec.modOK || []).includes(leader) ? "1" : "0";
  }
  config[KEY.NotInGame] = (spec.notInGame || []).map(listValue);
  return { ...config, ...(spec.extra || {}) };
}

// The deal's config object (CONTRACTS 5.2) for the same setup.
export function dealConfig(spec = {}) {
  const options = normalizeOptions(spec.options);
  const out = [];
  const add = (list, known, Reason) => {
    for (const l of list || []) if (known.includes(l)) out.push({ LeaderType: l, Reason });
  };
  add(spec.excluded, VANILLA_LEADERS, REASON.List);
  add(spec.moddedExcluded, MODDED_LEADER_TYPES, REASON.ModdedList);
  add(spec.notInGame, KNOWN_LEADERS, REASON.NotInGame);
  return {
    seed: Number(spec.seed ?? 1),
    options,
    kept: options.KeepMine === "1" ? [...(spec.kept || [])].sort() : [],
    out: sortOut(out),
    modOK: anyModdedBox(options) ? [...(spec.modOK || [])].sort() : []
  };
}

const outKey = (r) => `${r.LeaderType}|${r.Reason}`;
const sortOut = (out) => [...out].sort((a, b) => (outKey(a) < outKey(b) ? -1 : outKey(a) > outKey(b) ? 1 : 0));

// The same object read back from the input tables the per-value groups filled.
export function configFromTables(db) {
  const seedRow = db.prepare("SELECT Seed FROM LShufSeed").all();
  const options = { ...OPTION_DEFAULTS };
  for (const r of db.prepare("SELECT Name, Value FROM LShufOptions").all()) options[r.Name] = String(r.Value);
  const col = (sql) => db.prepare(sql).all().map((r) => r.LeaderType).sort();
  return {
    seed: seedRow.length ? Number(seedRow[0].Seed) : 1,
    seedRows: seedRow.length,
    options,
    kept: col("SELECT LeaderType FROM LShufKept"),
    out: sortOut(db.prepare("SELECT LeaderType, Reason FROM LShufOut").all().map((r) => ({ ...r }))),
    modOK: col("SELECT LeaderType FROM LShufModOK")
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Loading.

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lshuf-tests-"));
process.on("exit", () => fs.rmSync(tmpRoot, { recursive: true, force: true }));
let tmpCount = 0;
const tmpFile = (label) => path.join(tmpRoot, `${label}-${++tmpCount}.sqlite`);
const clone = (src, dest) => fs.copyFileSync(src, dest, fs.constants.COPYFILE_FICLONE);

function runItems(db, group, { allowMissing, missing, ran }) {
  for (const action of group.actions) {
    if (action.type !== "UpdateDatabase") continue;
    for (const rel of action.items) {
      const abs = path.join(PROJECT_ROOT, rel);
      if (!fs.existsSync(abs)) {
        if (allowMissing) {
          missing.push({ group: group.id, rel, owner: ownerOf(rel) });
          continue;
        }
        throw new WaitingError(rel, ` (UpdateDatabase item of ${group.id})`);
      }
      if (!rel.endsWith(".sql")) throw new Error(`harness: ${group.id} loads ${rel}; only .sql items are handled`);
      try {
        db.exec(fs.readFileSync(abs, "utf8"));
      } catch (e) {
        throw new Error(`${group.id}: ${rel}: ${e.message}`);
      }
      ran.push(rel);
    }
  }
}

const prefixCache = new Map();

function groupDigest(groups) {
  const h = crypto.createHash("sha1");
  for (const g of groups) {
    h.update(`${g.id}\0`);
    for (const a of g.actions) {
      for (const rel of a.items) {
        const abs = path.join(PROJECT_ROOT, rel);
        h.update(`${rel}\0${fs.existsSync(abs) ? fs.readFileSync(abs) : "missing"}\0`);
      }
    }
  }
  return h.digest("hex");
}

// opts: { fixture = "base", config = gameConfig(), hooks = [{ before: loadOrder, run(db) }], allowMissing = false,
//         requireDeal = true, scope = "game", modinfo (text), stopAt (skip groups at this LoadOrder and later) }
export async function loadGame(opts = {}) {
  const fixture = opts.fixture || "base";
  const scope = opts.scope || "game";
  const config = opts.config || gameConfig();
  const hooks = [...(opts.hooks || [])].sort((a, b) => a.before - b.before);
  ensureFixtures([fixture]);
  const source = fixturePaths(fixture)[scope === "game" ? "gameplay" : "frontend"];
  const { criteria, groups } = parseModinfo(opts.modinfo || (await modinfoText()));
  const scoped = groups.filter((g) => g.scope === scope).sort((a, b) => a.loadOrder - b.loadOrder || a.index - b.index);
  const applied = scoped.filter((g) => criteriaMet(criteria, g.criteria, config));
  if (scope === "game" && opts.requireDeal !== false && !applied.some((g) => g.id.startsWith("lshuf-deal-"))) {
    need("data/generated/modinfo-groups.xml");
    throw new Error("harness: no lshuf-deal-* group applies; the generated groups don't hold the deal");
  }
  const state = { allowMissing: !!opts.allowMissing, missing: [], ran: [] };

  // Groups before the first config-dependent group (or hook, or the deal) are the same for every config: run them
  // once per fixture and copy the result.
  const stop = Math.min(DEAL_LOAD_ORDER, hooks.length ? hooks[0].before : Infinity);
  let cut = 0;
  while (cut < applied.length && criteria.get(applied[cut].criteria)?.conditions.every((c) => c.type === "AlwaysMet")) {
    if (applied[cut].loadOrder >= stop) break;
    cut++;
  }
  const prefix = applied.slice(0, cut);
  const key = `${fixture}|${scope}|${state.allowMissing}|${groupDigest(prefix)}`;
  if (!prefixCache.has(key)) {
    const file = tmpFile(`${fixture}-prefix`);
    clone(source, file);
    const db = openDb(file);
    const prefState = { ...state, missing: [], ran: [] };
    try {
      for (const g of prefix) runItems(db, g, prefState);
    } finally {
      db.close();
    }
    prefixCache.set(key, { file, missing: prefState.missing, ran: prefState.ran });
  }
  const cached = prefixCache.get(key);
  state.missing.push(...cached.missing);
  state.ran.push(...cached.ran);

  const work = tmpFile(fixture);
  clone(cached.file, work);
  const db = openDb(work);
  let preFile = null;
  const capturePre = () => {
    if (preFile) return;
    preFile = tmpFile(`${fixture}-pre`);
    clone(work, preFile);
  };
  let h = 0;
  for (const g of applied.slice(cut)) {
    if (opts.stopAt != null && g.loadOrder >= opts.stopAt) break;
    while (h < hooks.length && hooks[h].before <= g.loadOrder) hooks[h++].run(db);
    if (g.loadOrder >= DEAL_LOAD_ORDER) capturePre();
    runItems(db, g, state);
  }
  while (h < hooks.length) hooks[h++].run(db);
  capturePre();
  const pre = openDb(preFile, { readOnly: true });
  return {
    db,
    pre,
    config,
    applied: applied.map((g) => g.id),
    missing: state.missing,
    ran: state.ran,
    close() {
      db.close();
      pre.close();
      fs.rmSync(work, { force: true });
      fs.rmSync(preFile, { force: true });
    }
  };
}

// The shell scope's UpdateDatabase items, run into a copy of the fixture's frontend database.
export function loadShell(opts = {}) {
  return loadGame({ ...opts, scope: "shell", requireDeal: false });
}

// ---------------------------------------------------------------------------------------------------------------
// Reading results.

const q = (name) => `"${String(name).replace(/"/g, '""')}"`;
export const rows = (db, sql, ...args) => db.prepare(sql).all(...args).map((r) => ({ ...r }));

// A readTable for buildDealInput (CONTRACTS 5.2). `reverse` hands rows over in the opposite storage order, to show
// the deal doesn't depend on row order.
export function readTableFrom(db, { reverse = false } = {}) {
  return (name) => rows(db, `SELECT * FROM ${q(name)} ORDER BY rowid ${reverse ? "DESC" : "ASC"}`);
}

function columnTypes(db, table) {
  return db.prepare(`PRAGMA table_info(${q(table)})`).all().map((c) => ({ name: c.name, int: /INT/i.test(c.type) }));
}

function normalizeRow(row, cols) {
  return cols.map(({ name, int }) => {
    const v = row[name];
    if (v === undefined || v === null) return null;
    return int ? Number(v) : String(v);
  });
}

const sortRows = (list) => list.map((r) => JSON.stringify(r)).sort();

// { leaders: [json rows sorted], ... } from the result tables.
export function sqlResult(db) {
  const out = {};
  for (const [key, table] of Object.entries(RESULT_TABLES)) {
    const cols = columnTypes(db, table);
    out[key] = sortRows(rows(db, `SELECT * FROM ${q(table)}`).map((r) => normalizeRow(r, cols)));
  }
  return out;
}

// The same shape from a computeDeal() result, checking each row has exactly the table's columns.
export function jsResult(db, result) {
  const out = {};
  for (const [key, table] of Object.entries(RESULT_TABLES)) {
    const cols = columnTypes(db, table);
    const names = cols.map((c) => c.name).sort();
    const list = result?.[key];
    assert.ok(Array.isArray(list), `computeDeal() result has no ${key} array`);
    for (const r of list) {
      const extra = Object.keys(r).filter((k) => !names.includes(k));
      assert.deepEqual(extra, [], `${key} row has keys that aren't ${table} columns: ${extra.join(", ")}`);
    }
    out[key] = sortRows(list.map((r) => normalizeRow(r, cols)));
  }
  return out;
}

// Plain objects again, for checks that read the rows.
export function resultObjects(db, normalized) {
  const out = {};
  for (const [key, table] of Object.entries(RESULT_TABLES)) {
    const cols = columnTypes(db, table).map((c) => c.name);
    out[key] = normalized[key].map((json) => Object.fromEntries(JSON.parse(json).map((v, i) => [cols[i], v])));
  }
  return out;
}

// assert.deepEqual on two normalized results with a readable diff of the first rows that differ.
export function assertSameResult(actual, expected, label) {
  for (const key of Object.keys(RESULT_TABLES)) {
    const a = new Set(actual[key]);
    const e = new Set(expected[key]);
    const onlyA = actual[key].filter((r) => !e.has(r));
    const onlyE = expected[key].filter((r) => !a.has(r));
    if (onlyA.length || onlyE.length || actual[key].length !== expected[key].length) {
      assert.fail(
        `${label}: ${RESULT_TABLES[key]} differs (${actual[key].length} vs ${expected[key].length} rows)\n` +
          `  only in first:  ${onlyA.slice(0, 5).join("\n                  ")}\n` +
          `  only in second: ${onlyE.slice(0, 5).join("\n                  ")}`
      );
    }
  }
}

// Foreign-key rows in `db` that weren't in `baseline` (both from foreignKeyCheck()). A table whose check errors in
// `db` but not in the baseline counts too.
export function newForeignKeyRows(db, baseline) {
  const key = (r) => `${r.table}|${r.rowid}|${r.parent}|${r.fkid}`;
  const seen = new Set(baseline.rows.map(key));
  const now = foreignKeyCheck(db);
  const fresh = now.rows.filter((r) => !seen.has(key(r)));
  const newErrors = Object.keys(now.errors).filter((t) => !(t in baseline.errors));
  return { fresh, newErrors };
}

const fkBaselines = new Map();
export function fixtureForeignKeys(fixture = "base") {
  if (!fkBaselines.has(fixture)) {
    ensureFixtures([fixture]);
    const db = openDb(fixturePaths(fixture).gameplay, { readOnly: true });
    fkBaselines.set(fixture, foreignKeyCheck(db));
    db.close();
  }
  return fkBaselines.get(fixture);
}

// Sorted JSON rows of a query, for before/after comparisons.
export const snapshot = (db, sql, ...args) => sortRows(rows(db, sql, ...args));
