// Writes the store and site descriptions from one source, so they say the same thing:
//
//   node scripts/build-descriptions.mjs           write them
//   node scripts/build-descriptions.mjs --check   exit 1 when one differs from what the source gives
//
// The source is docs/steam-workshop-description.txt (Steam BBCode, under Steam's 8000-character limit). From it:
// docs/civfanatics-description.txt (XenForo BBCode), docs/moddb-description.txt (plain text) and
// docs/github-release.md (the GitHub release body, Markdown; its title is docs/github-release-title.txt).
// docs/civfanatics-tagline.txt and docs/moddb-description-short.txt are written by hand and kept in step with the
// source. --check also holds each text to its platform's limit: Steam's description 8000 (the Steamworks
// k_cchPublishedDocumentDescriptionMax, counted here in bytes), the CivFanatics tag line 100 (XenForo Resource
// Manager), the ModDB summary 1000 (what the earlier mods' summaries kept under). Steam text keeps straight double
// quotes out, since steamcmd's VDF can't carry them.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const doc = (name) => path.join(ROOT, "docs", name);
const SOURCE = doc("steam-workshop-description.txt");
const STEAM_LIMIT = 8000;
const LIMITS = { "civfanatics-tagline.txt": 100, "moddb-description-short.txt": 1000 };

// The release body opens with the preview image at the release's tag, as the other Tower mods' releases do.
const TAG = "v1.0.0";
const REPO = "tmtmiller1/civilizationvii_uncharted-leaders-civs-shuffle-or-build-abilities-uniques-starts";
const GITHUB_HEAD = `<p align="center"><img src="https://raw.githubusercontent.com/${REPO}/${TAG}/docs/workshop-preview.png" `
  + `alt="Uncharted Leaders & Civs" width="200"></p>\n\nThis is the mod's first release.\n\n`;

function civfanatics(text) {
  return text
    .replace(/\[h1\](.*?)\[\/h1\]/g, "[SIZE=6][B]$1[/B][/SIZE]")
    .replace(/\[h2\](.*?)\[\/h2\]/g, "[SIZE=5][B]$1[/B][/SIZE]")
    .replace(/\[list\]/g, "[LIST]").replace(/\[\/list\]/g, "[/LIST]")
    .replace(/\[b\]/g, "[B]").replace(/\[\/b\]/g, "[/B]");
}

function plain(text) {
  return text
    .replace(/\[h1\](.*?)\[\/h1\]/g, "$1")
    .replace(/\[h2\](.*?)\[\/h2\]/g, "$1")
    .replace(/\[list\]\n?/g, "").replace(/\[\/list\]\n?/g, "")
    .replace(/\[\*\]/g, "- ")
    .replace(/\[\/?b\]/g, "");
}

function github(text) {
  const body = text
    .replace(/\[h1\].*?\[\/h1\]\n+/, "")
    .replace(/\[h2\](.*?)\[\/h2\]/g, "## $1")
    // A blank line after a list, or the next line joins the list's last item.
    .replace(/\[list\]\n?/g, "").replace(/\[\/list\]\n?(?=\S)/g, "\n").replace(/\[\/list\]\n?/g, "")
    .replace(/\[\*\]/g, "- ")
    .replace(/\[b\](.*?)\[\/b\]/g, "**$1**");
  return `${GITHUB_HEAD}${body}`;
}

export function build() {
  const source = fs.readFileSync(SOURCE, "utf8");
  const bytes = Buffer.byteLength(source, "utf8");
  if (bytes > STEAM_LIMIT) throw new Error(`steam description is ${bytes} bytes, over ${STEAM_LIMIT}`);
  if (source.includes('"')) throw new Error("steam description has a straight double quote; use curly quotes");
  for (const [name, max] of Object.entries(LIMITS)) {
    const n = [...fs.readFileSync(doc(name), "utf8").trim()].length;
    if (n > max) throw new Error(`${name} is ${n} characters, over ${max}`);
  }
  return {
    "civfanatics-description.txt": civfanatics(source),
    "moddb-description.txt": plain(source),
    "github-release.md": github(source)
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = build();
  if (process.argv.includes("--check")) {
    const stale = Object.entries(out).filter(([name, text]) => !fs.existsSync(doc(name)) || fs.readFileSync(doc(name), "utf8") !== text);
    for (const [name] of stale) console.log(`${name} differs from docs/steam-workshop-description.txt`);
    process.exit(stale.length ? 1 : 0);
  }
  for (const [name, text] of Object.entries(out)) fs.writeFileSync(doc(name), text);
  console.log(`wrote ${Object.keys(out).join(", ")}`);
}
