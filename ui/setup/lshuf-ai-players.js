// The AI players window (CONTRACTS 28): who the AI players are, for a game of any size. One compact row per AI
// player in player order: "AI 1", its leader portrait and civilization art when set, and a Leader and a Civilization
// dropdown. Each dropdown starts with Random, which draws from the Leader pool and the Civilization pool when the
// game starts, then the leaders or civilizations the game allows that slot. It writes the same player settings the
// game's own player rows write (PlayerLeader, PlayerCivilization). Nothing is built here: the AI players get the
// shuffle settings and the pools. A page of the setup window (lshuf-setup-window.js, "aiplayers").

import { el, compose } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-controls.js";
import { readSlots, PLAIN_RANDOM } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-setup-config.js";
import { hostPicker } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-pick.js";
import { civBackground, leaderPortrait } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-art.js";
import { aiRows } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/setup/lshuf-build-layout.js";

const log = (msg) => console.warn(`[lshuf-setup] ${msg}`);
const real = (value) => (value && value !== PLAIN_RANDOM ? value : null);

function localId() {
  try {
    return GameContext.localPlayerID;
  } catch (_) {
    return -1;
  }
}

function nameOf(table, column, type) {
  try {
    const rows = Database.query("config", `SELECT ${column} AS Name FROM ${table} WHERE ${table.slice(0, -1)}Type = '${
      String(type).replace(/'/g, "''")}' LIMIT 1`) || [];
    return rows.length ? compose(rows[0].Name) : type;
  } catch (_) {
    return type;
  }
}
const leaderName = (t) => (real(t) ? nameOf("Leaders", "LeaderName", t) : compose("LOC_LSHUF_BUILD_RANDOM"));
const civName = (t) => (real(t) ? nameOf("Civilizations", "CivilizationName", t) : compose("LOC_LSHUF_BUILD_RANDOM"));

function row(r, ctx, redraw) {
  const box = el("div", "lshuf-ai-players__row flex flex-row items-center");
  box.setAttribute("data-player", String(r.id));
  const label = el("div", "lshuf-ai-players__label font-title text-base uppercase text-secondary");
  label.textContent = compose("LOC_LSHUF_AI_PLAYER_N", r.n);
  const portrait = el("div", "lshuf-ai-players__portrait");
  portrait.style.backgroundImage = real(r.leader) ? leaderPortrait(r.leader) : "";
  const civArt = el("div", "lshuf-ai-players__civ");
  civArt.style.backgroundImage = real(r.civ) ? civBackground(r.civ) : "";
  box.append(label, portrait, civArt);
  if (ctx.locked()) {
    // Not the host: the picks as they stand, to read.
    const text = el("div", "font-body text-sm ml-3");
    text.textContent = `${leaderName(r.leader)} · ${civName(r.civ)}`;
    box.appendChild(text);
    return box;
  }
  const picks = el("div", "lshuf-ai-players__picks flex flex-row items-center flex-auto");
  picks.append(
    hostPicker("leader", redraw, { playerId: r.id, allowRandom: true }),
    hostPicker("civ", redraw, { playerId: r.id, allowRandom: true })
  );
  box.appendChild(picks);
  return box;
}

// Fills the window's list: the note with the two pool buttons, then the rows. `open(page)` opens another setup
// window. Returns its controls ({ el, sync }); sync draws the rows again only when a slot's leader or civilization
// changed, and after the dropdown that changed it has finished its own event.
export function buildAiPlayers(win, list, ctx, open) {
  const head = el("div", "lshuf-ai-players__head flex flex-row flex-wrap items-center");
  head.appendChild(el("div", "lshuf-ai-players__note font-body text-sm text-accent-2", "LOC_LSHUF_AI_PLAYERS_NOTE"));
  for (const [page, caption] of [["pools", "LOC_LSHUF_BTN_POOLS"], ["civs", "LOC_LSHUF_BTN_CIVS"]]) {
    const btn = el("fxs-button", "m-1");
    btn.setAttribute("caption", caption);
    btn.addEventListener("action-activate", () => open(page));
    head.appendChild(btn);
  }
  const rows = el("div", "lshuf-ai-players__rows");
  list.append(head, rows);
  let drawn = null;
  let pending = 0;
  const draw = () => {
    pending = 0;
    try {
      const data = aiRows(readSlots(), localId());
      const sig = `${ctx.locked() ? "r" : "w"}|${data.map((r) => `${r.id}:${r.leader}:${r.civ}`).join(",")}`;
      if (sig === drawn) return;
      drawn = sig;
      rows.innerHTML = "";
      if (!data.length) rows.appendChild(el("div", "font-body text-base text-accent-2", "LOC_LSHUF_AI_PLAYERS_NONE"));
      for (const r of data) rows.appendChild(row(r, ctx, () => ctx.changed()));
    } catch (e) {
      log(`AI players rows failed: ${e}`);
    }
  };
  const sync = () => {
    if (drawn == null) draw();
    else if (!pending) pending = setTimeout(draw, 0);
  };
  return [{ el: head, sync: () => {} }, { el: rows, sync }];
}
