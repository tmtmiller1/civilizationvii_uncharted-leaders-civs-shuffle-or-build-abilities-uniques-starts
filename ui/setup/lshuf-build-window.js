// The build window (CONTRACTS sections 13 and 28, SPEC 7b), laid out like the game's memento select: a link row to
// its two pages (your leader, your civilization), the builder and its slots along the top, a toolbar of filters, a
// grid of cards, and a details pane. Clicking a card fills the next open slot of its kind; clicking a slot empties
// it. Every change is written to the hidden LShufBuildPicks parameter at once, so the preview and the other windows
// follow. Only the host's own leader and civilization are built; the AI players get the shuffle settings and the
// pools (hand-building them is parked in mod_ideas_tested/re-dealable-ai-leader-builds). Opened from the mod's
// settings section (lshuf-setup-accordion.js) and the buttons on the game's own screens (lshuf-build-entry.js).

import Panel from "/core/ui/panel-support.js";
import ContextManager from "/core/ui/context-manager/context-manager.js";
import { InputEngineEvent, InputEngineEventName } from "/core/ui/input/input-support.js";
import {
  MOD_ID, A_MODE, BUILD_KIND, CA_MODE, CC_MODE, MODE, PARAM, buildKindOf
} from "/uncharted-leaders-and-civs/shared/lshuf-constants.js";
import { humanFollows, setParam, START_AGE_PARAM } from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-params.js";
import {
  el, dropdownRow, checkboxRow
} from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-controls.js";
import { opt, readRevision } from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-section.js";
import { isLocalHost, readOptions } from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-config.js";
import { openSetupWindow } from "/uncharted-leaders-and-civs/ui/setup/lshuf-setup-window.js";
import { syncPresets } from "/uncharted-leaders-and-civs/ui/setup/lshuf-presets.js";
import {
  attributeIdsOf, buildCards, cantTake, cardFor, civicSlotCount, compose, disabledNote, hostCiv, hostLeader,
  isWholeCard, nextIdFor, otherPagePicks, readPicks, slotCounts, slotOfKind, uniquesStayOwn, wholePickInGroup,
  writePicks
} from "/uncharted-leaders-and-civs/ui/setup/lshuf-build-cards.js";
import {
  civBackground, leaderPortrait, SLOT_BASE, TAG_EQUIPPED
} from "/uncharted-leaders-and-civs/ui/setup/lshuf-build-art.js";
import {
  dropdown, renderGrid, renderSlots, renderToolbar
} from "/uncharted-leaders-and-civs/ui/setup/lshuf-build-parts.js";
import { registerCards } from "/uncharted-leaders-and-civs/ui/setup/lshuf-build-tooltip.js";
import { uniqueNeeds } from "/uncharted-leaders-and-civs/ui/setup/lshuf-build-needs.js";
import { renderCivicsTree } from "/uncharted-leaders-and-civs/ui/setup/lshuf-build-tree.js";
import { BUILD_PAGES, cardsShown, pageOf } from "/uncharted-leaders-and-civs/ui/setup/lshuf-build-layout.js";
import { biasesLive, hostPicker } from "/uncharted-leaders-and-civs/ui/setup/lshuf-build-pick.js";

export const BUILD_WINDOW_TAG = "lshuf-build-window";
const SYNC_MS = 500;
// The game's Select on the leader select screen. Our own "Build your own leader..." bar sits above it with the same
// classes plus lshuf-build__open, and isn't an Activatable. The UI's querySelector refuses :not(), so this walks the
// bars itself.
const CIV_CARD = ".create-game-civ-card";
const CIV_CONTINUE = ".civ-details-continue-button";

// The civ list's card for a civilization: the card whose name header reads the civ's name (the composed name the
// window holds; the shell has no GameInfo).
function civCard(civName) {
  const name = String(civName || "").trim().toLowerCase();
  if (!name) return null;
  for (const card of document.querySelectorAll(CIV_CARD)) {
    const head = card.querySelector(".create-game-civ-card-text-gradient");
    if (head && head.textContent.trim().toLowerCase() === name) return card;
  }
  return null;
}

// A left-button press on one of the game's ui-next controls. Its Activatable answers a press on the element itself;
// focus plus an accept doesn't reach a civ card (watched 2026-11-08).
const press = (target) => target.dispatchEvent(
  new InputEngineEvent("mousebutton-left", InputActionStatuses.FINISH, 0, 0, false, false));

// Done on the civ screen shows the civ's details screen, where the game's own Select moves on. From the civ list it
// presses the civ's card, which opens its details; on the details screen already, closing is enough.
function civDone(civName) {
  try {
    if (document.querySelector(CIV_CONTINUE)) return;
    const card = civCard(civName);
    if (card) press(card);
    else log(`no civ card reads "${civName}"`);
  } catch (e) {
    log(`civ details after done failed: ${e}`);
  }
}

// Which half of the shuffle a screen builds: the leader (from the leader select) or the civilization (from the civ
// select). Set just before the window is pushed; each push makes a new instance.
const SCOPE_KINDS = {
  leader: [BUILD_KIND.Bullet, BUILD_KIND.Whole, BUILD_KIND.Attribute, BUILD_KIND.Persona, BUILD_KIND.Bias],
  civ: [BUILD_KIND.CivAbility, BUILD_KIND.CivBullet, BUILD_KIND.CivUnique, BUILD_KIND.CivCivic, BUILD_KIND.CivCivics,
    BUILD_KIND.CivBias]
};
let nextScope = "leader";
const log = (msg) => console.warn(`[lshuf-build] ${msg}`);

class LShufBuildWindow extends Panel {
  revision = -1;
  timer = 0;
  // The builder slot this window writes: the host's (CONTRACTS 13).
  slot = 1;
  filters = {};
  engineInputListener = (e) => this.onEngineInput(e);
  // Escape reaches the window's own listener only while focus sits inside it; this one hears it wherever focus went.
  documentInputListener = (e) => {
    const d = e && e.detail;
    if (!d || d.status !== InputActionStatuses.FINISH || d.name !== "cancel" || !this.Root.isConnected) return;
    if (!this.closeTree()) this.close();
    e.stopPropagation();
    e.preventDefault();
  };

  onInitialize() {
    super.onInitialize();
    this.initPage(SCOPE_KINDS[nextScope] ? nextScope : "leader");
    this.render();
  }

  // The page's kinds and its filters, fresh. Whole cards or single pieces follow the settings (syncShown).
  initPage(scope) {
    this.scope = scope;
    this.kinds = SCOPE_KINDS[scope];
    this.filters = { search: "", kind: "", type: "", leader: "", wholeAbility: false, wholeCivics: false,
      hideNoTerrain: false, everyAge: false };
    this.syncShown();
    this.detailCard = null;
  }

  // The other page, in place: the same window, drawn again.
  setPage(scope) {
    if (!SCOPE_KINDS[scope] || scope === this.scope) return;
    this.closeTree();
    this.initPage(scope);
    this.Root.innerHTML = "";
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
    if (d.name === "cancel") {
      if (!this.closeTree()) this.close();
    }
    else if (d.name !== "accept" && !String(d.name).startsWith("shell-action")) return;
    event.stopPropagation();
    event.preventDefault();
  }

  close() {
    ContextManager.pop(BUILD_WINDOW_TAG);
  }

  // Done closes and leaves you on the game's own details for what you built: the leader select already shows the
  // chosen leader's details, and on the civ side Done opens your civilization's details screen. The game's own Select
  // moves on from there (the owner wants to see the details first, 2026-11-08).
  done() {
    const civName = this.civ && this.civNames.get(this.civ) ? this.civNames.get(this.civ).name : "";
    this.close();
    if (this.scope !== "civ") return;
    setTimeout(() => civDone(civName), 0);
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

  load() {
    this.builder = hostLeader();
    this.civ = hostCiv();
    this.readNote();
    const data = buildCards(this.builder, this.civ);
    const mine = data.cards.filter((c) => this.kinds.includes(c.kind));
    this.cards = mine;
    this.markBlocked();
    this.civNames = data.civNames || new Map();
    this.tagNames = data.tagNames;
    this.leaderNames = data.leaderNames;
    const all = this.builder ? slotCounts(this.builder, this.civ, data.cards, false) : null;
    this.ownCivics = all ? all.civCivics : 0;
    if (!all) this.counts = null;
    else if (this.scope === "civ") {
      this.counts = { ability: 0, attributes: 0, behavior: 0, terrain: 0, civAbility: all.civAbility,
        civUniques: all.civUniques, civCivics: all.civCivics, civTerrain: all.civTerrain };
    } else this.counts = { ...all, civAbility: 0, civUniques: 0, civCivics: 0, civTerrain: 0 };
    this.byId = new Map(this.cards.map((c) => [c.id, c]));
    registerCards(this.cards);
    this.syncCivicSlots();
  }

  // A warning under the slots for each picked card that names a unique the builder doesn't hold (Carthage's bonus
  // and the Colonist), with a button that takes that unique.
  drawNeeds() {
    this.needsBox.innerHTML = "";
    const needs = this.note ? [] : uniqueNeeds(this.cards, this.picks());
    this.needsBox.style.display = needs.length ? "" : "none";
    for (const { card, unique, bonus } of needs) {
      const row = el("div", "lshuf-build__need flex flex-row items-center");
      const text = el("div", "flex-auto");
      const key = bonus ? "LOC_LSHUF_BUILD_NEEDS_BONUS" : "LOC_LSHUF_BUILD_NEEDS";
      text.textContent = compose(key, card.name, unique.name, unique.from || "");
      const btn = el("fxs-button", "ml-3");
      btn.setAttribute("caption", compose(`${key}_TAKE`, unique.name));
      btn.addEventListener("action-activate", () => this.take(unique));
      row.append(text, btn);
      this.needsBox.appendChild(row);
    }
  }

  // The civics slots follow the Whole toggle: one slot while whole trees are shown, the builder civ's own civic count
  // while single civics are (or whenever a single civic is already in a slot, so none of them is hidden).
  syncCivicSlots() {
    if (!this.counts || this.scope !== "civ") return;
    const civicIn = readPicks(this.slot)
      .some((id) => buildKindOf(id) === BUILD_KIND.CivCivic && this.byId.has(id));
    this.counts.civCivics = civicSlotCount(this.ownCivics, this.filters.wholeCivics && !civicIn);
  }

  // Cards that can't count for this builder right now: a civ start terrain card while start terrain doesn't deal.
  // Another age's civics and trees are kept out by their cards' otherAge mark (that age's data isn't loaded).
  markBlocked() {
    const terrainOff = !biasesLive();
    for (const c of this.cards) {
      if (c.kind === BUILD_KIND.CivBias && terrainOff) c.blocked = "terrainoff";
    }
  }

  // Why the screen can't build right now (this.note), or a hint that it will once a card is taken (this.hint).
  readNote() {
    this.hint = null;
    this.note = this.adjustNote(disabledNote());
    if (this.note === "LOC_LSHUF_BUILD_MODE_OFF" && this.scope === "leader") {
      // Leader shuffle still on Base game: the leader screen stays live and the first card taken turns it on.
      this.note = null;
      this.hint = "LOC_LSHUF_BUILD_MODE_AUTO";
    }
    if (this.scope === "civ" && !this.note && !this.civ) this.note = "LOC_LSHUF_BUILD_NO_CIV";
  }

  // With no builder, Base game reads as "pick a leader"; civ cards build on Base game too, so the civ page keeps
  // going.
  adjustNote(note) {
    if (note !== "LOC_LSHUF_BUILD_MODE_OFF") return note;
    if (!this.builder) return "LOC_LSHUF_BUILD_NO_LEADER";
    return this.scope === "civ" ? null : note;
  }

  picks() {
    return this.note ? [] : readPicks(this.slot).filter((id) => cardFor(this.byId, id));
  }

  // A click on a card takes it; a click on a card that's in as far as it can go puts it back. An attribute goes in
  // twice before a third click takes both copies out. A whole card (ability, civics tree) empties its group first; a
  // single card (bonus, civic) taken while a whole card fills its group puts the whole card back and goes in.
  take(card) {
    if (this.note) return;
    if (card.goesWith) {
      this.takeGoesWith(card);
      return;
    }
    if (this.hint === "LOC_LSHUF_BUILD_MODE_AUTO" && this.goesIn(card)) this.turnShuffleOn();
    const picks = this.picks();
    const why = cantTake(card, picks, this.counts);
    if (why === "taken") {
      const mine = new Set(attributeIdsOf(card, picks));
      this.commit(picks.filter((id) => !mine.has(id)));
      return;
    }
    const whole = why === "full" ? wholePickInGroup(card, picks) : null;
    if (why === "full" && !whole) {
      this.flash("LOC_LSHUF_BUILD_SLOTS_FULL");
      return;
    }
    if (why && !whole) return;
    const rest = isWholeCard(card.kind)
      ? picks.filter((id) => slotOfKind(buildKindOf(id)) !== slotOfKind(card.kind))
      : picks.filter((id) => id !== whole);
    this.commit([...rest, nextIdFor(card, rest)]);
  }

  // A bonus that goes with a civic or a unique (CONTRACTS 31): the click takes that card instead.
  takeGoesWith(card) {
    const target = cardFor(this.byId, card.goesWith);
    if (target) this.take(target);
  }

  // Whether a click on this card would put it in a slot now (free slot, or a whole card it replaces).
  goesIn(card) {
    const picks = this.picks();
    const why = cantTake(card, picks, this.counts);
    return !why || (why === "full" && !!wholePickInGroup(card, picks));
  }

  // The first card taken while Leader shuffle is on Base game sets it to Split random, the preset whose slots this
  // screen fills, so the picks are used.
  // Only the preset is written, the way its dropdown writes it; the preset watch fills in the three parts.
  turnShuffleOn() {
    setParam(PARAM.Mode, MODE.SplitRandom);
    syncPresets();
    this.hint = null;
    this.load();
    this.flash("LOC_LSHUF_BUILD_MODE_TURNED_ON");
  }

  drop(id) {
    if (this.note) return;
    this.commit(this.picks().filter((p) => p !== id));
  }

  clear() {
    if (this.note) return;
    this.commit([]);
  }

  // Only this page's cards change; the other page's picks ride along untouched.
  commit(ids) {
    const others = otherPagePicks(readPicks(this.slot), this.byId);
    writePicks([...others, ...ids], this.slot);
    this.revision = readRevision();
    this.refresh();
  }

  // --- drawing ---

  render() {
    this.Root.classList.add("fullscreen", "flex", "items-center", "justify-center");
    const frame = el("fxs-frame", "lshuf-build__frame");
    frame.setAttribute("title", pageOf(this.scope).title);
    this.head = el("div", "lshuf-build__head px-6");
    this.settingsBox = el("div", "lshuf-build__settings px-6");
    this.slotsBox = el("div", "lshuf-build__slots px-6");
    this.needsBox = el("div", "lshuf-build__needs font-body text-sm px-6");
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
    done.addEventListener("action-activate", () => this.done());
    footer.append(clear, done);
    const closeX = el("fxs-close-button");
    closeX.addEventListener("action-activate", () => this.close());
    frame.append(this.head, this.settingsBox, this.slotsBox, this.needsBox, this.toolbar, this.noteBox, body, footer,
      closeX);
    this.Root.appendChild(frame);
    this.load();
    // The settings, in a box that says what they are: the shuffle for the whole game, AI players included, which
    // needs no build. The page's mode shows; Advanced opens the rest (owner, 2026-11-10). Above it, your own line
    // (CONTRACTS 33): Follow the AI players' settings, and your own mode for this page. Unticked, the box below is
    // the AI players' shuffle and says so.
    this.settingsPanel = this.buildSettings();
    const yours = this.buildYours();
    const shuffle = el("div", "lshuf-build__shuffle-box");
    this.shuffleTitle = el("div", "lshuf-build__shuffle-title font-title text-sm uppercase text-secondary");
    this.shuffleNote = el("div", "lshuf-build__shuffle-note font-body text-xs text-accent-2");
    shuffle.append(this.shuffleTitle, this.shuffleNote, this.settingsPanel);
    this.syncShuffleText();
    this.settingsBox.append(yours, shuffle);
    this.toolbar.appendChild(renderToolbar(this));
    this.refresh();
  }

  // The shared context of the settings controls: host only, and a change redraws the window.
  settingsContext() {
    return {
      locked: () => !isLocalHost(),
      changed: () => {
        this.revision = readRevision();
        this.load();
        this.refresh();
      }
    };
  }

  // Your own line (CONTRACTS 33): the Follow the AI players' settings box, and your own Leader mode (leader page) or
  // Civilization mode (civilization page). Picking your own mode unticks the box; ticking it puts you back on the AI
  // players' settings and leaves your modes as they were.
  buildYours() {
    const ctx = this.settingsContext();
    const own = {
      locked: ctx.locked,
      changed: () => {
        if (humanFollows()) setParam(PARAM.HumanFollows, false);
        ctx.changed();
      }
    };
    const follows = checkboxRow(PARAM.HumanFollows, ...opt("HUMAN_FOLLOWS"), ctx);
    const mine = this.scope === "civ" ? dropdownRow(PARAM.HumanCivMode, ...opt("HUMAN_CIV_MODE"), own)
      : dropdownRow(PARAM.HumanMode, ...opt("HUMAN_MODE"), own);
    const row = el("div", "lshuf-build__yours lshuf-build__settings-row flex flex-row flex-wrap items-center");
    row.append(follows.el, mine.el);
    this.yourControls = [follows, mine];
    return row;
  }

  // The shuffle box's title and line: for everyone while you follow the AI players' settings, else for the AI.
  syncShuffleText() {
    if (!this.shuffleTitle) return;
    const follows = humanFollows();
    const civ = this.scope === "civ";
    this.shuffleTitle.setAttribute("data-l10n-id", follows ? "LOC_LSHUF_BUILD_SHUFFLE_TITLE" : "LOC_LSHUF_BUILD_SHUFFLE_TITLE_AI");
    const note = civ ? "LOC_LSHUF_BUILD_SHUFFLE_NOTE_CIV" : "LOC_LSHUF_BUILD_SHUFFLE_NOTE";
    this.shuffleNote.setAttribute("data-l10n-id", follows ? note : `${note}_AI`);
  }

  // The settings that decide whether a build counts, right here so the player can turn the shuffle on without
  // leaving: the leader screen gets the leader settings, the civ screen the start terrain switch and its pool.
  buildSettings() {
    const ctx = this.settingsContext();
    // One line: this page's mode (CONTRACTS 32), the Advanced button and the pool. Advanced opens the rows the mode
    // sets and the rest; it stays open or closed across both pages.
    const main = el("div", "lshuf-build__settings-row flex flex-row flex-wrap items-center");
    const mode = this.scope === "civ" ? dropdownRow(PARAM.CivMode, ...opt("CIV_MODE"), ctx)
      : dropdownRow(PARAM.Mode, ...opt("MODE"), ctx);
    const rows = this.scope === "civ" ? [
      dropdownRow(START_AGE_PARAM, "LOC_AGE_NAME", "LOC_AGE_DESCRIPTION", ctx),
      dropdownRow(PARAM.CivAbilities, ...opt("CIV_ABILITIES"), ctx),
      dropdownRow(PARAM.CivUniques, ...opt("CIV_UNIQUES"), ctx),
      dropdownRow(PARAM.CivCivics, ...opt("CIV_CIVICS"), ctx),
      dropdownRow(PARAM.Biases, ...opt("BIASES"), ctx),
      checkboxRow(PARAM.KeepMine, ...opt("KEEP_MINE"), ctx),
      checkboxRow(PARAM.KeepBuiltCiv, ...opt("KEEP_BUILT_CIV"), ctx)
    ] : [
      dropdownRow(PARAM.Abilities, ...opt("ABILITIES"), ctx),
      dropdownRow(PARAM.Attributes, ...opt("ATTRIBUTES"), ctx),
      dropdownRow(PARAM.Biases, ...opt("BIASES"), ctx),
      dropdownRow(PARAM.Personality, ...opt("PERSONALITY"), ctx),
      checkboxRow(PARAM.KeepMine, ...opt("KEEP_MINE"), ctx),
      checkboxRow(PARAM.KeepBuiltCiv, ...opt("KEEP_BUILT_CIV"), ctx)
    ];
    const panel = el("div", "lshuf-build__settings-row lshuf-build__advanced flex flex-row flex-wrap items-center");
    for (const r of rows) panel.appendChild(r.el);
    const advanced = el("fxs-button", "m-1");
    const showAdvanced = () => {
      panel.style.display = advancedOpen ? "" : "none";
      advanced.setAttribute("caption", advancedOpen ? "LOC_LSHUF_BUILD_ADVANCED_HIDE" : "LOC_LSHUF_BUILD_ADVANCED_SHOW");
    };
    advanced.addEventListener("action-activate", () => {
      advancedOpen = !advancedOpen;
      showAdvanced();
    });
    const pool = el("fxs-button", "m-1");
    pool.setAttribute("caption", this.scope === "civ" ? "LOC_LSHUF_BTN_CIVS" : "LOC_LSHUF_BTN_POOLS");
    pool.addEventListener("action-activate", () => openSetupWindow(this.scope === "civ" ? "civs" : "pools"));
    main.append(mode.el, advanced, pool);
    showAdvanced();
    const box = el("div", "lshuf-build__settings flex flex-col");
    box.append(main, panel);
    this.settingControls = [mode, ...rows];
    return box;
  }

  // Whole cards or single pieces, from the settings as they stand now.
  syncShown() {
    Object.assign(this.filters, cardsShown(this.scope, readOptions(),
      { leaderWhole: A_MODE.Whole, civAbilitySplit: CA_MODE.Split, civCivicsSplit: CC_MODE.Split }));
  }

  refresh() {
    try {
      this.syncShown();
      for (const c of [...(this.yourControls || []), ...(this.settingControls || [])]) c.sync();
      this.syncShuffleText();
      this.syncCivicSlots();
      this.drawHead();
      if (!this.flashing) this.showNote();
      this.slotsBox.innerHTML = "";
      this.uniquesAdd = this.scope === "civ" && uniquesStayOwn(readOptions().CivUniques);
      if (this.counts) this.slotsBox.appendChild(renderSlots(this, this.picks()));
      this.drawNeeds();
      this.grid.innerHTML = "";
      this.grid.classList.toggle("lshuf-build__grid--off", !!this.note);
      this.grid.appendChild(renderGrid(this, this.picks()));
      this.showDetails(this.detailCard || null);
    } catch (e) {
      log(`refresh failed: ${e}`);
    }
  }

  // The link row across the top: the two pages, the one on screen marked. A click draws the other in place.
  drawLinks() {
    const row = el("div", "lshuf-build__pages flex flex-row items-center mb-2");
    for (const page of BUILD_PAGES) {
      const on = page.scope === this.scope;
      const tab = el("div", `lshuf-build__page font-title text-sm uppercase${on ? " lshuf-build__page--on" : ""}`, page.key);
      tab.setAttribute("data-page", page.scope);
      if (!on) tab.addEventListener("click", () => this.setPage(page.scope));
      row.appendChild(tab);
    }
    return row;
  }

  drawHead() {
    this.head.innerHTML = "";
    this.head.appendChild(this.drawLinks());
    const row = el("div", "flex flex-row items-center");
    const portrait = el("div", "lshuf-build__portrait");
    const text = el("div", "flex flex-col ml-4");
    const titleRow = el("div", "flex flex-row items-center");
    const title = el("div", "font-title text-xl uppercase text-secondary");
    const help = el("div", "lshuf-build__help font-title text-sm ml-2");
    help.textContent = "?";
    const [art, titleText, introKey] = this.scope === "civ" ? this.civHead(portrait) : this.leaderHead();
    portrait.style.backgroundImage = art;
    title.textContent = titleText;
    help.setAttribute("data-tooltip-content", compose(introKey));
    titleRow.append(title, help);
    text.appendChild(titleRow);
    text.appendChild(hostPicker(this.scope, () => {
      this.load();
      this.refresh();
    }));
    row.append(portrait, text);
    this.head.appendChild(row);
  }

  leaderHead() {
    const name = this.builder && this.leaderNames.get(this.builder) ? this.leaderNames.get(this.builder).name : "";
    const title = compose("LOC_LSHUF_BUILD_YOUR_LEADER", this.builder ? name : compose("LOC_LSHUF_BUILD_NONE_YET"));
    return [leaderPortrait(this.builder), title, "LOC_LSHUF_BUILD_INTRO"];
  }

  civHead(portrait) {
    portrait.classList.add("lshuf-build__portrait--civ");
    const civName = this.civ && this.civNames.get(this.civ) ? this.civNames.get(this.civ).name : "";
    const title = compose("LOC_LSHUF_BUILD_YOUR_CIV", this.civ ? civName : compose("LOC_LSHUF_BUILD_NONE_YET"));
    return [this.civ ? civBackground(this.civ) : "", title, "LOC_LSHUF_BUILD_CIV_INTRO"];
  }

  showDetails(card) {
    this.detailCard = card;
    this.details.innerHTML = "";
    if (!card) {
      this.details.appendChild(el("div", "lshuf-build__details-empty font-body text-sm", "LOC_LSHUF_BUILD_DETAILS_EMPTY"));
      return;
    }
    const title = el("div", "font-title text-lg uppercase text-secondary");
    title.textContent = card.name;
    const from = el("div", "font-body text-sm text-accent-2 mb-2");
    const kindText = card.kindLine || compose(`LOC_LSHUF_BUILD_KIND_${card.kind.toUpperCase()}`);
    from.textContent = card.from ? `${kindText} · ${compose("LOC_LSHUF_BUILD_CARD_FROM", card.from)}` : kindText;
    const body = el("div", "font-body text-sm lshuf-build__details-text");
    body.innerHTML = Locale.stylize ? Locale.stylize(card.text || "") : card.text || "";
    this.details.append(title, from, body);
    if (card.kind === BUILD_KIND.CivCivics || card.kind === BUILD_KIND.CivCivic) {
      const view = el("fxs-button", "mt-3");
      view.setAttribute("caption", "LOC_LSHUF_BUILD_VIEW_TREE");
      view.addEventListener("action-activate", () => this.openTree(card));
      this.details.appendChild(view);
    }
    if (!card.reviewed) {
      const warn = el("div", "font-body text-sm lshuf-build__warn mt-2");
      warn.textContent = compose("LOC_LSHUF_BUILD_CARD_UNREVIEWED");
      this.details.appendChild(warn);
    }
  }

  // A civics tree on its own layer over the cards, opened from the details pane. The cards and the details keep
  // their layout underneath, so nothing moves under the pointer (a hover that resized the grid flipped it back and
  // forth). Take or put back the card here (the tree, or from a civic card that one civic, drawn highlighted); Close,
  // Escape or another tree replaces it.
  openTree(card) {
    this.closeTree();
    const tree = renderCivicsTree(card.civ, card.tree || card.name, card.node || null);
    if (!tree) return;
    const layer = el("div", "lshuf-build__tree-layer flex flex-col");
    const bar = el("div", "lshuf-build__tree-bar flex flex-row items-center");
    const take = el("fxs-button", "mr-3");
    const civic = card.kind === BUILD_KIND.CivCivic;
    const syncTake = () => {
      const taken = cantTake(card, this.picks(), this.counts) === "taken";
      const key = `LOC_LSHUF_BUILD_${civic ? "CIVIC" : "TREE"}_${taken ? "PUT_BACK" : "TAKE"}`;
      take.setAttribute("caption", key);
      take.classList.toggle("hidden", !!this.note);
    };
    take.addEventListener("action-activate", () => {
      this.take(card);
      syncTake();
    });
    const close = el("fxs-button");
    close.setAttribute("caption", "LOC_LSHUF_BUILD_TREE_CLOSE");
    close.addEventListener("action-activate", () => this.closeTree());
    bar.append(this.treeCivPicker(card), take, close);
    const scroll = el("fxs-scrollable", "lshuf-build__tree-scroll flex-auto");
    scroll.setAttribute("handle-gamepad-pan", "true");
    scroll.appendChild(tree);
    layer.append(bar, scroll);
    this.body.appendChild(layer);
    this.treeLayer = layer;
    syncTake();
  }

  // The tree view's civilization dropdown: every civilization with a civics tree card on this screen (another age's
  // too), by name. Picking one shows its whole tree, with Take this tree for that civilization's tree card.
  treeCivPicker(card) {
    const trees = this.cards.filter((c) => c.kind === BUILD_KIND.CivCivics)
      .sort((a, b) => String(a.from).localeCompare(String(b.from)));
    const items = trees.map((c) => ({ value: c.id, label: c.otherAge ? `${c.from} (${c.otherAge})` : c.from }));
    const at = Math.max(0, trees.findIndex((c) => c.civ === card.civ));
    const box = el("div", "flex flex-row items-center flex-auto");
    const label = el("div", "font-body text-sm mr-3", "LOC_LSHUF_BUILD_TREE_CIV");
    const pick = dropdown(items, (id) => {
      const next = trees.find((c) => c.id === id);
      if (next && next.civ !== card.civ) this.openTree(next);
    }, "lshuf-build__tree-civ", at);
    box.append(label, pick);
    return box;
  }

  closeTree() {
    if (!this.treeLayer) return false;
    this.treeLayer.remove();
    this.treeLayer = null;
    return true;
  }

  showNote() {
    const shown = this.note || this.hint;
    this.noteBox.textContent = shown ? compose(shown) : "";
    this.noteBox.style.display = shown ? "" : "none";
  }

  // A short message in the note line; a redraw meanwhile leaves it up.
  flash(key, ...args) {
    this.noteBox.textContent = compose(key, ...args);
    this.noteBox.style.display = "";
    clearTimeout(this.flashing);
    this.flashing = setTimeout(() => {
      this.flashing = 0;
      this.showNote();
    }, 2400);
  }
}

Controls.define(BUILD_WINDOW_TAG, {
  createInstance: LShufBuildWindow,
  description: "Uncharted Leaders & Civs: build your own leader or civilization",
  classNames: [BUILD_WINDOW_TAG],
  styles: [`fs://game/${MOD_ID}/ui/setup/lshuf-setup.css`, `fs://game/${MOD_ID}/ui/setup/lshuf-build.css`],
  initializeImmediately: true
});

// Opens on your own leader ("leader") or civilization ("civ") page.
// Whether the build window's Advanced settings are open (CONTRACTS 32): kept across pages and openings.
let advancedOpen = false;

export function openBuildWindow(scope = "leader") {
  nextScope = scope;
  ContextManager.push(BUILD_WINDOW_TAG, { singleton: true, createMouseGuard: true });
}

export { SLOT_BASE, TAG_EQUIPPED };
