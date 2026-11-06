// Probes 14 and 15, shell scope.
const log = (globalThis.__lshufSetup = { collapsed: [], pool: [], errors: [] });
const OURS = /^Probe: /;

// Probe 14: close our section and lists once each time the advanced screen draws them.
const seen = new WeakSet();
async function press(el) {
  const { InputEngineEvent } = await import("/core/ui/input/input-support.js");
  el.dispatchEvent(new InputEngineEvent("mousebutton-left", InputActionStatuses.START, 0, 0, false, true));
  el.dispatchEvent(new InputEngineEvent("mousebutton-left", InputActionStatuses.FINISH, 0, 0, false, true));
}
function sweep() {
  for (const header of document.querySelectorAll(".accordian-header")) {
    if (seen.has(header)) continue;
    const title = (header.textContent || "").trim();
    if (!OURS.test(title)) continue;
    seen.add(header);
    const acc = header.closest(".accordian");
    if (acc && acc.classList.contains("collapsed")) continue;
    press(header).then(() => log.collapsed.push(title)).catch((e) => log.errors.push("collapse: " + e));
  }
}
new MutationObserver(() => sweep()).observe(document.body, { childList: true, subtree: true });

// Probe 15: give each "Random from pool 1" slot a leader from the pool, before startGame.
function resolvePools() {
  try {
    const game = Configuration.getGame();
    const pool = [...(game.getValue("LShufP15Pool1") ?? [])];
    const seed = Number(game.gameSeed) >>> 0;
    const taken = new Set();
    for (let id = 0; id < 16; id++) {
      const p = Configuration.getPlayer(id);
      if (!p || p.leaderTypeName !== "LSHUF_RANDOM_POOL_1") continue;
      const free = pool.filter((l) => !taken.has(l));
      if (!free.length) { log.errors.push("pool empty for slot " + id); continue; }
      const pick = free[(seed + id * 2654435761) % free.length];
      taken.add(pick);
      const r = GameSetup.setPlayerParameterValue(id, "PlayerLeader", pick);
      log.pool.push({ slot: id, pick, r, after: Configuration.getPlayer(id).leaderTypeName });
    }
    Configuration.editGame().setValue("LShufP15Log", JSON.stringify(log.pool));
  } catch (e) {
    log.errors.push("pool: " + e);
  }
}
window.addEventListener("startCampaign", resolvePools);
console.warn("[lshuf-probe-setup] installed");
