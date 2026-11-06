// The reveal panel: what each leader in this game got, the deal number, and why any listed modded leader was left
// out. Opened from a button on the sub-system dock (the way Economics and Emigration add theirs), and on the first
// turn of a new game when the game's deal came out different from the setup screen's, or a part fell back to as
// shipped. With "Show what everyone got: As you meet them" a leader the local player hasn't met shows as unmet.
import Panel from "/core/ui/panel-support.js";
import ContextManager from "/core/ui/context-manager/context-manager.js";
import { REVEAL, REASON } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";
import { isModdedLeader } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-known-leaders.js";
import { guarded, reasonKey, whyKey } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/display/lshuf-display-util.js";

const TAG = "lshuf-reveal-panel";
const DOCK_CLASS = "lshuf-reveal";
const STYLE_ID = "lshuf-reveal-style";
// The game's own unknown-leader portrait, so the button needs no art of its own.
const DOCK_ICON = "fs://game/base-standard/leader_portrait_unknown.png";
const CSS = `.ssb__button-icon.${DOCK_CLASS} { background-image: url("${DOCK_ICON}"); background-size: contain; }`
  + ` .${TAG} { display: flex; align-items: center; justify-content: center; }`
  + " .lshuf-reveal__frame { width: 60rem; max-width: 90%; height: 46rem; max-height: 90%; }"
  + " .lshuf-reveal__note { margin-bottom: 0.4rem; }"
  + " .lshuf-reveal__leader { margin-top: 0.9rem; padding-bottom: 0.6rem; }"
  + " .lshuf-reveal__name { font-weight: bold; }"
  + " .lshuf-reveal__ability { margin-top: 0.2rem; color: #e5d2ac; }";

// Set by lshuf-game.js once the deal is read: () => the panel's content, or null when there's no deal.
let contentSource = null;
let dockCondition = () => true;
export const setRevealSource = (fn) => {
  contentSource = fn;
};

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

const stylize = (key, ...args) => guarded("stylize", () => Locale.stylize(key, ...args), String(key));

function leaderName(leaderType) {
  return guarded("leader name", () => {
    const row = GameInfo.Leaders.lookup(leaderType);
    return row ? Locale.compose(row.Name) : leaderType;
  }, leaderType);
}

function attributeNames(leaderType, content) {
  const names = [];
  for (const row of content.deal.attributes || []) {
    if (row.LeaderType !== leaderType) continue;
    const attribute = content.attributeOf.get(row.TraitType);
    const info = attribute ? guarded("attribute", () => GameInfo.Attributes.lookup(attribute), null) : null;
    if (info && info.Name) names.push(Locale.compose(info.Name));
  }
  return names;
}

// "Leader: reason" lines for each leader the deal left out: every one in this game, and the listed modded leaders
// wherever they are. With the mode on Not re-dealt every leader has that reason, so one line says it instead.
// inGame: Set of the leader types in this game.
export function leftOutLines(leaders, whyOf, inGame) {
  const lines = [];
  const rows = (leaders || []).filter((row) => row.Reason
    && ((inGame && inGame.has(row.LeaderType)) || isModdedLeader(row.LeaderType)));
  if (rows.some((row) => row.Reason === REASON.ModeNone)) {
    return [{ leaderType: null, reasonKey: reasonKey(REASON.ModeNone) }];
  }
  for (const row of rows) {
    const why = row.Reason === REASON.ModdedNotOK ? whyOf(row.LeaderType) : null;
    lines.push({ leaderType: row.LeaderType, reasonKey: why ? whyKey(why) : reasonKey(row.Reason) });
  }
  return lines;
}

function notes(content) {
  const out = [];
  if (content.seed != null) out.push(stylize("LOC_LSHUF_DEAL_NUMBER", String(content.seed)));
  if (content.mode) out.push(stylize(`LOC_${content.mode}`));
  if (content.tooFew.length) out.push(stylize("LOC_LSHUF_REVEAL_TOO_FEW"));
  if (content.differs.length) out.push(stylize("LOC_LSHUF_REVEAL_DIFFERS"));
  const inGame = new Set(content.players().map((p) => p.leaderType).filter(Boolean));
  for (const line of leftOutLines(content.deal.leaders, content.whyOf, inGame)) {
    if (!line.leaderType) out.push(stylize(line.reasonKey));
    else out.push(stylize("LOC_LSHUF_REVEAL_LEFT_OUT", leaderName(line.leaderType), Locale.compose(line.reasonKey)));
  }
  return out;
}

function leaderBlock(entry, content) {
  const block = el("div", "lshuf-reveal__leader");
  if (!entry.shown) {
    block.appendChild(el("div", "lshuf-reveal__name", stylize("LOC_LSHUF_REVEAL_UNMET")));
    return block;
  }
  block.appendChild(el("div", "lshuf-reveal__name", Locale.stylize(leaderName(entry.leaderType))));
  const view = content.viewOf(entry.leaderType);
  if (view) {
    block.appendChild(el("div", "lshuf-reveal__ability", stylize(view.name)));
    block.appendChild(el("div", "", Locale.stylize(view.description)));
  }
  const attributes = attributeNames(entry.leaderType, content);
  if (attributes.length) block.appendChild(el("div", "", Locale.stylize(attributes.join(" · "))));
  return block;
}

class LShufRevealPanel extends Panel {
  onAttach() {
    super.onAttach();
    guarded("reveal panel", () => this.render());
    this.onInput = (event) => {
      const name = event.detail && event.detail.name;
      if (event.detail && event.detail.status !== InputActionStatuses.FINISH) return;
      if (name !== "cancel" && name !== "keyboard-escape") return;
      this.close();
      event.stopPropagation();
      event.preventDefault();
    };
    this.Root.addEventListener("engine-input", this.onInput);
  }

  onDetach() {
    if (this.onInput) this.Root.removeEventListener("engine-input", this.onInput);
    super.onDetach();
  }

  render() {
    const content = contentSource ? contentSource() : null;
    const frame = el("fxs-frame", "lshuf-reveal__frame");
    const header = el("fxs-header", "font-title text-xl uppercase");
    header.setAttribute("title", "LOC_LSHUF_REVEAL_TITLE");
    header.setAttribute("filigree-style", "h3");
    frame.appendChild(header);
    const close = el("fxs-close-button", "top-1 right-1");
    close.addEventListener("action-activate", () => this.close());
    frame.appendChild(close);
    const scroll = el("fxs-scrollable", "flex-auto");
    const body = el("div", "font-body text-base px-6");
    if (content) {
      for (const line of notes(content)) body.appendChild(el("div", "lshuf-reveal__note", line));
      for (const entry of content.players()) body.appendChild(leaderBlock(entry, content));
    }
    scroll.appendChild(body);
    frame.appendChild(scroll);
    this.Root.appendChild(frame);
  }
}

guarded("define reveal panel", () => Controls.define(TAG, {
  createInstance: LShufRevealPanel,
  description: "Re-dealable Leaders: what everyone got",
  classNames: [TAG, "w-full", "h-full"],
  initializeImmediately: true
}));

export function openRevealPanel() {
  guarded("open reveal", () => ContextManager.push(TAG, { singleton: true, createMouseGuard: true }));
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

class LShufDockDecorator {
  constructor(panel) {
    this.panel = panel;
  }

  beforeAttach() {}

  afterAttach() {
    guarded("dock button", () => {
      injectStyle();
      if (!this.panel || typeof this.panel.addButton !== "function" || !dockCondition()) return;
      this.panel.addButton({ tooltip: "LOC_LSHUF_REVEAL_OPEN", modifierClass: DOCK_CLASS,
        callback: () => openRevealPanel(), class: ["lshuf-reveal-dock-button"], audio: "data-audio-tab-selected",
        focusedAudio: "data-audio-focus-small" });
    });
  }

  beforeDetach() {}

  afterDetach() {}
}

/**
 * Adds the dock button. Call at load, before the dock attaches; `hasDeal` decides, when the dock draws, whether this
 * game has a deal to show.
 */
export function installRevealDock(hasDeal) {
  dockCondition = hasDeal;
  guarded("dock decorator", () => Controls.decorate("panel-sub-system-dock", (panel) => new LShufDockDecorator(panel)));
}

export const isMetMode = (reveal) => reveal === REVEAL.Met;
