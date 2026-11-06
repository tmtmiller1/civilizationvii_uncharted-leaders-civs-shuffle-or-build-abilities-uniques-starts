// The live check on a listed modded leader's mod (SPEC section 3, "Modded leaders", check 1): its mod loads nothing
// that runs code, apart from portrait registration. Reads the mod's own modinfo and UIScripts files from the setup
// screen with XMLHttpRequest on fs://game/<modId>/<file> (probe 12; fetch isn't defined in the game's UI).
//
// checkModinfoText and isPortraitOnlyScript are pure, for the tests. checkModdedLeader touches the engine.

import { MODDED_LEADERS } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-known-leaders.js";

// Text codes for a failing check (LShufModWhy_<LEADER>, LOC_LSHUF_WHY_*).
export const WHY = { Script: "script", UIScript: "uiscript", ImportJs: "importjs", Missing: "missing" };

// Actions that only load data, text, icons, art and sound.
const DATA_ACTIONS = new Set([
  "UpdateDatabase",
  "UpdateText",
  "UpdateIcons",
  "UpdateColors",
  "UpdateArt",
  "UpdateAudio",
  "UIAudioRules",
  "UpdateVisualRemaps"
]);

const stripXmlComments = (xml) => String(xml).replace(/<!--[\s\S]*?-->/g, "");

// Each action element inside every <Actions> block: [{ name, items: [path] }].
export function modinfoActions(xml) {
  const out = [];
  const text = stripXmlComments(xml);
  for (const block of text.matchAll(/<Actions\b[^>]*>([\s\S]*?)<\/Actions>/g)) {
    const body = block[1];
    for (const m of body.matchAll(/<([A-Za-z][\w.-]*)\b[^>]*?(\/>|>([\s\S]*?)<\/\1\s*>)/g)) {
      const items = [];
      for (const it of (m[3] || "").matchAll(/<Item\b[^>]*>([^<]*)<\/Item>/g)) {
        const path = it[1].trim();
        if (path) items.push(path);
      }
      out.push({ name: m[1], items });
    }
  }
  return out;
}

// Copy of the source with comments removed and every string literal replaced by a marker, so what's left is code.
function codeShape(text) {
  const src = String(text).replace(/^\uFEFF/, "");
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "/" && next === "/") {
      while (i < src.length && src[i] !== "\n") i++;
    } else if (c === "/" && next === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end < 0 ? src.length : end + 2;
    } else if (c === "\"" || c === "'") {
      i = skipString(src, i, c);
      out += " S ";
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

function skipString(src, start, quote) {
  let i = start + 1;
  while (i < src.length && src[i] !== quote) {
    if (src[i] === "\\") i++;
    if (src[i] === "\n") return src.length;
    i++;
  }
  return i + 1;
}

// An argument is a string, or an object of string values ({ imagePath: "...", diplomacyBackground: "..." }).
const PROP = String.raw`(?:[A-Za-z_$][\w$]*|S)\s*:\s*S`;
const ARG = String.raw`(?:S|\{\s*${PROP}\s*(?:,\s*${PROP}\s*)*,?\s*\})`;
const PORTRAIT_CALL = new RegExp(
  String.raw`(?:(?:window|globalThis)\s*\.\s*)?CustomLeaderConfig\s*\.\s*registerImageLeader\s*\(\s*` +
    String.raw`${ARG}\s*(?:,\s*${ARG}\s*)*\)\s*;?`,
  "g"
);

// The one wrapper these mods put round a second copy of the calls, with the calls taken out and spaces removed:
// if (typeof engine !== "undefined" && engine.whenReady) { engine.whenReady.then(() => { ... }); }
const READY_WRAPPER = /if\(typeofengine(?:!==|!=)S&&engine\.whenReady\)\{engine\.whenReady\.then\(\(\)=>\{\}\);?\}/g;

// True when a UI script holds nothing but CustomLeaderConfig.registerImageLeader("...", "...") calls with string
// arguments (comments and blank space allowed), optionally repeated inside the engine.whenReady wrapper above.
// Template literals, other guards and any other code fail.
export function isPortraitOnlyScript(text) {
  if (typeof text !== "string") return false;
  if (text.includes("`")) return false;
  const shape = codeShape(text);
  if (!/registerImageLeader/.test(shape)) return false;
  const rest = shape.replace(PORTRAIT_CALL, "").replace(/\s+/g, "");
  return rest.replace(READY_WRAPPER, "") === "";
}

const isScriptPath = (p) => /\.(m?js)$/i.test(p.split("?")[0]);

// The check on a modinfo's text. readFile(path) -> Promise<string|null>, path relative to the mod's folder.
// -> Promise<{ ok, why }>, why one of WHY or null.
export async function checkModinfoText(xml, readFile) {
  if (typeof xml !== "string" || !/<Mod\b/.test(xml)) return { ok: false, why: WHY.Missing };
  const actions = modinfoActions(xml);
  const uiScripts = [];
  for (const a of actions) {
    if (DATA_ACTIONS.has(a.name)) continue;
    if (a.name === "ImportFiles") {
      if (a.items.some(isScriptPath)) return { ok: false, why: WHY.ImportJs };
    } else if (a.name === "UIScripts") {
      uiScripts.push(...a.items);
    } else {
      return { ok: false, why: WHY.Script };
    }
  }
  for (const path of uiScripts) {
    const text = await readFile(path);
    if (typeof text !== "string") return { ok: false, why: WHY.Missing };
    if (!isPortraitOnlyScript(text)) return { ok: false, why: WHY.UIScript };
  }
  return { ok: true, why: null };
}

// --- engine side ---

const READ_TIMEOUT_MS = 4000;

function readGameFile(url) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => {
      if (!done) {
        done = true;
        resolve(v);
      }
    };
    try {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => finish(xhr.status === 200 || (xhr.status === 0 && xhr.responseText) ? xhr.responseText : null);
      xhr.onerror = () => finish(null);
      xhr.open("GET", url, true);
      xhr.send();
      setTimeout(() => finish(null), READ_TIMEOUT_MS);
    } catch (_) {
      finish(null);
    }
  });
}

// The installed, enabled mod with this id, or null.
export function findEnabledMod(modId) {
  try {
    const mods = Modding.getInstalledMods() || [];
    return mods.find((m) => m && m.id === modId && m.enabled) || null;
  } catch (_) {
    return null;
  }
}

const modFileUrl = (modId, path) => `fs://game/${modId}/${String(path).replace(/^\/+/, "")}`;

// entry: one MODDED_LEADERS entry. -> Promise<{ ok, why }>.
export async function checkModdedLeader(entry) {
  const mod = entry ? findEnabledMod(entry.modId) : null;
  if (!mod || !mod.sourceFileName) return { ok: false, why: WHY.Missing };
  const xml = await readGameFile(modFileUrl(entry.modId, mod.sourceFileName));
  if (typeof xml !== "string") return { ok: false, why: WHY.Missing };
  return checkModinfoText(xml, (path) => readGameFile(modFileUrl(entry.modId, path)));
}

// Results kept for the synchronous startCampaign handler and readDealConfigFromSetup: leaderType -> { ok, why }.
const results = new Map();
let running = null;

// Run the check on every listed leader whose mod is installed and enabled. Leaders whose mod is missing get
// { ok: false, why: "missing" } straight away. Calling it again re-reads the files.
export function startModdedChecks() {
  if (running) return running;
  const jobs = MODDED_LEADERS.map(async (entry) => {
    let r;
    try {
      r = await checkModdedLeader(entry);
    } catch (_) {
      r = { ok: false, why: WHY.Missing };
    }
    results.set(entry.leaderType, r);
  });
  running = Promise.all(jobs).finally(() => {
    running = null;
  });
  return running;
}

// The last result for a listed leader; a check that hasn't finished counts as missing.
export function moddedCheckResult(leaderType) {
  return results.get(leaderType) || { ok: false, why: WHY.Missing };
}

export const moddedChecksPending = () => running !== null;
