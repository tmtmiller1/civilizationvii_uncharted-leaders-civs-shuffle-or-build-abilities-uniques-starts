// "Who got what" inside the game's own leader screen: the diplomacy leader panel that opens from a leader's ribbon in
// the top right (base-standard/ui/diplomacy-actions/panel-diplomacy-actions.js). Its populatePlayerCivInfo() rebuilds
// #panel-diplomacy-actions__info-container with a Leader abilities header and the ability item (portrait, name and
// the description our config rows hold); this file adds one section right after that item, with the lines
// lshuf-reveal-lines.js builds: where each bonus came from, the attributes and their origins, the start terrain's
// origin, and the shuffle number on the local player's leader. With "Show what everyone got: As you meet them" a
// leader the local player hasn't met gets no section.
//
// Hook: a decorator on panel-diplomacy-actions (Controls.decorate, the way lshuf-city-details-names.js wraps a model
// and Cultural Diffusion decorates panel-city-details) that watches the panel's root with a throttled
// MutationObserver, since the panel rebuilds the container every time the shown player changes.
import DiplomacyManager from "/base-standard/ui/diplomacy/diplomacy-manager.js";
import { REVEAL } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";
import { guarded } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/display/lshuf-display-util.js";
import { revealLines } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/game/lshuf-reveal-lines.js";

const LOG = "[lshuf-reveal]";
// The panel comes as two elements, the player's own and another player's (both extend panel-diplomacy-actions, which
// is never an element of its own; watched 2026-11-07).
const PANEL_TAGS = ["panel-player-diplomacy-actions", "panel-other-player-diplomacy-actions"];
const CONTAINER_ID = "panel-diplomacy-actions__info-container";
const ABILITIES_TITLE = "LOC_DIPLOMACY_ACTIONS_LEADER_ABILITIES_TITLE";
const SECTION_CLASS = "lshuf-diplo";
const STYLE_ID = "lshuf-diplo-style";
const THROTTLE_MS = 100;
const CSS = ` .${SECTION_CLASS}__body { margin-left: 0.25rem; }`
  + ` .${SECTION_CLASS}__line { margin-top: 0.3rem; }`
  + ` .${SECTION_CLASS}__from { opacity: 0.75; font-style: italic; margin-left: 0.4rem; display: inline; }`;

// Set by lshuf-game.js once the deal is read: () => the content (see revealContent there), or null without a deal.
let contentSource = null;
export const setRevealSource = (fn) => {
  contentSource = fn;
};

export const isMetMode = (reveal) => reveal === REVEAL.Met;

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

const stylize = (text) => guarded("stylize", () => Locale.stylize(text), String(text));

function leaderName(leaderType) {
  return guarded("leader name", () => {
    const row = GameInfo.Leaders.lookup(leaderType);
    return row ? Locale.compose(row.Name) : leaderType;
  }, leaderType);
}

function lookupsOf(content) {
  return {
    compose: (key, ...args) => Locale.compose(key, ...args),
    abilityOf: content.abilityOf,
    leaderName,
    whyOf: content.whyOf,
    attributeName: (traitType) => {
      const attribute = content.attributeOf.get(traitType);
      const info = attribute ? guarded("attribute", () => GameInfo.Attributes.lookup(attribute), null) : null;
      return info && info.Name ? Locale.compose(info.Name) : null;
    }
  };
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

// The section, styled like the panel's own sub-sections (the Agenda and Mementos headers).
// The game's own bullets of the ability text get their origin at the end, " (from Amina)", one per bullet line in
// order; a bullet of the leader's own is left as it is. The bullet is a GameFace inline paragraph: an element added
// to it gets no size and rewriting its markup doubles its icons (watched 2026-11-07), so the origin goes in as plain
// text. Returns how many bullets were marked.
function markBullets(item, lines) {
  const bullets = lines.filter((line) => line.kind === "bullet");
  const paras = [...item.querySelectorAll(".list-begin > p")];
  if (!bullets.length || paras.length < bullets.length) return 0;
  bullets.forEach((line, i) => {
    if (line.own) return;
    const text = String(guarded("origin text", () => Locale.compose(line.from), line.from) || "").replace(/\[.*?\]/g, "");
    paras[i].appendChild(document.createTextNode(` (${text.trim()})`));
  });
  return bullets.length;
}

function renderSection(lines) {
  const section = el("div", `${SECTION_CLASS} flex flex-col w-full`);
  const header = el("fxs-header", "uppercase mt-8 mb-2 text-secondary font-title text-base");
  header.setAttribute("title", "LOC_LSHUF_REVEAL_TITLE");
  header.setAttribute("filigree-style", "h4");
  section.appendChild(header);
  const body = el("div", `${SECTION_CLASS}__body font-body text-sm pointer-events-auto`);
  for (const line of lines) body.appendChild(el("div", `${SECTION_CLASS}__line`, stylize(line.text)));
  section.appendChild(body);
  return section;
}

// The leader the panel shows (DiplomacyManager.selectedPlayerID), as a LeaderType, with whether it's the local player.
function shownLeader() {
  const playerId = DiplomacyManager.selectedPlayerID;
  const player = Players.get(playerId);
  if (!player || !player.isMajor) return null;
  const row = GameInfo.Leaders.lookup(player.leaderType);
  return row ? { leaderType: row.LeaderType, isLocal: playerId === GameContext.localPlayerID } : null;
}

// The ability item: the element right after the Leader abilities header in the info container.
function abilityItem(container) {
  const children = container.children || [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.tagName && child.tagName.toLowerCase() === "fxs-header" && child.getAttribute("title") === ABILITIES_TITLE) {
      return child.nextElementSibling;
    }
  }
  return null;
}

function sweep(root) {
  const container = root.querySelector(`#${CONTAINER_ID}`);
  if (!container || container.querySelector(`.${SECTION_CLASS}`)) return;
  const item = abilityItem(container);
  const content = contentSource ? contentSource() : null;
  if (!item || !content) return;
  const shown = shownLeader();
  if (!shown || !content.shown(shown.leaderType)) return;
  const lines = revealLines(shown.leaderType, content.deal, lookupsOf(content),
    { seed: content.seed, isLocal: shown.isLocal });
  if (!lines.length) return;
  injectStyle();
  // The bullets' origins go onto the game's own bullets; what's left (attributes, start terrain, behavior, the
  // deal number) gets its own section. A bullet that couldn't be placed stays a line here.
  const marked = markBullets(item, lines);
  const rest = marked ? lines.filter((line) => line.kind !== "bullet") : lines.map((line) => (line.kind === "bullet"
    ? { kind: "line", text: `${line.text} ${line.from}` } : line));
  if (rest.length) container.insertBefore(renderSection(rest), item.nextSibling);
  else container.insertBefore(el("div", SECTION_CLASS), item.nextSibling);
}

class LShufDiplomacyDecorator {
  constructor(panel) {
    this.panel = panel;
    this.pending = null;
    this.observer = null;
  }

  beforeAttach() {}

  afterAttach() {
    const root = this.panel && this.panel.Root;
    if (!root) return;
    const run = () => {
      this.pending = null;
      guarded("diplomacy section", () => sweep(root));
    };
    guarded("diplomacy observer", () => {
      this.observer = new MutationObserver(() => {
        if (!this.pending) this.pending = setTimeout(run, THROTTLE_MS);
      });
      this.observer.observe(root, { childList: true, subtree: true });
    });
    run();
  }

  beforeDetach() {
    if (this.observer) this.observer.disconnect();
    if (this.pending) clearTimeout(this.pending);
    this.observer = null;
    this.pending = null;
  }

  afterDetach() {}
}

/** Adds the section to the diplomacy leader panel. Call at load, before the panel first attaches. */
export function installRevealSection() {
  if (typeof Controls === "undefined" || typeof Controls.decorate !== "function") {
    console.warn(`${LOG} Controls.decorate unavailable; no section in the diplomacy panel`);
    return false;
  }
  for (const tag of PANEL_TAGS) {
    guarded(`diplomacy decorator ${tag}`, () => Controls.decorate(tag, (panel) => new LShufDiplomacyDecorator(panel)));
  }
  return true;
}
