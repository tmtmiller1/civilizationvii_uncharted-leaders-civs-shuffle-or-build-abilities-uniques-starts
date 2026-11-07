// The AI leaders window (owner, 2026-11-06): where the AI players' leaders and civilizations are built, apart from
// the player's own screens. One row per AI player slot with its leader and civilization, a Build leader... and a
// Build civilization... button that open the build screen for that slot's builder (slots 2..BUILD_SLOTS,
// LShufBuildFor<n>), what it has picked, and Clear. Opened from "AI leaders..." in Re-dealable Leaders Settings and
// from the link on the player's own build screens.

import Panel from "/core/ui/panel-support.js";
import ContextManager from "/core/ui/context-manager/context-manager.js";
import { InputEngineEventName } from "/core/ui/input/input-support.js";
import { BUILD_SLOTS, MOD_ID } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";
import { el } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-controls.js";
import { readRevision } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-section.js";
import { setParam } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-params.js";
import {
  buildForLeader, buildForParam, isLocalHost
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-config.js";
import { compose, readPicks, writePicks } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-cards.js";
import {
  buildTargets, openBuildWindow, slotForLeader
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-window.js";
import { civBackground, leaderPortrait } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-art.js";

export const AI_WINDOW_TAG = "lshuf-ai-window";
const SYNC_MS = 500;

const log = (msg) => console.warn(`[lshuf-ai] ${msg}`);

function nameOf(sql, type) {
  try {
    const rows = Database.query("config", sql.replace("?", `'${String(type).replace(/'/g, "''")}'`)) || [];
    return rows.length ? compose(rows[0].Name) : type;
  } catch (_) {
    return type;
  }
}
const leaderName = (t) => nameOf("SELECT LeaderName AS Name FROM Leaders WHERE LeaderType = ? LIMIT 1", t);
const civName = (t) => nameOf("SELECT CivilizationName AS Name FROM Civilizations WHERE CivilizationType = ? LIMIT 1", t);

// The builder slot an AI leader holds already, or 0.
function slotHeld(leader) {
  for (let n = 2; n <= BUILD_SLOTS; n++) if (buildForLeader(n) === leader) return n;
  return 0;
}

class LShufAiWindow extends Panel {
  revision = -1;
  timer = 0;
  engineInputListener = (e) => this.onEngineInput(e);
  documentInputListener = (e) => {
    const d = e && e.detail;
    if (!d || d.status !== InputActionStatuses.FINISH || d.name !== "cancel" || !this.Root.isConnected) return;
    this.close();
    e.stopPropagation();
    e.preventDefault();
  };

  onInitialize() {
    super.onInitialize();
    this.render();
  }

  onAttach() {
    super.onAttach();
    this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
    document.addEventListener(InputEngineEventName, this.documentInputListener, true);
    this.revision = readRevision();
    this.timer = setInterval(() => this.poll(), SYNC_MS);
  }

  onDetach() {
    this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
    document.removeEventListener(InputEngineEventName, this.documentInputListener, true);
    clearInterval(this.timer);
    super.onDetach();
  }

  onEngineInput(event) {
    const d = event && event.detail;
    if (!d || d.status !== InputActionStatuses.FINISH) return;
    if (d.name === "cancel") this.close();
    else if (d.name !== "accept" && !String(d.name).startsWith("shell-action")) return;
    event.stopPropagation();
    event.preventDefault();
  }

  close() {
    ContextManager.pop(AI_WINDOW_TAG);
  }

  poll() {
    const r = readRevision();
    if (r === this.revision) return;
    this.revision = r;
    this.refresh();
  }

  // Build leader / Build civilization for an AI slot: give the leader a builder slot if it has none, then open.
  open(target, scope) {
    if (!isLocalHost()) return;
    const n = slotForLeader(target.leader);
    if (!n) {
      this.flash(compose("LOC_LSHUF_BUILD_FOR_FULL", BUILD_SLOTS - 1));
      return;
    }
    this.close();
    openBuildWindow(scope, n);
  }

  clear(target) {
    const n = slotHeld(target.leader);
    if (!n) return;
    writePicks([], n);
    setParam(buildForParam(n), "");
    this.revision = readRevision();
    this.refresh();
  }

  render() {
    this.Root.classList.add("fullscreen", "flex", "items-center", "justify-center");
    const frame = el("fxs-frame", "lshuf-ai__frame");
    frame.setAttribute("title", "LOC_LSHUF_AI_TITLE");
    const intro = el("div", "font-body text-sm text-accent-2 px-6 pb-2");
    intro.textContent = compose("LOC_LSHUF_AI_INTRO", BUILD_SLOTS - 1);
    this.noteBox = el("div", "lshuf-build__note font-body text-base px-6");
    this.noteBox.style.display = "none";
    const scroll = el("fxs-scrollable", "lshuf-ai__scroll");
    scroll.setAttribute("handle-gamepad-pan", "true");
    this.list = el("div", "px-6 pb-4");
    scroll.appendChild(this.list);
    const footer = el("div", "flex flex-row justify-center items-center pt-3 pb-4");
    const done = el("fxs-button");
    done.setAttribute("caption", "LOC_LSHUF_BUILD_DONE");
    done.addEventListener("action-activate", () => this.close());
    footer.appendChild(done);
    const closeX = el("fxs-close-button");
    closeX.addEventListener("action-activate", () => this.close());
    frame.append(intro, this.noteBox, scroll, footer, closeX);
    this.Root.appendChild(frame);
    this.refresh();
  }

  refresh() {
    try {
      this.list.innerHTML = "";
      const targets = buildTargets().filter((t) => !t.human);
      if (!targets.length) {
        this.list.appendChild(el("div", "font-body text-base text-accent-2", "LOC_LSHUF_AI_NONE"));
        return;
      }
      for (const t of targets) this.list.appendChild(this.row(t));
    } catch (e) {
      log(`refresh failed: ${e}`);
    }
  }

  row(t) {
    const row = el("div", "lshuf-ai__row flex flex-row items-center");
    const portrait = el("div", "lshuf-build__portrait lshuf-ai__portrait");
    portrait.style.backgroundImage = t.leader ? leaderPortrait(t.leader) : "";
    const civArt = el("div", "lshuf-build__portrait lshuf-build__portrait--civ lshuf-ai__civ");
    civArt.style.backgroundImage = t.civ ? civBackground(t.civ) : "";
    const text = el("div", "flex flex-col ml-3 flex-auto");
    const name = el("div", "font-title text-base uppercase text-secondary");
    name.textContent = t.leader ? leaderName(t.leader) : compose("LOC_LSHUF_AI_RANDOM");
    const sub = el("div", "font-body text-xs text-accent-2");
    sub.textContent = t.civ ? civName(t.civ) : compose("LOC_LSHUF_AI_NO_CIV");
    const state = el("div", "font-body text-xs text-accent-2 mt-1");
    const n = t.leader ? slotHeld(t.leader) : 0;
    const picked = n ? readPicks(n).length : 0;
    state.textContent = picked ? compose("LOC_LSHUF_AI_PICKED", picked) : compose("LOC_LSHUF_AI_NOT_BUILT");
    text.append(name, sub, state);
    row.append(portrait, civArt, text, this.buttons(t, n));
    return row;
  }

  buttons(t, held) {
    const box = el("div", "flex flex-row items-center");
    const make = (caption, onClick, disabled) => {
      const b = el("fxs-button", "ml-2");
      b.setAttribute("caption", caption);
      b.setAttribute("disabled", disabled ? "true" : "false");
      b.addEventListener("action-activate", onClick);
      box.appendChild(b);
    };
    const locked = !isLocalHost() || !t.leader;
    make("LOC_LSHUF_AI_BUILD_LEADER", () => this.open(t, "leader"), locked);
    make("LOC_LSHUF_AI_BUILD_CIV", () => this.open(t, "civ"), locked || !t.civ);
    make("LOC_LSHUF_AI_CLEAR", () => this.clear(t), locked || !held);
    return box;
  }

  flash(text) {
    this.noteBox.textContent = text;
    this.noteBox.style.display = "";
    setTimeout(() => {
      this.noteBox.style.display = "none";
    }, 1800);
  }
}

Controls.define(AI_WINDOW_TAG, {
  createInstance: LShufAiWindow,
  description: "Re-dealable Leaders: build the AI leaders",
  classNames: [AI_WINDOW_TAG],
  styles: [`fs://game/${MOD_ID}/ui/setup/lshuf-setup.css`, `fs://game/${MOD_ID}/ui/setup/lshuf-build.css`],
  initializeImmediately: true
});

export function openAiWindow() {
  ContextManager.push(AI_WINDOW_TAG, { singleton: true, createMouseGuard: true });
}
