"""Builds the lshuf-probe-window mod for probe 16 (SPEC.md section 7).

Run: python3 -I build-window-probe.py   (writes ./lshuf-probe-window/)

What's already recorded and not re-probed: our own window via Controls.define + ContextManager.push
(techniques: define-and-push-screen, with initializeImmediately), setup options gating data
(optional-data-by-setup-parameter), adding rows to the Advanced Options panel with a MutationObserver (Supercolors,
Workshop 3721924245). What this probes: a Hidden = 1 setup parameter set from script still gates data, and a button we
add to the Advanced Settings popup opens our window on top of the create-game screen.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "lshuf-probe-window")


def w(rel, text):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


w("data/setup-params.sql", """-- Probe 16: a hidden setup option, never drawn by the advanced screen.
INSERT INTO Parameters (ParameterID, Name, Description, Domain, Array, DefaultValue, ConfigurationGroup,
  ConfigurationKey, GroupID, Hidden, ReadOnly, SupportsSinglePlayer, SupportsLANMultiplayer, SupportsInternetMultiplayer,
  SupportsHotseatMultiplayer, SortIndex)
VALUES ('LShufP16Hidden', 'LOC_LSHUF_P16_HIDDEN', 'LOC_LSHUF_P16_HIDDEN', 'bool', 0, 0, 'Game', 'LShufP16Hidden',
  'GameOptions', 1, 0, 1, 1, 1, 1, 9000);
""")
w("text/setup-text.sql", "INSERT OR REPLACE INTO LocalizedText (Language, Tag, Text) VALUES "
  "('en_US', 'LOC_LSHUF_P16_HIDDEN', 'Probe: hidden option');\n")
w("data/hits-table.sql", "CREATE TABLE IF NOT EXISTS LShufProbeHits (Tag TEXT PRIMARY KEY NOT NULL);\n"
  "INSERT OR IGNORE INTO LShufProbeHits (Tag) VALUES ('ALWAYS');\n")
w("data/hit-hidden.sql", "INSERT OR IGNORE INTO LShufProbeHits (Tag) VALUES ('HIDDEN-ON');\n")

w("ui/lshuf-probe-window.js", r"""// Probe 16, shell scope: a button in the Advanced Settings popup that opens our own window.
import Panel from "/core/ui/panel-support.js";
import ContextManager from "/core/ui/context-manager/context-manager.js";

const log = (globalThis.__lshufWindow = { injected: 0, opened: 0, toggled: [], errors: [] });
const TAG = "lshuf-probe-window-screen";

class ProbeWindow extends Panel {
  onAttach() {
    super.onAttach();
    log.opened++;
    this.Root.classList.add("fullscreen", "flex", "items-center", "justify-center");
    const box = document.createElement("div");
    box.className = "lshuf-probe-window__box flex flex-col p-8";
    box.style.backgroundColor = "rgba(20,24,32,0.96)";
    box.style.minWidth = "40rem";
    const title = document.createElement("div");
    title.className = "font-title text-xl mb-4";
    title.textContent = "Re-dealable Leaders (probe window)";
    const toggle = document.createElement("fxs-checkbox");
    toggle.id = "lshuf-probe-window-toggle";
    const p = GameSetup.findGameParameter("LShufP16Hidden");
    if (p && p.value && p.value.value) toggle.setAttribute("selected", "true");
    toggle.addEventListener("component-value-changed", (e) => {
      const on = !!(e.detail && e.detail.value);
      const r = GameSetup.setGameParameterValue("LShufP16Hidden", on);
      log.toggled.push({ on, r, stored: Configuration.getGame().getValue("LShufP16Hidden") });
    });
    const label = document.createElement("div");
    label.textContent = "Probe: hidden option";
    const row = document.createElement("div");
    row.className = "flex flex-row items-center";
    row.append(toggle, label);
    const close = document.createElement("fxs-button");
    close.setAttribute("caption", "Close");
    close.addEventListener("action-activate", () => ContextManager.pop(TAG));
    box.append(title, row, close);
    this.Root.appendChild(box);
  }
}
Controls.define(TAG, { createInstance: ProbeWindow, description: "Leader Shuffle probe window", initializeImmediately: true });

globalThis.__lshufOpenWindow = () => ContextManager.push(TAG, { singleton: true, createMouseGuard: true });

// Add one button at the top of the Advanced Settings popup's list, each time the popup draws it.
function inject() {
  const first = document.querySelector(".accordian-header");
  if (!first) return;
  const list = first.closest(".accordian")?.parentElement;
  if (!list || list.querySelector(".lshuf-probe-window__open")) return;
  const btn = document.createElement("fxs-button");
  btn.classList.add("lshuf-probe-window__open", "m-2");
  btn.setAttribute("caption", "Re-dealable Leaders...");
  btn.addEventListener("action-activate", () => globalThis.__lshufOpenWindow());
  list.insertBefore(btn, list.firstChild);
  log.injected++;
}
new MutationObserver(() => { try { inject(); } catch (e) { log.errors.push(String(e)); } })
  .observe(document.body, { childList: true, subtree: true });
console.warn("[lshuf-probe-window] installed");
""")

w("lshuf-probe-window.modinfo", """<?xml version="1.0" encoding="utf-8"?>
<Mod id="lshuf-probe-window" version="1" xmlns="ModInfo">
\t<Properties>
\t\t<Name>Leader Shuffle probe: setup window</Name>
\t\t<Description>Probe 16 for the spec. Not for release.</Description>
\t\t<Authors>tower</Authors>
\t\t<Package>Mod</Package>
\t\t<AffectsSavedGames>1</AffectsSavedGames>
\t</Properties>
\t<Dependencies>
\t\t<Mod id="core" title="Core"/>
\t\t<Mod id="base-standard" title="LOC_MODULE_BASE_STANDARD_NAME"/>
\t</Dependencies>
\t<ActionCriteria>
\t\t<Criteria id="always"><AlwaysMet></AlwaysMet></Criteria>
\t\t<Criteria id="hidden-on"><ConfigurationValueMatches><Group>Game</Group><ConfigurationId>LShufP16Hidden</ConfigurationId><Value>1</Value></ConfigurationValueMatches></Criteria>
\t</ActionCriteria>
\t<ActionGroups>
\t\t<ActionGroup id="lshuf-probe-window-shell" scope="shell" criteria="always">
\t\t\t<Properties><LoadOrder>200</LoadOrder></Properties>
\t\t\t<Actions>
\t\t\t\t<UpdateDatabase><Item>data/setup-params.sql</Item></UpdateDatabase>
\t\t\t\t<UpdateText><Item>text/setup-text.sql</Item></UpdateText>
\t\t\t\t<UIScripts><Item>ui/lshuf-probe-window.js</Item></UIScripts>
\t\t\t</Actions>
\t\t</ActionGroup>
\t\t<ActionGroup id="lshuf-probe-window-game" scope="game" criteria="always">
\t\t\t<Properties><LoadOrder>100</LoadOrder></Properties>
\t\t\t<Actions><UpdateDatabase><Item>data/hits-table.sql</Item></UpdateDatabase></Actions>
\t\t</ActionGroup>
\t\t<ActionGroup id="lshuf-probe-window-hit" scope="game" criteria="hidden-on">
\t\t\t<Properties><LoadOrder>200</LoadOrder></Properties>
\t\t\t<Actions><UpdateDatabase><Item>data/hit-hidden.sql</Item></UpdateDatabase></Actions>
\t\t</ActionGroup>
\t</ActionGroups>
</Mod>
""")
print("wrote", OUT)
