// Lists the SQLite features the mod's SQL uses, so each can be checked against the game's own SQLite.
//
//   node tests/_sqlite-features.mjs            print the features found in data/**/*.sql
//   node tests/_sqlite-features.mjs --write    also rewrite the "Found in the SQL" table in tests/SQLITE-FEATURES.md
//
// Comments and string literals are blanked before matching, so a word inside text doesn't count.
// GAME_SQLITE is the version the game's library stamped into the Debug copies it wrote (header bytes 96-99 of
// gameplay-copy.sqlite and frontend-copy.sqlite read 3040001 on 2026-11-06); fixture-builders and tests run on
// Node's newer SQLite, so a feature newer than this passes here and could fail in the game. Owned by workstream E.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const GAME_SQLITE = "3.40.1";
export const SCAN_DIRS = ["data"];

// { id, label, since, re | test(text) }. `forbidden` marks what CONTRACTS 5.1 rules out whatever the version.
export const FEATURES = [
  { id: "window", label: "Window functions (OVER, PARTITION BY, ROW_NUMBER, RANK...)", since: "3.25.0", forbidden: true, re: /\bOVER\s*\(|\bPARTITION\s+BY\b|\b(ROW_NUMBER|DENSE_RANK|PERCENT_RANK|CUME_DIST|NTILE|LAG|LEAD|FIRST_VALUE|LAST_VALUE|NTH_VALUE)\s*\(|\bRANK\s*\(\s*\)/i },
  { id: "random", label: "random() / randomblob()", since: "3.0.0", forbidden: true, re: /\brandom(blob)?\s*\(/i },
  { id: "real", label: "Floating-point literals or REAL casts", since: "3.0.0", forbidden: true, re: /(^|[^\w.])\d+\.\d+([eE][-+]?\d+)?\b|\bCAST\s*\([^)]*\bAS\s+(REAL|FLOAT|DOUBLE)\b/i },
  { id: "cte", label: "Common table expressions (WITH ... AS)", since: "3.8.3", re: /\bWITH\s+(RECURSIVE\s+)?\w+(\s*\([^)]*\))?\s+AS\s*(NOT\s+)?(MATERIALIZED\s*)?\(/i },
  { id: "cte-recursive", label: "WITH RECURSIVE", since: "3.8.3", re: /\bWITH\s+RECURSIVE\b/i },
  { id: "cte-materialized", label: "MATERIALIZED / NOT MATERIALIZED hints", since: "3.35.0", re: /\bAS\s+(NOT\s+)?MATERIALIZED\b/i },
  { id: "upsert", label: "UPSERT (ON CONFLICT ... DO)", since: "3.24.0", re: /\bON\s+CONFLICT\b[^;]*?\bDO\b/i },
  { id: "returning", label: "RETURNING", since: "3.35.0", re: /\bRETURNING\b/i },
  {
    id: "update-from",
    label: "UPDATE ... FROM",
    since: "3.33.0",
    test: (text) => text.split(";").some((s) => /^\s*UPDATE\b/i.test(s) && /\bFROM\b/i.test(dropParens(s)))
  },
  { id: "insert-or", label: "INSERT OR IGNORE / OR REPLACE", since: "3.0.0", re: /\bINSERT\s+OR\s+(IGNORE|REPLACE)\b/i },
  { id: "replace-into", label: "REPLACE INTO", since: "3.0.0", re: /(^|;|\s)REPLACE\s+INTO\b/i },
  { id: "insert-select", label: "INSERT ... SELECT", since: "3.0.0", re: /\bINSERT\b[^;]*?\bSELECT\b/i },
  { id: "multi-values", label: "Multi-row VALUES", since: "3.7.11", re: /\bVALUES\s*\([^;]*?\)\s*,\s*\(/i },
  { id: "values-select", label: "VALUES as a table (SELECT ... FROM (VALUES ...))", since: "3.8.3", re: /\(\s*VALUES\s*\(/i },
  { id: "correlated", label: "Correlated subqueries (COUNT(*) rank)", since: "3.0.0", re: /\(\s*SELECT\s+COUNT\s*\(\s*\*\s*\)/i },
  { id: "exists", label: "EXISTS / NOT EXISTS", since: "3.0.0", re: /\bEXISTS\s*\(/i },
  { id: "compound", label: "UNION / UNION ALL / INTERSECT / EXCEPT", since: "3.0.0", re: /\b(UNION|INTERSECT|EXCEPT)\b/i },
  { id: "case", label: "CASE expressions", since: "3.0.0", re: /\bCASE\b/i },
  { id: "iif", label: "iif()", since: "3.32.0", re: /\biif\s*\(/i },
  { id: "nulls-order", label: "NULLS FIRST / NULLS LAST", since: "3.30.0", re: /\bNULLS\s+(FIRST|LAST)\b/i },
  { id: "filter", label: "Aggregate FILTER (WHERE ...)", since: "3.30.0", re: /\bFILTER\s*\(\s*WHERE\b/i },
  { id: "group-concat", label: "group_concat()", since: "3.5.4", re: /\bgroup_concat\s*\(/i },
  { id: "string-agg", label: "string_agg()", since: "3.44.0", re: /\bstring_agg\s*\(/i },
  { id: "concat-fn", label: "concat() / concat_ws()", since: "3.44.0", re: /\bconcat(_ws)?\s*\(/i },
  { id: "format", label: "format() / printf()", since: "3.8.3", re: /\b(format|printf)\s*\(/i },
  { id: "instr", label: "instr()", since: "3.7.15", re: /\binstr\s*\(/i },
  { id: "string-fns", label: "substr / replace / trim / upper / lower / length", since: "3.0.0", re: /\b(substr|substring|replace|trim|ltrim|rtrim|upper|lower|length)\s*\(/i },
  { id: "like-glob", label: "LIKE / GLOB (with ESCAPE)", since: "3.0.0", re: /\b(LIKE|GLOB)\b/i },
  { id: "cast-int", label: "CAST(... AS INTEGER)", since: "3.0.0", re: /\bCAST\s*\([^)]*\bAS\s+INTEGER\b/i },
  { id: "modulo", label: "% (modulo) and integer arithmetic", since: "3.0.0", re: /\)\s*%\s*\d|\w\s*%\s*\d/ },
  { id: "math-fns", label: "Math functions (floor, ceil, pow, sqrt, log, mod...)", since: "3.35.0 (build option SQLITE_ENABLE_MATH_FUNCTIONS)", re: /\b(floor|ceil|ceiling|pow|power|sqrt|exp|ln|log|log2|log10|mod|pi|trunc|sin|cos|tan)\s*\(/i },
  { id: "json", label: "JSON functions and -> / ->> operators", since: "3.38.0 built in (earlier: JSON1 extension)", re: /\bjson\w*\s*\(|->>?/i },
  { id: "min-max-multi", label: "Multi-argument min() / max()", since: "3.0.0", re: /\b(min|max)\s*\([^()]*,[^()]*\)/i },
  { id: "coalesce", label: "coalesce / ifnull / nullif", since: "3.0.0", re: /\b(coalesce|ifnull|nullif)\s*\(/i },
  { id: "is-distinct", label: "IS [NOT] DISTINCT FROM", since: "3.39.0", re: /\bIS\s+(NOT\s+)?DISTINCT\s+FROM\b/i },
  { id: "unixepoch", label: "unixepoch() / date functions", since: "3.38.0 (unixepoch)", re: /\b(unixepoch|julianday|strftime|datetime|date|time)\s*\(/i },
  { id: "create-temp", label: "CREATE TEMP TABLE / temp views", since: "3.0.0", re: /\bCREATE\s+TEMP(ORARY)?\b/i },
  { id: "create-index", label: "CREATE INDEX", since: "3.0.0", re: /\bCREATE\s+(UNIQUE\s+)?INDEX\b/i },
  { id: "create-trigger", label: "CREATE TRIGGER", since: "3.0.0", re: /\bCREATE\s+TRIGGER\b/i },
  { id: "create-view", label: "CREATE VIEW", since: "3.0.0", re: /\bCREATE\s+VIEW\b/i },
  { id: "drop", label: "DROP TABLE / VIEW / INDEX / TRIGGER", since: "3.0.0", re: /\bDROP\s+(TABLE|VIEW|INDEX|TRIGGER)\b/i },
  { id: "alter", label: "ALTER TABLE", since: "3.0.0 (RENAME COLUMN 3.25, DROP COLUMN 3.35)", re: /\bALTER\s+TABLE\b/i },
  { id: "strict", label: "STRICT tables", since: "3.37.0", re: /\)\s*STRICT\b/i },
  { id: "generated-col", label: "Generated columns", since: "3.31.0", re: /\bGENERATED\s+ALWAYS\b|\bAS\s*\([^)]*\)\s*(STORED|VIRTUAL)\b/i },
  { id: "without-rowid", label: "WITHOUT ROWID", since: "3.8.2", re: /\bWITHOUT\s+ROWID\b/i },
  { id: "pragma", label: "PRAGMA", since: "3.0.0", re: /\bPRAGMA\b/i },
  { id: "transaction", label: "BEGIN / COMMIT / SAVEPOINT inside a file", since: "3.0.0", re: /\b(BEGIN|COMMIT|SAVEPOINT|ROLLBACK)\b\s*(TRANSACTION)?\s*;/i },
  { id: "limit", label: "LIMIT / OFFSET", since: "3.0.0", re: /\bLIMIT\b/i }
];

// Text with every parenthesized part removed, innermost first.
function dropParens(text) {
  let out = text;
  for (let prev = ""; prev !== out; ) {
    prev = out;
    out = out.replace(/\([^()]*\)/g, " ");
  }
  return out;
}

// Blank out comments and string literals, keeping line breaks so positions stay comparable.
export function stripSql(sql) {
  return sql
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/'(?:[^']|'')*'/g, "''");
}

export function sqlFiles(dirs = SCAN_DIRS) {
  const out = [];
  const walk = (rel) => {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) return;
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      const r = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(r);
      else if (e.name.endsWith(".sql")) out.push(r);
    }
  };
  dirs.forEach(walk);
  return out.sort();
}

// { featureId: [files] } for each feature found.
export function scan(files = sqlFiles()) {
  const found = {};
  for (const rel of files) {
    const text = stripSql(fs.readFileSync(path.join(root, rel), "utf8"));
    for (const f of FEATURES) {
      if (f.test ? f.test(text) : f.re.test(text)) (found[f.id] = found[f.id] || []).push(rel);
    }
  }
  return found;
}

const versionNum = (v) => {
  const m = String(v).match(/^(\d+)\.(\d+)\.(\d+)/);
  return m ? Number(m[1]) * 1e6 + Number(m[2]) * 1e3 + Number(m[3]) : 0;
};
export const newerThanGame = (f) => versionNum(f.since) > versionNum(GAME_SQLITE);

const BEGIN = "<!-- @FOUND-BEGIN -->";
const END = "<!-- @FOUND-END -->";

export function foundTable(found = scan()) {
  const lines = ["| Feature | Since | Files |", "| --- | --- | --- |"];
  for (const f of FEATURES.filter((x) => found[x.id])) {
    const files = found[f.id];
    const list = files.length > 3 ? `${files.slice(0, 3).map((x) => `\`${x}\``).join(", ")} and ${files.length - 3} more` : files.map((x) => `\`${x}\``).join(", ");
    lines.push(`| ${f.label} | ${f.since} | ${list} |`);
  }
  if (lines.length === 2) lines.push("| (no SQL files found under data/) | | |");
  return lines.join("\n");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const found = scan();
  const table = foundTable(found);
  console.log(`${sqlFiles().length} SQL files\n${table}`);
  if (process.argv.includes("--write")) {
    const doc = path.join(root, "tests", "SQLITE-FEATURES.md");
    const text = fs.readFileSync(doc, "utf8");
    const start = text.indexOf(BEGIN);
    const end = text.indexOf(END);
    if (start < 0 || end < 0) throw new Error("SQLITE-FEATURES.md has no @FOUND markers");
    fs.writeFileSync(doc, `${text.slice(0, start + BEGIN.length)}\n${table}\n${text.slice(end)}`);
    console.log("updated tests/SQLITE-FEATURES.md");
  }
}
