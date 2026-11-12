// Builds the .modinfo from modinfo.template.xml, workstream B's generated fragments and the shipped file tree.
//
//   node scripts/build-modinfo.mjs           write the .modinfo
//   node scripts/build-modinfo.mjs --check   exit 1 if the .modinfo is stale or names a file that doesn't exist
//
// Owned by the lead.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MOD_ID = "uncharted-leaders-and-civs";
const OUT = path.join(root, `${MOD_ID}.modinfo`);
const IMPORT_ROOTS = ["ui", "shared", "base-standard"];
const IMPORT_EXT = /\.(js|css|html|png)$/;

function readFragment(rel) {
  const file = path.join(root, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim() : `<!-- ${rel} not generated yet -->`;
}

function shippedFiles() {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (IMPORT_EXT.test(entry.name)) out.push(rel);
    }
  };
  IMPORT_ROOTS.filter((d) => fs.existsSync(path.join(root, d))).forEach(walk);
  return out.sort();
}

// text/agenda/<locale>.xml, one UpdateText item each (scripts/setup-copy/build-agenda-text.mjs); en_US is the base
// file every locale loads, the others load for their own locale only.
function agendaTextItems() {
  const dir = path.join(root, "text", "agenda");
  if (!fs.existsSync(dir)) return "<!-- text/agenda not generated yet -->";
  return fs.readdirSync(dir).filter((f) => f.endsWith(".xml")).sort().map((f) => {
    const locale = f.replace(/\.xml$/, "");
    return locale === "en_US" ? `<Item>text/agenda/${f}</Item>` : `<Item locale="${locale}">text/agenda/${f}</Item>`;
  }).join("\n");
}

function indentLike(marker, text, template) {
  const line = template.split("\n").find((l) => l.includes(marker)) || "";
  const pad = line.slice(0, line.indexOf("<!--"));
  return text
    .split("\n")
    .map((l, i) => (i === 0 ? l : pad + l))
    .join("\n");
}

export function buildModinfo() {
  const template = fs.readFileSync(path.join(root, "modinfo.template.xml"), "utf8");
  const imports = shippedFiles().map((f) => `<Item>${f}</Item>`).join("\n");
  const fill = (text, marker, value) => text.split(`<!-- ${marker} -->`).join(indentLike(marker, value, template));
  let out = template.replace(/<!-- Template for[\s\S]*?-->\n/, "");
  out = fill(out, "@GENERATED_CRITERIA", readFragment("data/generated/modinfo-criteria.xml"));
  out = fill(out, "@GENERATED_GROUPS", readFragment("data/generated/modinfo-groups.xml"));
  out = fill(out, "@IMPORT_FILES", imports);
  out = fill(out, "@AGENDA_TEXT", agendaTextItems());
  return out;
}

export function missingItems(modinfo) {
  const items = [...modinfo.matchAll(/<(?:Item|File)>([^<]+)<\/(?:Item|File)>/g)].map((m) => m[1]);
  return [...new Set(items)].filter((rel) => !fs.existsSync(path.join(root, rel)));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const built = buildModinfo();
  const missing = missingItems(built);
  if (process.argv.includes("--check")) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
    const stale = current !== built;
    if (stale) console.log("modinfo is stale: run npm run build:modinfo");
    if (missing.length) console.log(`modinfo names missing files:\n  ${missing.join("\n  ")}`);
    process.exit(stale || missing.length ? 1 : 0);
  }
  fs.writeFileSync(OUT, built);
  console.log(`wrote ${path.basename(OUT)}${missing.length ? `; missing files:\n  ${missing.join("\n  ")}` : ""}`);
}
