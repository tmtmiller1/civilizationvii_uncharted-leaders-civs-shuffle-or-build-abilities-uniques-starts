// The "Build your own leader..." button on the leader select screen (a bar like the Select bar, placed directly
// above it; the panel grows and the list above scrolls) and the "Build your own civilization..."
// button on the civilization select screen (in its filter row, before the count and the filters). Both screens are
// Solid components that redraw as the player picks, so the shell observer's sweep adds a button again whenever it's
// gone. The same sweep keeps a Leader pool icon after Random on the leader grid and a Civilization pool icon after
// the civilization select's Random button. The multiplayer lobby has neither screen, so both buttons sit in its
// bottom row next to Mementos, the game's own "pick for your slot" button there.

import { openBuildWindow } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-window.js";
import { compose, el } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-controls.js";
import { openSetupWindow } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-window.js";
import { paramChoices, paramValues } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-params.js";
import { PARAM, hasLeaderBuild } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";
import { readPicks } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-cards.js";
import { poolBadge } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-layout.js";

const inGame = () => {
  try {
    return !!UI.isInGame();
  } catch (_) {
    return false;
  }
};

// The band that holds the Select button, at the bottom of the leaders panel.
const SELECT_BAR = ".leader-select-leaders-panel .leader-select-decoration-bar";
// The civ select's top row: a flex-auto spacer, then the count and the filters.
const CIV_BODY = ".civ-age-select-body";
// The lobby's bottom button row, which holds Rules and Mementos.
const LOBBY_ROW = ".mp-staging__bot-section2";
const LOBBY_MEMENTOS = ".memento-button";
const LEADER_CLASS = "lshuf-build__open";
const CIV_CLASS = "lshuf-build__open-civ";
const LOBBY_CLASS = "lshuf-build__open-lobby";

const log = (msg) => console.warn(`[lshuf-setup] ${msg}`);

function button(scope, caption, cls) {
  const btn = el("fxs-button", cls);
  btn.setAttribute("caption", caption);
  btn.setAttribute("data-audio-group-ref", "options");
  btn.addEventListener("action-activate", () => {
    try {
      openBuildWindow(scope);
    } catch (e) {
      log(`open build window (${scope}) failed: ${e}`);
    }
  });
  return btn;
}

// A bar like the Select bar, built from plain elements with the game's own classes (the panel box, the corner and
// side filigree, the hero button's frame, centerpiece and hover gradient) so it looks the same but carries none of
// the game's button code: a copy of the real bar kept its Activatable behavior and moved the flow on.
const HERO_CLASSES = "hero-button-2 relative flex flex-col h-13 justify-center font-title uppercase text-base "
  + "text-accent-1 tracking-150 mt-4 text-shadow pointer-events-auto flex-auto min-w-auto group";

function heroButton(caption) {
  const btn = el("div", HERO_CLASSES);
  btn.appendChild(el("div", "absolute inset-0 opacity-0 hero-button-2-gradient group-hover\\:opacity-100"));
  const frame = el("div", "absolute inset-0 flex flex-row");
  frame.append(el("div", "flex-1 hero-button-2-sideframe"), el("div", "flex-1 hero-button-2-sideframe -rotate-y-180"));
  const centre = el("div", "absolute inset-0 flex justify-center");
  centre.appendChild(el("div", "hero-button-2-centerpiece"));
  frame.appendChild(centre);
  const label = el("div", "relative flex flex-row py-3 px-7 justify-center items-center");
  const text = el("div", "font-fit-shrink");
  text.textContent = compose(caption);
  label.appendChild(text);
  btn.append(frame, label);
  return btn;
}

function selectLikeBar(caption, onClick) {
  const bar = el("div", `leader-select-decoration-bar ${LEADER_CLASS}`);
  const box = el("div", "img-unit-panelbox mt-3 mb-4 mx-4 pt-3 pb-4 relative flex flex-row justify-center items-center");
  for (const corner of ["top-left", "top-right", "bottom-left", "bottom-right"]) {
    box.appendChild(el("div", `leader-select-corner-filigree ${corner}`));
  }
  const btn = heroButton(caption);
  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    onClick();
  });
  box.append(el("div", "filigree-h4-left mt-3"), btn, el("div", "filigree-h4-right mt-3"));
  bar.appendChild(box);
  return bar;
}

function injectLeaderButton() {
  for (const bar of document.querySelectorAll(SELECT_BAR)) {
    if (bar.classList.contains(LEADER_CLASS)) continue;
    const panel = bar.parentElement;
    if (!panel || panel.querySelector(`.${LEADER_CLASS}`)) continue;
    const ours = selectLikeBar("LOC_LSHUF_BTN_BUILD", () => {
      try {
        openBuildWindow("leader");
      } catch (e) {
        log(`open build window (leader) failed: ${e}`);
      }
    });
    panel.insertBefore(ours, bar);
  }
}

// The civ select's top row holds the search box, an empty flex-auto spacer, then the count and the filters. The
// button goes right after the spacer, so it sits at the right with the filters and clear of the search box.
function civSpacer(body) {
  for (const row of body.querySelectorAll("div.flex-row")) {
    for (const child of row.children) {
      if (child.classList.contains("flex-auto") && child.children.length === 0 && !child.textContent.trim()) return child;
    }
  }
  return null;
}

function injectCivButton() {
  for (const body of document.querySelectorAll(CIV_BODY)) {
    if (body.querySelector(`.${CIV_CLASS}`)) continue;
    const spacer = civSpacer(body);
    if (!spacer) continue;
    const box = el("div", `${CIV_CLASS} flex flex-row items-center mr-4`);
    box.appendChild(button("civ", "LOC_LSHUF_BTN_BUILD_CIV", ""));
    spacer.parentElement.insertBefore(box, spacer.nextSibling);
  }
}

// The lobby: both buttons after Mementos, styled like it (mt-3, a left margin), so the row reads Rules, Mementos,
// Build your own leader..., Build your own civilization....
function injectLobbyButtons() {
  for (const row of document.querySelectorAll(LOBBY_ROW)) {
    if (row.querySelector(`.${LOBBY_CLASS}`)) continue;
    const after = row.querySelector(LOBBY_MEMENTOS);
    const leader = button("leader", "LOC_LSHUF_BTN_BUILD", `${LOBBY_CLASS} ml-3 mt-3`);
    const civ = button("civ", "LOC_LSHUF_BTN_BUILD_CIV", `${LOBBY_CLASS} ml-3 mt-3`);
    if (after && after.parentElement === row) {
      row.insertBefore(civ, after.nextSibling);
      row.insertBefore(leader, after.nextSibling);
    } else {
      row.append(leader, civ);
    }
  }
}

// The civilization details screen (the one a civ card opens, with its own Select at the bottom): a bar like that
// Select, right above it, so the flow reads Build your own civilization... then Select.
const DETAILS_SELECT = ".civ-details-continue-button";
const DETAILS_CLASS = "lshuf-build__open-civ-details";

function injectCivDetailsButton() {
  for (const select of document.querySelectorAll(DETAILS_SELECT)) {
    const row = select.parentElement;
    if (!row || !row.parentElement || row.previousElementSibling?.classList.contains(DETAILS_CLASS)) continue;
    const ours = el("div", `${DETAILS_CLASS} flex flex-row mt-4 items-center justify-center`);
    const btn = heroButton("LOC_LSHUF_BTN_BUILD_CIV");
    btn.classList.add("civ-details-continue-button-like");
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      try {
        openBuildWindow("civ");
      } catch (e) {
        log(`open build window (civ details) failed: ${e}`);
      }
    });
    ours.append(el("div", "filigree-h4-left mt-3"), btn, el("div", "filigree-h4-right mt-3"));
    row.parentElement.insertBefore(ours, row);
  }
}

// The pools' own icons, next to the game's Random: Random's shuffle icon with a badge. Neither is a leader or a
// civilization (a leader entry of ours crashed the leader select, CONTRACTS 27); each is a button that opens its
// pool's list. The badge reads "Pool", or how many are still ticked once some are off ("7/38").
const POOL_BUTTON_CLASS = "lshuf-pool-button";
const CIV_POOL_BUTTON_CLASS = "lshuf-civ-pool-button";
const POOL_BADGE_STYLE = "position:absolute;right:-0.3rem;bottom:0.9rem;padding:0 0.3rem;font-size:0.65rem;"
  + "line-height:1rem;text-transform:uppercase;color:#e5d2ac;background-color:rgba(18,21,31,0.95);"
  + "border:0.0555rem solid rgba(197,176,128,0.8);border-radius:0.2rem;pointer-events:none;";

const badgeText = (paramId) => poolBadge(paramChoices(paramId).length, paramValues(paramId).length,
  compose("LOC_LSHUF_POOL_BADGE"));

// A press on one of our icons, whichever way the game reports it (the activatable's own event, or a plain click),
// once per press.
function onPress(target, run) {
  let last = 0;
  const go = () => {
    const now = Date.now();
    if (now - last < 300) return;
    last = now;
    try {
      run();
    } catch (e) {
      log(`pool window failed to open: ${e}`);
    }
  };
  target.addEventListener("action-activate", go);
  target.addEventListener("click", go);
}

// A pool icon: the game's round button classes, a copy of Random's icon, our badge.
function makePoolIcon(icon, cls, tipKey, page) {
  const box = el("fxs-activatable", `leader-button-box flex items-center justify-center relative group ${cls}`);
  box.setAttribute("tabindex", "-1");
  box.setAttribute("data-tooltip-content", compose(tipKey));
  const focus = el("div", "absolute inset-0 flex items-center justify-center pointer-events-none");
  focus.appendChild(el("div", "leader-button-focus opacity-0 group-focus:opacity-100 group-hover:opacity-100"));
  const badge = el("div", "lshuf-pool-badge font-title");
  badge.setAttribute("style", POOL_BADGE_STYLE);
  box.append(focus, icon.cloneNode(true), badge);
  onPress(box, () => openSetupWindow(page));
  return box;
}

function syncBadge(btn, paramId) {
  const badge = btn.querySelector(".lshuf-pool-badge");
  const text = badgeText(paramId);
  if (badge && badge.textContent !== text) badge.textContent = text;
}

// The leader grid: right after its first button, Random.
function injectPoolButton() {
  for (const panel of document.querySelectorAll(".leader-select-leaders-panel")) {
    const first = [...panel.querySelectorAll(".leader-button-box")].find((b) => !b.classList.contains(POOL_BUTTON_CLASS));
    if (!first || !first.parentElement) continue;
    let btn = panel.querySelector(`.${POOL_BUTTON_CLASS}`);
    if (!btn) {
      const portrait = first.querySelector(".leader-button-portrait");
      if (!portrait) continue;
      btn = makePoolIcon(portrait, `-mx-2 ${POOL_BUTTON_CLASS}`, "LOC_LSHUF_POOL_TIP", "pools");
    }
    if (btn.previousElementSibling !== first) first.parentElement.insertBefore(btn, first.nextSibling);
    syncBadge(btn, PARAM.LeaderPoolOut);
  }
}

// The civilization select at game setup: its Random is the round shuffle button in the left column (not a card), so
// the pool icon goes right after that button. The Civilization pool applies when the game starts, so the icon stays
// off the same screen between ages.
function injectCivPoolButton() {
  if (inGame()) return;
  for (const body of document.querySelectorAll(CIV_BODY)) {
    const random = [...body.querySelectorAll(".civ-select-leader-button-base")]
      .find((b) => !b.classList.contains(CIV_POOL_BUTTON_CLASS));
    if (!random || !random.parentElement) continue;
    let btn = body.querySelector(`.${CIV_POOL_BUTTON_CLASS}`);
    if (!btn) {
      const icon = random.querySelector(".civ-select-leader-button-icon");
      if (!icon) continue;
      btn = makePoolIcon(icon, `civ-select-leader-button-base self-center ${CIV_POOL_BUTTON_CLASS}`,
        "LOC_LSHUF_CIV_POOL_TIP", "civs");
    }
    // Past any wrapper that holds only the Random button (its tooltip), so the icon is the next thing in the column.
    let anchor = random;
    while (anchor.parentElement && anchor.parentElement !== body && anchor.parentElement.children.length === 1) {
      anchor = anchor.parentElement;
    }
    if (btn.previousElementSibling !== anchor) anchor.parentElement.insertBefore(btn, anchor.nextSibling);
    syncBadge(btn, PARAM.CivsOut);
  }
}

// Once the host's picks hold a leader piece, a leader has been built and the game's own Select on the leader screen
// reads Continue, the word the game's next setup screens use (the owner, 2026-11-10).
// The innermost element of the game's Select button that carries its caption: the one whose own text is the caption.
function selectCaption(bar, captions) {
  for (const node of bar.querySelectorAll("*")) {
    if (node.children.length) continue;
    if (captions.includes((node.textContent || "").trim())) return node;
  }
  return null;
}

function syncSelectCaption() {
  let built = false;
  try {
    built = hasLeaderBuild(readPicks(1));
  } catch (_) {
    built = false;
  }
  const select = compose("LOC_GENERIC_SELECT");
  const next = compose("LOC_GENERIC_CONTINUE");
  const want = built ? next : select;
  for (const bar of document.querySelectorAll(SELECT_BAR)) {
    if (bar.classList.contains(LEADER_CLASS)) continue;
    const caption = selectCaption(bar, [select, next]);
    if (caption && caption.textContent.trim() !== want) caption.textContent = want;
  }
}

export function injectBuildButton() {
  syncSelectCaption();
  injectLeaderButton();
  injectCivButton();
  injectCivDetailsButton();
  injectLobbyButtons();
  injectPoolButton();
  injectCivPoolButton();
}
