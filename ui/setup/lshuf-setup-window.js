// The mod's setup windows. The advanced window opens from the button after the mod's rows in its settings section and
// holds the fairness of mixed bonuses and the shuffle number, then buttons for leaders that are shuffled and leaders
// from other mods. The Leader pool, Civilization pool and AI players windows open from the section itself. Every
// option here is a hidden setup parameter read and written through GameSetup, so it saves with the game and reaches
// every player through the lobby. In a network game only the host can change values; everyone else sees them locked.
// Escape and Close shut only the window on top.

import Panel from "/core/ui/panel-support.js";
import ContextManager from "/core/ui/context-manager/context-manager.js";
import { InputEngineEventName } from "/core/ui/input/input-support.js";
import { MOD_ID, PARAM } from "/uncharted-leaders-and-civs/shared/lshuf-constants.js";
import { paramBool } from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-params.js";
import { isLocalHost } from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-config.js";
import { startModdedChecks } from "/uncharted-leaders-and-civs/ui/setup/lshuf-mod-check.js";
import {
  el, dropdownRow, checkboxRow, seedRow, leaderList
} from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-controls.js";
import {
  opt, pageButtons, readRevision
} from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-section.js";

import { buildAiPlayers } from "/uncharted-leaders-and-civs/ui/setup/lshuf-ai-players.js";

const SYNC_MS = 500;
const tagOf = (page) => `lshuf-setup-window-${page}`;
export const WINDOW_TAG = tagOf("advanced");

const moddedBoxOn = () =>
  paramBool(PARAM.ModdedAbilities) || paramBool(PARAM.ModdedAttributes) || paramBool(PARAM.ModdedBiases);

// Each page: its frame title and a builder that fills `list` and returns its controls ({ el, sync }).
const PAGES = {
  leaders: {
    title: "LOC_LSHUF_LEADERS_OUT_NAME",
    build: (win, list, ctx) => [win.add(list, leaderList(PARAM.LeadersOut, ...opt("LEADERS_OUT"), ctx, { inverted: true }))]
  },
  pools: { title: "LOC_LSHUF_HEADING_POOLS", build: (win, list, ctx) => buildPools(win, list, ctx) },
  aiplayers: {
    title: "LOC_LSHUF_AI_PLAYERS_TITLE",
    build: (win, list, ctx) => buildAiPlayers(win, list, ctx, (page) => openSetupWindow(page))
  },
  modded: { title: "LOC_LSHUF_HEADING_MODDED", build: (win, list, ctx) => buildModded(win, list, ctx) },
  civs: {
    title: "LOC_LSHUF_CIVS_OUT_NAME",
    build: (win, list, ctx) => [
      win.add(list, leaderList(PARAM.CivsOut, "LOC_LSHUF_CIVS_OUT_NAME", "LOC_LSHUF_CIVS_OUT_DESC", ctx, { inverted: true }))
    ]
  },
  advanced: {
    title: "LOC_LSHUF_ADVANCED_TITLE",
    build: (win, list, ctx) => [
      win.add(list, dropdownRow(PARAM.Dealing, ...opt("DEALING"), ctx)),
      win.add(list, seedRow(PARAM.Seed, ...opt("SEED"), ctx)),
      { el: list.appendChild(pageButtons((page) => openSetupWindow(page))), sync: () => {} }
    ]
  }
};

// The one leader pool: a list with All and None (a slot picks one leader, so one list is all it needs).
function buildPools(win, list, ctx) {
  const pool = leaderList(PARAM.LeaderPoolOut, ...opt("POOL"), ctx, { inverted: true });
  win.add(list, pool);
  return [pool];
}

// The modded list shows only while a modded box is on and two or more listed modded leaders are installed; with
// one, the boxes alone decide.
function buildModded(win, list, ctx) {
  const controls = [
    win.add(list, checkboxRow(PARAM.ModdedAbilities, ...opt("MODDED_ABILITIES"), ctx)),
    win.add(list, checkboxRow(PARAM.ModdedAttributes, ...opt("MODDED_ATTRIBUTES"), ctx)),
    win.add(list, checkboxRow(PARAM.ModdedBiases, ...opt("MODDED_BIASES"), ctx))
  ];
  const none = el("div", "lshuf-setup__note font-body text-sm", "LOC_LSHUF_MODDED_NONE_INSTALLED");
  list.appendChild(none);
  const moddedList = win.add(list, leaderList(PARAM.ModdedOut, ...opt("MODDED_OUT"), ctx, { inverted: true }));
  const syncShow = () => {
    none.style.display = moddedList.size === 0 ? "" : "none";
    moddedList.el.style.display = moddedList.size >= 2 && moddedBoxOn() ? "" : "none";
  };
  controls.push(moddedList, { sync: syncShow });
  syncShow();
  return controls;
}

class LShufSetupWindow extends Panel {
  controls = [];
  revision = -1;
  timer = 0;
  engineInputListener = (e) => this.onEngineInput(e);

  get page() {
    return "advanced";
  }

  onInitialize() {
    super.onInitialize();
    this.render();
  }

  onAttach() {
    super.onAttach();
    this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
    this.revision = readRevision();
    this.timer = setInterval(() => this.poll(), SYNC_MS);
    if (this.page === "modded" || this.page === "advanced") startModdedChecks();
  }

  onDetach() {
    this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
    clearInterval(this.timer);
    super.onDetach();
  }

  onEngineInput(event) {
    const d = event && event.detail;
    if (!d || d.status !== InputActionStatuses.FINISH || d.name !== "cancel") return;
    this.close();
    event.stopPropagation();
    event.preventDefault();
  }

  close() {
    ContextManager.pop(tagOf(this.page));
  }

  // Redraw from the setup values when they change under the window (the host, in a network game; a restore; a change
  // made in another of our windows or on the Game Setup page).
  poll() {
    const r = readRevision();
    if (r === this.revision) return;
    this.revision = r;
    this.syncAll();
  }

  syncAll() {
    for (const c of this.controls) c.sync();
    this.hostNote.style.display = isLocalHost() ? "none" : "";
  }

  add(parent, control) {
    parent.appendChild(control.el);
    return control;
  }

  render() {
    this.Root.classList.add("fullscreen", "flex", "items-center", "justify-center");
    const frame = el("fxs-frame", `lshuf-setup__frame lshuf-setup__frame--${this.page}`);
    frame.setAttribute("title", PAGES[this.page].title);
    // The frame doesn't draw its title attribute, so the heading is our own.
    const heading = el("div", "font-title text-xl uppercase text-secondary px-6 pt-4 pb-2", PAGES[this.page].title);
    this.hostNote = el("div", "lshuf-setup__host-only font-body text-sm px-6", "LOC_LSHUF_HOST_ONLY");
    const scroll = el("fxs-scrollable", "lshuf-setup__scroll");
    scroll.setAttribute("handle-gamepad-pan", "true");
    const list = el("fxs-vslot", "px-6 pb-6");
    scroll.appendChild(list);
    const footer = el("div", "flex flex-row justify-center pt-3 pb-4");
    const done = el("fxs-button");
    done.setAttribute("caption", "LOC_LSHUF_CLOSE");
    done.addEventListener("action-activate", () => this.close());
    footer.appendChild(done);
    const closeX = el("fxs-close-button");
    closeX.addEventListener("action-activate", () => this.close());
    frame.append(heading, this.hostNote, scroll, footer, closeX);
    this.Root.appendChild(frame);
    const ctx = {
      locked: () => !isLocalHost(),
      changed: () => {
        this.revision = readRevision();
        this.syncAll();
      }
    };
    this.controls = PAGES[this.page].build(this, list, ctx);
    this.syncAll();
  }
}

// One tag per page, so a list window stacks over the advanced window and pops on its own.
for (const page of Object.keys(PAGES)) {
  const PageWindow = class extends LShufSetupWindow {
    get page() {
      return page;
    }
  };
  Controls.define(tagOf(page), {
    createInstance: PageWindow,
    description: `Uncharted Leaders & Civs setup window (${page})`,
    classNames: [tagOf(page), "lshuf-setup-window"],
    styles: [`fs://game/${MOD_ID}/ui/setup/lshuf-setup.css`],
    initializeImmediately: true
  });
}

export function openSetupWindow(page = "advanced") {
  const p = PAGES[page] ? page : "advanced";
  ContextManager.push(tagOf(p), { singleton: true, createMouseGuard: true });
}
