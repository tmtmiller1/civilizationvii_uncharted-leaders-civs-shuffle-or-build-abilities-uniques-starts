// The mod's own setup window (SPEC section 3, "A window of the mod's own"; probe 16). Opened from the
// "Re-dealable Leaders..." button in Advanced Settings. Every option is a hidden setup parameter, read and written
// here through GameSetup, so it still saves with the game and reaches every player through the lobby. In a network
// game only the host can change values; everyone else sees them locked.

import Panel from "/core/ui/panel-support.js";
import ContextManager from "/core/ui/context-manager/context-manager.js";
import { InputEngineEventName } from "/core/ui/input/input-support.js";
import { MOD_ID, PARAM } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";
import { paramBool } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-params.js";
import { isLocalHost } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-config.js";
import { startModdedChecks } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-mod-check.js";
import {
  el, dropdownRow, checkboxRow, seedRow, leaderList
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-controls.js";

export const WINDOW_TAG = "lshuf-setup-window";
const SYNC_MS = 500;
// Advanced settings start closed; opening them holds for the rest of the session.
let advancedOpen = false;

const opt = (key) => [`LOC_LSHUF_${key}_NAME`, `LOC_LSHUF_${key}_DESC`];

const moddedBoxOn = () =>
  paramBool(PARAM.ModdedAbilities) || paramBool(PARAM.ModdedAttributes) || paramBool(PARAM.ModdedBiases);

function heading(key) {
  return el("div", "lshuf-setup__heading font-title text-lg text-secondary uppercase", key);
}

class LShufSetupWindow extends Panel {
  controls = [];
  revision = -1;
  timer = 0;
  engineInputListener = (e) => this.onEngineInput(e);

  onInitialize() {
    super.onInitialize();
    this.render();
  }

  onAttach() {
    super.onAttach();
    this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
    this.revision = this.readRevision();
    this.timer = setInterval(() => this.poll(), SYNC_MS);
    startModdedChecks();
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
    ContextManager.pop(WINDOW_TAG);
  }

  readRevision() {
    try {
      return GameSetup.currentRevision;
    } catch (_) {
      return -1;
    }
  }

  // Redraw from the setup values when they change under the window (the host, in a network game; a restore).
  poll() {
    const r = this.readRevision();
    if (r === this.revision) return;
    this.revision = r;
    this.syncAll();
  }

  syncAll() {
    for (const c of this.controls) c.sync();
    this.syncModded();
    this.hostNote.style.display = isLocalHost() ? "none" : "";
  }

  ctx() {
    return {
      locked: () => !isLocalHost(),
      changed: () => {
        this.revision = this.readRevision();
        this.syncModded();
      }
    };
  }

  add(parent, control) {
    this.controls.push(control);
    parent.appendChild(control.el);
    return control;
  }

  render() {
    this.Root.classList.add("fullscreen", "flex", "items-center", "justify-center");
    const frame = el("fxs-frame", "lshuf-setup__frame");
    frame.setAttribute("title", "LOC_LSHUF_WINDOW_TITLE");
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
    frame.append(this.hostNote, scroll, footer, closeX);
    this.Root.appendChild(frame);
    this.buildOptions(list);
    this.syncAll();
  }

  // The first view holds what most players choose: the mode, what it re-deals, keeping their own leader, and when
  // the deal is shown. Fine-tuning, the leader lists, pools and modded leaders sit under Advanced settings, closed
  // until opened (and kept open or closed for the rest of the session).
  buildOptions(list) {
    const ctx = this.ctx();
    list.appendChild(heading("LOC_LSHUF_HEADING_DEAL"));
    this.add(list, dropdownRow(PARAM.Mode, ...opt("MODE"), ctx));
    this.add(list, dropdownRow(PARAM.Abilities, ...opt("ABILITIES"), ctx));
    this.add(list, dropdownRow(PARAM.Attributes, ...opt("ATTRIBUTES"), ctx));
    this.add(list, dropdownRow(PARAM.Biases, ...opt("BIASES"), ctx));
    this.add(list, checkboxRow(PARAM.KeepMine, ...opt("KEEP_MINE"), ctx));
    this.add(list, dropdownRow(PARAM.Reveal, ...opt("REVEAL"), ctx));

    const toggleRow = el("div", "lshuf-setup__advanced-toggle flex flex-row justify-center");
    this.advancedBtn = el("fxs-button");
    this.advancedBtn.addEventListener("action-activate", () => {
      advancedOpen = !advancedOpen;
      this.syncAdvanced();
    });
    toggleRow.appendChild(this.advancedBtn);
    list.appendChild(toggleRow);
    this.advanced = el("div", "lshuf-setup__advanced");
    list.appendChild(this.advanced);
    this.buildAdvanced(this.advanced, ctx);
    this.syncAdvanced();
  }

  buildAdvanced(box, ctx) {
    this.add(box, dropdownRow(PARAM.Dealing, ...opt("DEALING"), ctx));
    this.add(box, dropdownRow(PARAM.Personality, ...opt("PERSONALITY"), ctx));
    this.add(box, seedRow(PARAM.Seed, ...opt("SEED"), ctx));

    box.appendChild(heading("LOC_LSHUF_HEADING_LEADERS"));
    this.add(box, leaderList(PARAM.LeadersOut, ...opt("LEADERS_OUT"), ctx, { inverted: true }));

    box.appendChild(heading("LOC_LSHUF_HEADING_POOLS"));
    const pool = { emptyKey: "LOC_LSHUF_POOL_EMPTY" };
    this.add(box, leaderList(PARAM.Pool1, ...opt("POOL1"), ctx, pool));
    this.add(box, leaderList(PARAM.Pool2, ...opt("POOL2"), ctx, pool));

    box.appendChild(heading("LOC_LSHUF_HEADING_MODDED"));
    this.add(box, checkboxRow(PARAM.ModdedAbilities, ...opt("MODDED_ABILITIES"), ctx));
    this.add(box, checkboxRow(PARAM.ModdedAttributes, ...opt("MODDED_ATTRIBUTES"), ctx));
    this.add(box, checkboxRow(PARAM.ModdedBiases, ...opt("MODDED_BIASES"), ctx));
    this.moddedNone = el("div", "lshuf-setup__note font-body text-sm", "LOC_LSHUF_MODDED_NONE_INSTALLED");
    box.appendChild(this.moddedNone);
    this.moddedList = this.add(box, leaderList(PARAM.ModdedOut, ...opt("MODDED_OUT"), ctx, { inverted: true }));
  }

  syncAdvanced() {
    this.advancedBtn.setAttribute("caption", advancedOpen ? "LOC_LSHUF_ADVANCED_HIDE" : "LOC_LSHUF_ADVANCED_SHOW");
    this.advanced.style.display = advancedOpen ? "" : "none";
  }

  // The modded list shows only while a modded box is on and two or more listed modded leaders are installed; with
  // one, the boxes alone decide.
  syncModded() {
    if (!this.moddedList) return;
    const size = this.moddedList.size;
    this.moddedNone.style.display = size === 0 ? "" : "none";
    this.moddedList.el.style.display = size >= 2 && moddedBoxOn() ? "" : "none";
  }
}

Controls.define(WINDOW_TAG, {
  createInstance: LShufSetupWindow,
  description: "Re-dealable Leaders setup window",
  classNames: [WINDOW_TAG],
  styles: [`fs://game/${MOD_ID}/ui/setup/lshuf-setup.css`],
  initializeImmediately: true
});

export function openSetupWindow() {
  ContextManager.push(WINDOW_TAG, { singleton: true, createMouseGuard: true });
}
