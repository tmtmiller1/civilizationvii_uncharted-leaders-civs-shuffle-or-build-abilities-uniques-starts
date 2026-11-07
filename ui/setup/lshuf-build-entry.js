// The "Build your own leader..." button on the leader select screen (a bar like the Select bar, placed directly
// above it; the panel grows and the list above scrolls) and the "Build your own civilization..."
// button on the civilization select screen (in its filter row, before the count and the filters). Both screens are
// Solid components that redraw as the player picks, so the shell observer's sweep adds a button again whenever it's
// gone. The multiplayer lobby has neither screen, so both buttons sit in its bottom row next to Mementos, the
// game's own "pick for your slot" button there.

import { openBuildWindow } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-window.js";
import { compose, el } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-controls.js";

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

// A "pool" badge in the corner of the Random from the pool entry on the leader grid. The pool entry carries the
// same LEADER_RANDOM icon as Random and sorts right after it, so it's a later leader button whose portrait is the
// same image as the first button's (Random's). Styled inline: the grid is the game's own screen, which loads none
// of the mod's stylesheets.
const POOL_BADGE_CLASS = "lshuf-pool-badge";
const BADGE_STYLE = "position:absolute;right:-0.3rem;bottom:0.9rem;padding:0 0.3rem;font-size:0.65rem;line-height:1rem;"
  + "text-transform:uppercase;letter-spacing:0.05rem;color:#f0e2c0;background-color:rgba(10,8,6,0.85);"
  + "border:0.0555rem solid rgba(197,176,128,0.8);border-radius:0.2rem;pointer-events:none;";

function portraitImage(box) {
  const portrait = box.querySelector(".leader-button-portrait");
  return portrait ? String(portrait.style.backgroundImage || "") : "";
}

function injectPoolBadges() {
  for (const panel of document.querySelectorAll(".leader-select-leaders-panel")) {
    const boxes = [...panel.querySelectorAll(".leader-button-box")];
    if (boxes.length < 2) continue;
    const random = portraitImage(boxes[0]);
    if (!random) continue;
    for (const box of boxes.slice(1)) {
      if (portraitImage(box) !== random || box.querySelector(`.${POOL_BADGE_CLASS}`)) continue;
      const badge = el("div", `${POOL_BADGE_CLASS} font-title`);
      badge.setAttribute("style", BADGE_STYLE);
      badge.textContent = compose("LOC_LSHUF_POOL_BADGE");
      box.appendChild(badge);
    }
  }
}

export function injectBuildButton() {
  injectLeaderButton();
  injectCivButton();
  injectCivDetailsButton();
  injectLobbyButtons();
  injectPoolBadges();
}
