// Loads a leader mod's data files (from its folder on tp-share) into two scratch in-memory DBs shaped like the
// game's: one with the gameplay schema (game-scope UpdateDatabase files), one with the frontend schema
// (shell-scope files). GameEffects XML modifiers are kept in a Map; en_US text rows in another. Nothing here
// runs the mod's scripts. Every file or statement that fails is recorded in `problems`.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { parseXml, childrenNamed, firstChild, findAll } from "./xml-lite.mjs";
import { splitSql } from "./sql-split.mjs";

// CREATE TABLE / CREATE INDEX statements of a DB, without triggers or views.
export function schemaOf(db) {
  return db
    .prepare("SELECT sql FROM sqlite_master WHERE type IN ('table','index') AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((r) => r.sql);
}

// The scratch DB takes what the author wrote: no NOT NULL checks, and no unique Types.Hash (the game fills Hash
// by trigger, which the scratch DB doesn't have).
function lenient(sql) {
  return sql.replace(/\bNOT NULL\b/g, "").replace(/('Hash'\s+INTEGER\s*)UNIQUE/i, "$1");
}

function scratchDb(schema) {
  const db = new DatabaseSync(":memory:", { enableForeignKeyConstraints: false });
  for (const sql of schema.map(lenient)) {
    try {
      db.exec(sql);
    } catch {
      // A schema statement the scratch DB can't take (rare); the table is then just missing.
    }
  }
  return db;
}

const boolish = (v) => {
  if (v === "true" || v === "True" || v === "TRUE") return 1;
  if (v === "false" || v === "False" || v === "FALSE") return 0;
  return v;
};

function rowValues(row) {
  const values = { ...row.attrs };
  for (const c of row.children) values[c.name] = c.text.trim();
  for (const k of Object.keys(values)) values[k] = boolish(values[k]);
  return values;
}

function columnsOf(db, table) {
  try {
    return new Set(db.prepare(`PRAGMA table_info("${table}")`).all().map((c) => c.name));
  } catch {
    return new Set();
  }
}

// Database-format XML: <Database><Table><Row .../></Table>... plus <Replace>, <Update><Where/><Set/></Update>,
// <Delete>.
function applyDatabaseXml(db, root, file, problems) {
  for (const top of root.children) {
    for (const table of top.children) {
      const name = table.name;
      const cols = columnsOf(db, name);
      if (!table.children.length) continue;
      if (!cols.size) {
        problems.push({ file, what: `table ${name} isn't in the schema (${table.children.length} rows skipped)` });
        continue;
      }
      for (const op of table.children) {
        try {
          if (op.name === "Row" || op.name === "Replace") {
            const v = rowValues(op);
            const keys = Object.keys(v).filter((k) => cols.has(k));
            const missing = Object.keys(v).filter((k) => !cols.has(k));
            if (missing.length) problems.push({ file, what: `${name}: unknown column(s) ${missing.join(", ")}` });
            if (!keys.length) continue;
            const verb = op.name === "Replace" ? "INSERT OR REPLACE" : "INSERT";
            db.prepare(`${verb} INTO "${name}" (${keys.map((k) => `"${k}"`).join(",")}) VALUES (${keys.map(() => "?").join(",")})`).run(
              ...keys.map((k) => v[k])
            );
          } else if (op.name === "Update") {
            const where = firstChild(op, "Where");
            const set = firstChild(op, "Set");
            if (!where || !set) continue;
            const w = rowValues(where);
            const s = rowValues(set);
            const sk = Object.keys(s).filter((k) => cols.has(k));
            const wk = Object.keys(w).filter((k) => cols.has(k));
            if (!sk.length || !wk.length) continue;
            db.prepare(
              `UPDATE "${name}" SET ${sk.map((k) => `"${k}" = ?`).join(", ")} WHERE ${wk.map((k) => `"${k}" = ?`).join(" AND ")}`
            ).run(...sk.map((k) => s[k]), ...wk.map((k) => w[k]));
          } else if (op.name === "Delete") {
            const w = rowValues(op);
            const wk = Object.keys(w).filter((k) => cols.has(k));
            if (!wk.length) continue;
            db.prepare(`DELETE FROM "${name}" WHERE ${wk.map((k) => `"${k}" = ?`).join(" AND ")}`).run(...wk.map((k) => w[k]));
          }
        } catch (e) {
          problems.push({ file, what: `${name} ${op.name}: ${e.message}` });
        }
      }
    }
  }
}

// A <Requirement> inside a modifier or a set: inline (type + arguments) or a reference (xref) to a top-level
// <Requirement id>. References resolve after the whole file set is read (resolveXrefs).
function readReqs(node) {
  if (!node) return [];
  const out = [];
  for (const r of childrenNamed(node, "Requirement")) {
    out.push({
      id: r.attrs.id || null,
      xref: r.attrs.xref || null,
      type: r.attrs.type || r.attrs.Type || null,
      inverse: r.attrs.inverse === "true",
      args: childrenNamed(r, "Argument").map((a) => ({ name: a.attrs.name, value: a.text.trim() }))
    });
  }
  return out;
}

function resolveXrefs(gameEffects, geRequirements) {
  const fix = (list) =>
    list.map((r) => {
      if (!r.xref) return r;
      const target = geRequirements.get(r.xref);
      return target ? { ...target, id: r.xref, inverse: r.inverse !== target.inverse } : { ...r, type: `UNRESOLVED:${r.xref}` };
    });
  for (const m of gameEffects.values()) {
    m.subject = fix(m.subject);
    m.owner = fix(m.owner);
  }
}

// GameEffects-format XML: <GameEffects><Modifier id collection effect>...</Modifier></GameEffects>
function applyGameEffects(root, file, gameEffects, problems, geRequirements, geSets) {
  const ge = firstChild(root, "GameEffects");
  for (const node of ge.children) {
    if (node.name === "Requirement" && node.attrs.id) {
      geRequirements.set(node.attrs.id, readReqs({ children: [node] })[0]);
      continue;
    }
    if (node.name === "RequirementSet" && node.attrs.id) {
      geSets.set(node.attrs.id, { type: node.attrs.type || null, requirements: readReqs(node), file });
      continue;
    }
    if (node.name !== "Modifier") {
      problems.push({ file, what: `GameEffects element <${node.name}> not read` });
      continue;
    }
    const id = node.attrs.id;
    if (!id) continue;
    gameEffects.set(id, {
      id,
      modifierType: null,
      effect: node.attrs.effect || null,
      collection: node.attrs.collection || null,
      args: childrenNamed(node, "Argument").map((a) => ({ name: a.attrs.name, value: a.text.trim() })),
      subject: readReqs(firstChild(node, "SubjectRequirements")),
      owner: readReqs(firstChild(node, "OwnerRequirements")),
      file
    });
  }
}

function applySql(db, source, file, problems) {
  for (const stmt of splitSql(source)) {
    try {
      db.exec(stmt);
    } catch (e) {
      problems.push({ file, what: `SQL: ${e.message} (${stmt.slice(0, 80).replace(/\s+/g, " ")}...)` });
    }
  }
}

function readText(root, texts, locale) {
  const en = (lang) => !lang || /^en[_-]us$/i.test(lang);
  for (const top of root.children) {
    for (const table of top.children) {
      for (const row of table.children) {
        if (row.name !== "Row" && row.name !== "Replace") continue;
        const v = rowValues(row);
        const tag = v.Tag;
        if (!tag) continue;
        const lang = table.name === "EnglishText" ? "en_US" : v.Language || locale || null;
        if (!en(lang)) continue;
        if (v.Text !== undefined) texts.set(tag, String(v.Text));
      }
    }
  }
}

// Returns { modId, game, shell, gameEffects, texts, problems, files } or { error } when the modinfo can't be read.
export function loadMod(dir, { gameplaySchema, frontendSchema }) {
  const problems = [];
  if (!existsSync(dir)) return { error: `folder missing: ${dir}` };
  // A mod folder holds one .modinfo at its root.
  const infoName = readdirSync(dir).find((f) => f.toLowerCase().endsWith(".modinfo"));
  if (!infoName) return { error: `no .modinfo in ${dir}` };
  const info = parseXml(readFileSync(join(dir, infoName), "utf8"));
  const mod = findAll(info, "Mod")[0];
  const modId = mod ? mod.attrs.id : null;
  const game = scratchDb(gameplaySchema);
  const shell = scratchDb(frontendSchema);
  const gameEffects = new Map();
  const geRequirements = new Map();
  const geSets = new Map();
  const texts = new Map();
  const files = { game: [], shell: [], text: [] };
  for (const group of findAll(info, "ActionGroup")) {
    const scope = group.attrs.scope;
    for (const actions of childrenNamed(group, "Actions")) {
      for (const action of actions.children) {
        for (const item of childrenNamed(action, "Item")) {
          const rel = item.text.trim();
          if (!rel) continue;
          if (action.name === "UpdateDatabase") (scope === "shell" ? files.shell : files.game).push(rel);
          if (action.name === "UpdateText") files.text.push({ rel, locale: item.attrs.locale || null });
        }
      }
    }
  }
  const seen = new Set();
  const load = (rel, db) => {
    const key = `${db === game ? "g" : "s"}:${rel}`;
    if (seen.has(key)) return;
    seen.add(key);
    const path = join(dir, rel);
    if (!existsSync(path)) {
      problems.push({ file: rel, what: "listed in the modinfo but not in the folder" });
      return;
    }
    const source = readFileSync(path, "utf8");
    if (/\.sql$/i.test(rel)) return applySql(db, source, rel, problems);
    if (/\.xml$/i.test(rel)) {
      const root = parseXml(source);
      if (firstChild(root, "GameEffects")) return applyGameEffects(root, rel, gameEffects, problems, geRequirements, geSets);
      return applyDatabaseXml(db, root, rel, problems);
    }
    problems.push({ file: rel, what: "not .sql or .xml; skipped" });
  };
  for (const rel of files.game) load(rel, game);
  for (const rel of files.shell) load(rel, shell);
  resolveXrefs(gameEffects, geRequirements);
  // GameEffects requirement sets go into the scratch DB's own tables, so REQUIREMENT_REQUIREMENTSET_IS_MET
  // arguments resolve the same way as SQL-defined sets.
  for (const [setId, set] of geSets) {
    try {
      game.prepare("INSERT OR IGNORE INTO RequirementSets (RequirementSetId, RequirementSetType) VALUES (?, ?)").run(setId, set.type || "REQUIREMENTSET_TEST_ALL");
      set.requirements.forEach((r0, n) => {
        const r = r0.xref ? { ...(geRequirements.get(r0.xref) || { type: `UNRESOLVED:${r0.xref}`, args: [] }), inverse: r0.inverse } : r0;
        const reqId = r0.xref || r.id || `${setId}__${n}`;
        game.prepare("INSERT OR IGNORE INTO Requirements (RequirementId, RequirementType, Inverse) VALUES (?, ?, ?)").run(reqId, r.type, r.inverse ? 1 : 0);
        game.prepare("INSERT OR IGNORE INTO RequirementSetRequirements (RequirementSetId, RequirementId) VALUES (?, ?)").run(setId, reqId);
        for (const a of r.args || []) {
          game.prepare("INSERT OR IGNORE INTO RequirementArguments (RequirementId, Name, Value) VALUES (?, ?, ?)").run(reqId, a.name, a.value);
        }
      });
    } catch (e) {
      problems.push({ file: set.file, what: `RequirementSet ${setId}: ${e.message}` });
    }
  }
  for (const { rel, locale } of files.text) {
    const path = join(dir, rel);
    if (!existsSync(path) || !/\.xml$/i.test(rel)) continue;
    readText(parseXml(readFileSync(path, "utf8")), texts, locale);
  }
  return { modId, game, shell, gameEffects, texts, problems, files };
}
