// The Build your own leader screen (CONTRACTS section 13, SPEC 7b), laid out like the game's memento select: the
// host's leader and its slots along the top, a toolbar of filters, a grid of cards, and a details pane. Clicking a
// card fills the next open slot of its kind; clicking a slot empties it. Every change is written to the hidden
// LShufBuildPicks parameter at once, so the preview and the other windows follow. Opened from the
// "Build your own leader..." button in the mod's settings section (lshuf-setup-accordion.js).

import Panel from "/core/ui/panel-support.js";
import ContextManager from "/core/ui/context-manager/context-manager.js";
import { InputEngineEventName } from "/core/ui/input/input-support.js";
import {
  MOD_ID, BUILD_KIND, BUILD_SLOTS, BUILD_UNREVIEWED_BULLETS, CA_MODE, PARAM, buildKindOf, listValue
} from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";
import { setParam } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-params.js";
import {
  el, dropdownRow, checkboxRow
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-controls.js";
import { opt, readRevision } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-section.js";
import {
  buildForLeader, buildForParam, isLocalHost, readOptions, readSlots, PLAIN_RANDOM
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-config.js";
import { openSetupWindow } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-window.js";
import {
  attributeIdsOf, buildCards, cantTake, cardFor, compose, disabledNote, hostCiv, hostLeader, isWholeCard, nextIdFor,
  readPicks, slotCounts, slotOfKind, writePicks
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-cards.js";
import {
  civBackground, leaderPortrait, SLOT_BASE, TAG_EQUIPPED
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-art.js";
import {
  renderGrid, renderSlots, renderToolbar
} from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-parts.js";
import { registerCards } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-tooltip.js";
import { renderCivicsTree } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-tree.js";
import { openAiWindow } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-ai-window.js";

export const BUILD_WINDOW_TAG = "lshuf-build-window";
const SYNC_MS = 500;
// Which half of the shuffle a screen builds: the leader (from the leader select) or the civilization (from the civ
// select). Set just before the window is pushed; each push makes a new instance.
const SCOPE_KINDS = {
  leader: [BUILD_KIND.Bullet, BUILD_KIND.Whole, BUILD_KIND.Attribute, BUILD_KIND.Persona, BUILD_KIND.Bias],
  civ: [BUILD_KIND.CivAbility, BUILD_KIND.CivBullet, BUILD_KIND.CivUnique, BUILD_KIND.CivCivics, BUILD_KIND.CivBias]
};
let nextScope = "leader";
let nextSlot = 1;

// Who a screen can build for (CONTRACTS 13, builder slots): the host (slot 1) and each AI player slot. An AI slot
// still on Random can't be built until Advanced Settings gives it a leader.
export function buildTargets() {
  const out = [{ slot: 1, leader: hostLeader(), civ: hostCiv(), human: true }];
  let me = -1;
  try {
    me = GameContext.localPlayerID;
  } catch (_) {
    me = -1;
  }
  for (const s of readSlots()) {
    if (s.human || s.id === me) continue;
    const leader = s.leader && s.leader !== PLAIN_RANDOM && !s.leader.startsWith("LSHUF_") ? s.leader : null;
    out.push({ slot: 0, leader, civ: s.civ && s.civ !== PLAIN_RANDOM ? s.civ : null, human: false });
  }
  return out;
}

// The builder slot an AI leader uses: the one already naming it, else the lowest free one (claimed now), else 0.
export function slotForLeader(leader) {
  let free = 0;
  for (let n = 2; n <= BUILD_SLOTS; n++) {
    const named = buildForLeader(n);
    if (named === leader) return n;
    if (!named && !free) free = n;
  }
  if (free) setParam(buildForParam(free), listValue(leader));
  return free;
}

const log = (msg) => console.warn(`[lshuf-build] ${msg}`);

class LShufBuildWindow extends Panel {
  revision = -1;
  timer = 0;
  // The builder slot on screen: 1 is the host, 2..BUILD_SLOTS are AI leaders chosen with "Building for".
  slot = 1;
  // Whole abilities start on: until a leader's bonuses are reviewed only its whole-ability card can be taken, so a
  // grid of single bonuses would open on nothing but greyed cards.
  filters = { search: "", kind: "", type: "", leader: "", whole: !BUILD_UNREVIEWED_BULLETS, hideNoTerrain: false };
  engineInputListener = (e) => this.onEngineInput(e);
  // Escape reaches the window's own listener only while focus sits inside it; this one hears it wherever focus went.
  documentInputListener = (e) => {
    const d = e && e.detail;
    if (!d || d.status !== InputActionStatuses.FINISH || d.name !== "cancel" || !this.Root.isConnected) return;
    this.close();
    e.stopPropagation();
    e.preventDefault();
  };

  onInitialize() {
    super.onInitialize();
    this.scope = SCOPE_KINDS[nextScope] ? nextScope : "leader";
    this.kinds = SCOPE_KINDS[this.scope];
    // The civilization screen opens on single bonuses only when Civilization abilities are set to Split.
    if (this.scope === "civ") this.filters.whole = readOptions().CivAbilities !== CA_MODE.Split;
    this.slot = nextSlot >= 1 && nextSlot <= BUILD_SLOTS ? nextSlot : 1;
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

  // Cancel closes the screen. Accept and the shell actions stop here after our controls have seen them, so the
  // leader or civ select screen under us can't take them as its own Select and move the flow on.
  onEngineInput(event) {
    const d = event && event.detail;
    if (!d || d.status !== InputActionStatuses.FINISH) return;
    if (d.name === "cancel") this.close();
    else if (d.name !== "accept" && !String(d.name).startsWith("shell-action")) return;
    event.stopPropagation();
    event.preventDefault();
  }

  close() {
    ContextManager.pop(BUILD_WINDOW_TAG);
  }

  // The setup changed under the screen (another window, the host, a restore): redraw.
  poll() {
    const r = readRevision();
    if (r === this.revision) return;
    this.revision = r;
    this.load();
    this.refresh();
  }

  // --- data ---

  // The builder this screen builds for: slot 1 is the host; a higher slot is the AI leader LShufBuildFor<n> names.
  target() {
    if (!this.slot || this.slot === 1) return { slot: 1, leader: hostLeader(), civ: hostCiv(), human: true };
    const leader = buildForLeader(this.slot);
    const t = leader ? buildTargets().find((x) => !x.human && x.leader === leader) : null;
    return t ? { ...t, slot: this.slot } : { slot: this.slot, leader, civ: null, human: false };
  }

  load() {
    const t = this.target();
    this.builder = t.leader;
    this.civ = t.civ;
    this.forAI = !t.human;
    this.note = disabledNote();
    if (this.note === "LOC_LSHUF_BUILD_NO_LEADER" && this.forAI && this.builder) this.note = null;
    if (this.scope === "civ" && !this.note && !this.civ) this.note = "LOC_LSHUF_BUILD_NO_CIV";
    const data = buildCards(this.builder, this.civ);
    this.cards = data.cards.filter((c) => this.kinds.includes(c.kind));
    this.civNames = data.civNames || new Map();
    this.tagNames = data.tagNames;
    this.leaderNames = data.leaderNames;
    const all = this.builder ? slotCounts(this.builder, this.civ, data.cards) : null;
    if (!all) this.counts = null;
    else if (this.scope === "civ") {
      this.counts = { ability: 0, attributes: 0, behavior: 0, terrain: 0, civAbility: all.civAbility,
        civUniques: all.civUniques, civCivics: all.civCivics, civTerrain: all.civTerrain };
    } else this.counts = { ...all, civAbility: 0, civUniques: 0, civCivics: 0, civTerrain: 0 };
    this.byId = new Map(this.cards.map((c) => [c.id, c]));
    registerCards(this.cards);
  }

  picks() {
    return this.note ? [] : readPicks(this.slot || 1).filter((id) => cardFor(this.byId, id));
  }

  // A click on a card takes it; a click on a card that's in as far as it can go puts it back. An attribute goes in
  // twice before a third click takes both copies out.
  take(card) {
    if (this.note) return;
    const picks = this.picks();
    const why = cantTake(card, picks, this.counts);
    if (why === "taken") {
      const mine = new Set(attributeIdsOf(card, picks));
      this.commit(picks.filter((id) => !mine.has(id)));
      return;
    }
    if (why === "full") {
      this.flash("LOC_LSHUF_BUILD_SLOTS_FULL");
      return;
    }
    if (why) return;
    const next = nextIdFor(card, picks);
    if (isWholeCard(card.kind)) {
      const rest = picks.filter((id) => slotOfKind(buildKindOf(id)) !== slotOfKind(card.kind));
      this.commit([...rest, next]);
    } else {
      this.commit([...picks, next]);
    }
  }

  drop(id) {
    if (this.note) return;
    this.commit(this.picks().filter((p) => p !== id));
  }

  clear() {
    if (this.note) return;
    this.commit([]);
  }

  // Only this screen's cards change; the other screen's picks ride along untouched.
  commit(ids) {
    const n = this.slot || 1;
    const others = readPicks(n).filter((id) => !this.byId.has(id));
    writePicks([...others, ...ids], n);
    this.revision = readRevision();
    this.refresh();
  }

  // --- drawing ---

  render() {
    this.Root.classList.add("fullscreen", "flex", "items-center", "justify-center");
    const frame = el("fxs-frame", "lshuf-build__frame");
    frame.setAttribute("title", this.scope === "civ" ? "LOC_LSHUF_BUILD_CIV_TITLE" : "LOC_LSHUF_BUILD_TITLE");
    this.head = el("div", "lshuf-build__head px-6");
    this.settingsBox = el("div", "lshuf-build__settings px-6");
    this.slotsBox = el("div", "lshuf-build__slots px-6");
    this.toolbar = el("div", "lshuf-build__toolbar px-6");
    const body = el("div", "lshuf-build__body flex flex-row px-6");
    this.body = body;
    const scroll = el("fxs-scrollable", "lshuf-build__scroll flex-auto");
    scroll.setAttribute("handle-gamepad-pan", "true");
    this.grid = el("div", "lshuf-build__grid flex flex-row flex-wrap");
    scroll.appendChild(this.grid);
    this.details = el("div", "lshuf-build__details");
    body.append(scroll, this.details);
    this.noteBox = el("div", "lshuf-build__note font-body text-base px-6");
    const footer = el("div", "flex flex-row justify-center items-center pt-3 pb-4");
    const clear = el("fxs-button", "mr-4");
    clear.setAttribute("caption", "LOC_LSHUF_BUILD_CLEAR");
    clear.addEventListener("action-activate", () => this.clear());
    const done = el("fxs-button");
    done.setAttribute("caption", "LOC_LSHUF_BUILD_DONE");
    done.addEventListener("action-activate", () => this.close());
    footer.append(clear, done);
    const closeX = el("fxs-close-button");
    closeX.addEventListener("action-activate", () => this.close());
    frame.append(this.head, this.settingsBox, this.slotsBox, this.toolbar, this.noteBox, body, footer, closeX);
    this.Root.appendChild(frame);
    this.load();
    this.settingsBox.appendChild(this.buildSettings());
    this.toolbar.appendChild(renderToolbar(this));
    this.refresh();
  }

  // The settings that decide whether a build counts, right here so the player can turn the shuffle on without
  // leaving: the leader screen gets the leader settings, the civ screen the start terrain switch and its pool.
  buildSettings() {
    const ctx = {
      locked: () => !isLocalHost(),
      changed: () => {
        this.revision = readRevision();
        this.load();
        this.refresh();
      }
    };
    const box = el("div", "lshuf-build__settings-row flex flex-row flex-wrap items-center");
    const rows = [dropdownRow(PARAM.Mode, ...opt("MODE"), ctx)];
    if (this.scope === "civ") {
      rows.push(
        dropdownRow(PARAM.CivAbilities, ...opt("CIV_ABILITIES"), ctx),
        dropdownRow(PARAM.CivUniques, ...opt("CIV_UNIQUES"), ctx),
        dropdownRow(PARAM.CivCivics, ...opt("CIV_CIVICS"), ctx),
        dropdownRow(PARAM.Biases, ...opt("BIASES"), ctx)
      );
    } else {
      rows.push(
        dropdownRow(PARAM.Abilities, ...opt("ABILITIES"), ctx),
        dropdownRow(PARAM.Attributes, ...opt("ATTRIBUTES"), ctx),
        dropdownRow(PARAM.Biases, ...opt("BIASES"), ctx),
        dropdownRow(PARAM.Personality, ...opt("PERSONALITY"), ctx),
        checkboxRow(PARAM.KeepMine, ...opt("KEEP_MINE"), ctx)
      );
    }
    for (const r of rows) box.appendChild(r.el);
    if (this.scope === "civ") {
      const pool = el("fxs-button", "m-1");
      pool.setAttribute("caption", "LOC_LSHUF_BTN_CIVS");
      pool.addEventListener("action-activate", () => openSetupWindow("civs"));
      box.appendChild(pool);
    }
    this.settingControls = rows;
    return box;
  }

  refresh() {
    try {
      for (const c of this.settingControls || []) c.sync();
      this.drawHead();
      this.noteBox.textContent = this.note ? compose(this.note) : "";
      this.noteBox.style.display = this.note ? "" : "none";
      this.slotsBox.innerHTML = "";
      if (this.counts) this.slotsBox.appendChild(renderSlots(this, this.picks()));
      this.grid.innerHTML = "";
      this.grid.classList.toggle("lshuf-build__grid--off", !!this.note);
      this.grid.appendChild(renderGrid(this, this.picks()));
      this.showDetails(this.detailCard || null);
      this.layoutForTree();
    } catch (e) {
      log(`refresh failed: ${e}`);
    }
  }

  // A link between the two places: your own screen points at the AI leaders window, an AI screen points back.
  drawLink() {
    const box = el("div", "flex flex-row items-center justify-end mb-1");
    const btn = el("fxs-button");
    btn.setAttribute("caption", this.forAI ? "LOC_LSHUF_BUILD_LINK_BACK" : "LOC_LSHUF_BUILD_LINK_AI");
    btn.addEventListener("action-activate", () => {
      if (this.forAI) this.close();
      openAiWindow();
    });
    box.appendChild(btn);
    return box;
  }

  drawHead() {
    this.head.innerHTML = "";
    this.head.appendChild(this.drawLink());
    const row = el("div", "flex flex-row items-center");
    const portrait = el("div", "lshuf-build__portrait");
    const text = el("div", "flex flex-col ml-4");
    const title = el("div", "font-title text-xl uppercase text-secondary");
    const intro = el("div", "font-body text-sm text-accent-2 mt-1");
    const [art, titleText, introKey] = this.scope === "civ" ? this.civHead(portrait) : this.leaderHead();
    portrait.style.backgroundImage = art;
    title.textContent = titleText;
    intro.textContent = compose(introKey);
    text.append(title, intro);
    if (this.scope === "civ") {
      const note = el("div", "font-body text-xs text-accent-2 mt-1");
      note.textContent = compose("LOC_LSHUF_BUILD_CIV_SWAP_NOTE");
      text.appendChild(note);
    }
    row.append(portrait, text);
    this.head.appendChild(row);
  }

  leaderHead() {
    const name = this.builder && this.leaderNames.get(this.builder) ? this.leaderNames.get(this.builder).name : "";
    const key = this.forAI ? "LOC_LSHUF_BUILD_FOR_AI_LEADER" : "LOC_LSHUF_BUILD_YOUR_LEADER";
    const title = this.builder ? compose(key, name) : compose("LOC_LSHUF_BUILD_NO_LEADER");
    return [leaderPortrait(this.builder), title, "LOC_LSHUF_BUILD_INTRO"];
  }

  civHead(portrait) {
    portrait.classList.add("lshuf-build__portrait--civ");
    const civName = this.civ && this.civNames.get(this.civ) ? this.civNames.get(this.civ).name : "";
    const key = this.forAI ? "LOC_LSHUF_BUILD_FOR_AI_CIV" : "LOC_LSHUF_BUILD_YOUR_CIV";
    const title = this.civ ? compose(key, civName) : compose("LOC_LSHUF_BUILD_NO_CIV");
    return [this.civ ? civBackground(this.civ) : "", title, "LOC_LSHUF_BUILD_CIV_INTRO"];
  }

  showDetails(card) {
    this.detailCard = card;
    this.details.innerHTML = "";
    this.layoutForTree();
    if (!card) return;
    if (card.kind === BUILD_KIND.CivCivics) {
      const tree = renderCivicsTree(card.civ, card.name);
      if (tree) {
        const scroll = el("fxs-scrollable", "lshuf-build__tree-scroll");
        scroll.setAttribute("handle-gamepad-pan", "true");
        scroll.appendChild(tree);
        this.details.appendChild(scroll);
        return;
      }
    }
    const title = el("div", "font-title text-lg uppercase text-secondary");
    title.textContent = card.name;
    const from = el("div", "font-body text-sm text-accent-2 mb-2");
    const kindText = card.kindLine || compose(`LOC_LSHUF_BUILD_KIND_${card.kind.toUpperCase()}`);
    from.textContent = card.from ? `${kindText} · ${compose("LOC_LSHUF_BUILD_CARD_FROM", card.from)}` : kindText;
    const body = el("div", "font-body text-sm lshuf-build__details-text");
    body.innerHTML = Locale.stylize ? Locale.stylize(card.text || "") : card.text || "";
    this.details.append(title, from, body);
    if (!card.reviewed) {
      const warn = el("div", "font-body text-sm lshuf-build__warn mt-2");
      warn.textContent = compose("LOC_LSHUF_BUILD_CARD_UNREVIEWED");
      this.details.appendChild(warn);
    }
  }

  // The civics look: while the Show filter is Unique civics or a civics card is in the details, the cards stand in
  // one narrow scrolling column and the details pane takes the rest for the tree.
  layoutForTree() {
    if (!this.body) return;
    const shown = this.detailCard && this.detailCard.kind === BUILD_KIND.CivCivics;
    const tree = this.filters.kind === BUILD_KIND.CivCivics || shown;
    this.body.classList.toggle("lshuf-build__body--tree", !!tree);
  }

  flash(key, ...args) {
    this.noteBox.textContent = compose(key, ...args);
    this.noteBox.style.display = "";
    setTimeout(() => {
      if (!this.note) this.noteBox.style.display = "none";
    }, 1800);
  }
}

Controls.define(BUILD_WINDOW_TAG, {
  createInstance: LShufBuildWindow,
  description: "Re-dealable Leaders: build your own leader",
  classNames: [BUILD_WINDOW_TAG],
  styles: [`fs://game/${MOD_ID}/ui/setup/lshuf-setup.css`, `fs://game/${MOD_ID}/ui/setup/lshuf-build.css`],
  initializeImmediately: true
});

// slot 1 builds the host's own leader or civilization; slots 2..BUILD_SLOTS build the AI leaders named by
// LShufBuildFor<n>, reached from the AI leaders window (lshuf-ai-window.js).
export function openBuildWindow(scope = "leader", slot = 1) {
  nextScope = scope;
  nextSlot = slot;
  ContextManager.push(BUILD_WINDOW_TAG, { singleton: true, createMouseGuard: true });
}

export { SLOT_BASE, TAG_EQUIPPED };
