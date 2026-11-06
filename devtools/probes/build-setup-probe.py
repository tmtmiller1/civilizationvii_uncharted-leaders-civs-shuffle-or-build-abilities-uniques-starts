"""Builds the lshuf-probe-setup mod for probes 14 and 15 (SPEC.md section 7).

Run: python3 -I build-setup-probe.py   (writes ./lshuf-probe-setup/)

Probe 14: the probe's options sit in their own ParameterGroups section; a shell script closes our section and our
lists once each time the advanced screen draws them, by activating their headers.
Probe 15: a "Leader pool 1" list and a "Random from pool 1" leader choice; on the window's startCampaign event (sent
just before engine.call("startGame") by both setup screens) the shell script gives each pool slot a leader from the pool.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "lshuf-probe-setup")
GROUP = "LShufProbeGroup"


def w(rel, text):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def param(pid, name, domain, key, sort, array=1, default="NULL", hint="'InvertSelection'"):
    return (f"INSERT INTO Parameters (ParameterID, Name, Description, Domain, Array, DefaultValue, ConfigurationGroup, "
            f"ConfigurationKey, GroupID, Hidden, ReadOnly, SupportsSinglePlayer, SupportsLANMultiplayer, "
            f"SupportsInternetMultiplayer, SupportsHotseatMultiplayer, UxHint, SortIndex) VALUES ('{pid}', '{name}', "
            f"'{name}_DESC', '{domain}', {array}, {default}, 'Game', '{key}', '{GROUP}', 0, 0, 1, 1, 1, 1, "
            f"{hint}, {sort});\n")


setup = "-- Probes 14 and 15.\n"
setup += f"INSERT INTO ParameterGroups (GroupID, Name) VALUES ('{GROUP}', 'LOC_LSHUF_P14_GROUP');\n"
setup += param("LShufP14LeadersIn", "LOC_LSHUF_P14_LEADERS", "LShufP14Leaders", "LShufP14ExcludedLeaders", 5000)
setup += param("LShufP15Pool1", "LOC_LSHUF_P15_POOL1", "LShufP14Leaders", "LShufP15Pool1", 5010, hint="NULL")
setup += ("INSERT INTO DomainValues (Domain, Value, Name, Description, SortIndex) SELECT 'LShufP14Leaders', "
          "LeaderType, LeaderName, LeaderName, 100 FROM Leaders WHERE Domain = 'StandardLeaders' AND "
          "LeaderType LIKE 'LEADER_%';\n")
setup += ("INSERT INTO DomainValues (Domain, Value, Name, Description, Icon, SortIndex) VALUES ('StandardLeaders', "
          "'LSHUF_RANDOM_POOL_1', 'LOC_LSHUF_P15_RANDOM_POOL_1', 'LOC_LSHUF_P15_RANDOM_POOL_1', 'LEADER_RANDOM', -999);\n")
w("data/setup-params.sql", setup)

text = ""
for tag, s in [("LOC_LSHUF_P14_GROUP", "Probe: Re-dealable Leaders"),
               ("LOC_LSHUF_P14_LEADERS", "Probe: leaders to re-deal"),
               ("LOC_LSHUF_P15_POOL1", "Probe: leader pool 1"),
               ("LOC_LSHUF_P15_RANDOM_POOL_1", "Random from pool 1")]:
    for t in (tag, tag + "_DESC"):
        text += f"INSERT OR REPLACE INTO LocalizedText (Language, Tag, Text) VALUES ('en_US', '{t}', '{s}');\n"
w("text/setup-text.sql", text)

w("ui/lshuf-probe-setup.js", r"""// Probes 14 and 15, shell scope.
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
""")

w("lshuf-probe-setup.modinfo", """<?xml version="1.0" encoding="utf-8"?>
<Mod id="lshuf-probe-setup" version="1" xmlns="ModInfo">
\t<Properties>
\t\t<Name>Leader Shuffle probe: setup screen</Name>
\t\t<Description>Probes 14 and 15 for the spec. Not for release.</Description>
\t\t<Authors>tower</Authors>
\t\t<Package>Mod</Package>
\t\t<AffectsSavedGames>0</AffectsSavedGames>
\t</Properties>
\t<Dependencies>
\t\t<Mod id="core" title="Core"/>
\t\t<Mod id="base-standard" title="LOC_MODULE_BASE_STANDARD_NAME"/>
\t</Dependencies>
\t<ActionCriteria>
\t\t<Criteria id="always"><AlwaysMet></AlwaysMet></Criteria>
\t</ActionCriteria>
\t<ActionGroups>
\t\t<ActionGroup id="lshuf-probe-setup-shell" scope="shell" criteria="always">
\t\t\t<Properties><LoadOrder>200</LoadOrder></Properties>
\t\t\t<Actions>
\t\t\t\t<UpdateDatabase><Item>data/setup-params.sql</Item></UpdateDatabase>
\t\t\t\t<UpdateText><Item>text/setup-text.sql</Item></UpdateText>
\t\t\t\t<UIScripts><Item>ui/lshuf-probe-setup.js</Item></UIScripts>
\t\t\t</Actions>
\t\t</ActionGroup>
\t</ActionGroups>
</Mod>
""")
print("wrote", OUT)
