// Probe 8: rewrite Amina's ability row and add an attribute tag in the config database, from a game-scope script.
(function () {
  const r = { loadedAt: Date.now(), loadingStateAtLoad: null, updates: [], readBack: null, errors: [] };
  globalThis.__lshufProbe = r;
  try { r.loadingStateAtLoad = UI.getGameLoadingState(); } catch (e) { r.errors.push("state: " + e); }
  const q = (sql) => {
    try { const out = Database.query("config", sql); r.updates.push({ sql, out: out === undefined ? "undefined" : out }); }
    catch (e) { r.errors.push(sql + " -> " + e); }
  };
  q("UPDATE LeaderItems SET Description = 'LOC_TRAIT_LSHUF_PROBE_AMINA_DESCRIPTION' "
    + "WHERE LeaderType = 'LEADER_AMINA' AND Kind = 'KIND_TRAIT'");
  q("INSERT INTO LeaderTags (LeaderDomain, LeaderType, TagType) VALUES ('StandardLeaders', 'LEADER_AMINA', 'TAG_TRAIT_SCIENTIFIC')");
  try {
    r.readBack = {
      item: Database.query("config", "SELECT Description FROM LeaderItems WHERE LeaderType = 'LEADER_AMINA' AND Kind = 'KIND_TRAIT'"),
      tags: Database.query("config", "SELECT TagType FROM LeaderTags WHERE LeaderType = 'LEADER_AMINA'"),
    };
  } catch (e) { r.errors.push("readBack: " + e); }
  console.warn("[lshuf-probe] game script ran: " + JSON.stringify(r));
})();
