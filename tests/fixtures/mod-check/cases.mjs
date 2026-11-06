// Fixture modinfos and script files for workstream C's modded-leader check (SPEC section 3, "Modded leaders",
// check 1). Shaped like the listed MAO leader mods (read from Remilia Scarlet's files on tp-share, 2026-11-06) but
// with a made-up leader, so no mod's own file is copied here.

const BOM = "﻿";

const modinfo = (groups) => `<?xml version="1.0" encoding="utf-8"?>
<Mod id="FIXTURE-Leader-ZETA" version="1.0" xmlns="ModInfo">
  <Properties><Name>LOC_MODULE_ZETA_NAME</Name><Authors>Fixture</Authors><Package>Mod</Package></Properties>
  <Dependencies><Mod id="base-standard" title="LOC_MODULE_BASE_STANDARD_NAME"/></Dependencies>
  <ActionCriteria>
    <Criteria id="always"><AlwaysMet></AlwaysMet></Criteria>
    <Criteria id="antiquity-age-current"><AgeInUse>AGE_ANTIQUITY</AgeInUse></Criteria>
  </ActionCriteria>
  <ActionGroups>
${groups}
  </ActionGroups>
  <LocalizedText><File>text/en_us/ModuleText.xml</File></LocalizedText>
</Mod>
`;

const GAME_DATA = `    <ActionGroup id="game-ZETA" scope="game" criteria="always">
      <Actions>
        <ImportFiles>
          <Item>textures/portraits/fbl_ZETA.png</Item>
          <!-- extensionless copies, as the MAO mods ship -->
          <Item>textures/icons/leader/lp_circ_ZETA_256</Item>
          <Item>textures/icons/leader/lp_hex_ZETA_128.png</Item>
        </ImportFiles>
        <UpdateIcons><Item>config/ZETA-icons.xml</Item></UpdateIcons>
        <UpdateDatabase>
          <Item>data/ZETA_core/leaders.sql</Item>
          <Item>data/ZETA_core/leaders-gameeffects.xml</Item>
        </UpdateDatabase>
        <UpdateColors><Item>data/ZETA_core/leaders-color.sql</Item></UpdateColors>
        <UpdateText>
          <Item>text/en_us/leader/LeaderCore.xml</Item>
          <Item locale="zh_Hans_CN">text/zh_Hans_CN/leader/LeaderCore.xml</Item>
        </UpdateText>
      </Actions>
    </ActionGroup>
    <ActionGroup id="age-ZETA" scope="game" criteria="antiquity-age-current">
      <Actions><UpdateDatabase><Item>data/ZETA_civ/civilizations-antiquity.sql</Item></UpdateDatabase></Actions>
    </ActionGroup>`;

const SHELL = (extra = "") => `    <ActionGroup id="shell-ZETA" scope="shell" criteria="always">
      <Actions>
        <ImportFiles><Item>textures/portraits/fbl_ZETA.png</Item></ImportFiles>
        <UpdateDatabase><Item>config/ZETA-config.xml</Item></UpdateDatabase>
        <UpdateText><Item>text/en_us/ModuleText.xml</Item></UpdateText>
${extra}
      </Actions>
    </ActionGroup>`;

const UISCRIPT = (file) => `        <UIScripts><Item>${file}</Item></UIScripts>`;

// The portrait registration the listed mods share: the call, then the same call again once the engine is ready.
export const PORTRAIT_SCRIPT = `${BOM}window.CustomLeaderConfig.registerImageLeader("LEADER_ZETA","fs://game/FIXTURE-Leader-ZETA/textures/portraits/fbl_ZETA.png");

if (typeof engine !== "undefined" && engine.whenReady) {
\tengine.whenReady.then(() => {
\t\twindow.CustomLeaderConfig.registerImageLeader("LEADER_ZETA", "fs://game/FIXTURE-Leader-ZETA/textures/portraits/fbl_ZETA.png");
\t});
}
`;

export const PORTRAIT_SCRIPT_PLAIN = `// Portraits for Zeta.
CustomLeaderConfig.registerImageLeader("LEADER_ZETA", "fs://game/FIXTURE-Leader-ZETA/textures/portraits/fbl_ZETA.png");
CustomLeaderConfig.registerImageLeader('LEADER_ZETA_ALT', 'fs://game/FIXTURE-Leader-ZETA/textures/portraits/fbl_ZETA_ALT.png');
`;

// Portrait registration plus gameplay code keyed to the leader: fails.
export const SCRIPT_WITH_OTHER_CODE = `${PORTRAIT_SCRIPT_PLAIN}
engine.on("PlayerTurnActivated", (data) => {
  const player = Players.get(data.player);
  if (player && player.leaderType === Database.makeHash("LEADER_ZETA")) player.Treasury.changeGoldBalance(5);
});
`;

// Code smuggled inside the call's arguments: fails.
export const SCRIPT_CODE_IN_ARGUMENT = `CustomLeaderConfig.registerImageLeader("LEADER_ZETA", (() => { engine.on("TurnBegin", () => {}); return "x.png"; })());
`;

export const SCRIPT_LISTENER_ONLY = `window.addEventListener("load", () => console.log("zeta"));
`;

export const MODINFOS = {
  dataOnly: modinfo(`${GAME_DATA}\n${SHELL()}`),
  portraitOnly: modinfo(`${GAME_DATA}\n${SHELL(UISCRIPT("ui/leader-register.js"))}
    <ActionGroup id="fallback-ZETA" scope="game" criteria="always">
      <Actions>${UISCRIPT("ui/leader-register.js")}</Actions>
    </ActionGroup>`),
  portraitPlain: modinfo(`${GAME_DATA}\n${SHELL(UISCRIPT("ui/leader-register-plain.js"))}`),
  scriptsAction: modinfo(`${GAME_DATA}
    <ActionGroup id="script-ZETA" scope="game" criteria="always">
      <Actions><Scripts><Item>scripts/zeta-gameplay.js</Item></Scripts></Actions>
    </ActionGroup>\n${SHELL()}`),
  scenarioScripts: modinfo(`${GAME_DATA}
    <ActionGroup id="scenario-ZETA" scope="game" criteria="always">
      <Actions><ScenarioScripts><Item>scripts/zeta-scenario.js</Item></ScenarioScripts></Actions>
    </ActionGroup>\n${SHELL()}`),
  mapGenScripts: modinfo(`${GAME_DATA}
    <ActionGroup id="map-ZETA" scope="game" criteria="always">
      <Actions><MapGenScripts><Item>maps/zeta-map.js</Item></MapGenScripts></Actions>
    </ActionGroup>\n${SHELL()}`),
  uiShortcuts: modinfo(`${GAME_DATA}\n${SHELL("        <UIShortcuts><Item>ui/zeta-shortcut.html</Item></UIShortcuts>")}`),
  importJs: modinfo(`${GAME_DATA}\n${SHELL("        <ImportFiles><Item>ui/zeta-panel.js</Item></ImportFiles>")}`),
  uiScriptOtherCode: modinfo(`${GAME_DATA}\n${SHELL(UISCRIPT("ui/leader-register-plus.js"))}`),
  uiScriptSmuggled: modinfo(`${GAME_DATA}\n${SHELL(UISCRIPT("ui/leader-register-trick.js"))}`),
  uiScriptListener: modinfo(`${GAME_DATA}\n${SHELL(UISCRIPT("ui/zeta-listener.js"))}`),
  uiScriptUnreadable: modinfo(`${GAME_DATA}\n${SHELL(UISCRIPT("ui/not-there.js"))}`)
};

export const FILES = {
  "ui/leader-register.js": PORTRAIT_SCRIPT,
  "ui/leader-register-plain.js": PORTRAIT_SCRIPT_PLAIN,
  "ui/leader-register-plus.js": SCRIPT_WITH_OTHER_CODE,
  "ui/leader-register-trick.js": SCRIPT_CODE_IN_ARGUMENT,
  "ui/zeta-listener.js": SCRIPT_LISTENER_ONLY
};

// Expected outcome per modinfo: ok, and for a failure the REASON.ModdedNotOK text code (CONTRACTS 3) when the
// contract fixes it ("script", "uiscript", "importjs"); null means only ok = false is checked.
export const EXPECTED = {
  dataOnly: { ok: true },
  portraitOnly: { ok: true },
  portraitPlain: { ok: true },
  scriptsAction: { ok: false, why: "script" },
  scenarioScripts: { ok: false, why: null },
  mapGenScripts: { ok: false, why: null },
  uiShortcuts: { ok: false, why: null },
  importJs: { ok: false, why: "importjs" },
  uiScriptOtherCode: { ok: false, why: "uiscript" },
  uiScriptSmuggled: { ok: false, why: "uiscript" },
  uiScriptListener: { ok: false, why: "uiscript" },
  uiScriptUnreadable: { ok: false, why: null }
};
