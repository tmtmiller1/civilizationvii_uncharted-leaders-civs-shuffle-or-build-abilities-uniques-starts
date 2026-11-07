// Setup parameters (CONTRACTS section 2, workstream C's data/frontend/parameters.sql) load into the frontend copies and
// hold what the contract says; every LOC key the contract lists exists in text/en_us/lshuf-text.xml (workstream F),
// with the placeholders the contract gives it.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { loadShell, need, PROJECT_ROOT, rows } from "./_harness.mjs";
import { ADDED_LEADER, DLC_LEADER } from "../scripts/fixtures/build-fixtures.mjs";
import {
  CONFIG_KEY, DEALING, listValue, MODE, PARAM, PERSONA, REASON, REVEAL, A_MODE, T_MODE, B_MODE,
  CA_MODE, CU_MODE, CC_MODE, MODE_CUSTOM
} from "../shared/lshuf-constants.js";
import { MODDED_LEADER_TYPES, VANILLA_LEADERS } from "../shared/lshuf-known-leaders.js";

// Section 2's table, in order: [ParameterID, Domain, Array, Default, Name key].
const PARAMS = [
  [PARAM.Mode, "LShufModeValues", 0, MODE.None, "LOC_LSHUF_MODE_NAME"],
  [PARAM.Biases, "LShufBValues", 0, B_MODE.Normal, "LOC_LSHUF_BIASES_NAME"],
  [PARAM.Abilities, "LShufAValues", 0, A_MODE.Normal, "LOC_LSHUF_ABILITIES_NAME"],
  [PARAM.Attributes, "LShufTValues", 0, T_MODE.Normal, "LOC_LSHUF_ATTRIBUTES_NAME"],
  [PARAM.CivAbilities, "LShufCAValues", 0, CA_MODE.Normal, "LOC_LSHUF_CIV_ABILITIES_NAME"],
  [PARAM.CivUniques, "LShufCUValues", 0, CU_MODE.Normal, "LOC_LSHUF_CIV_UNIQUES_NAME"],
  [PARAM.CivCivics, "LShufCCValues", 0, CC_MODE.Normal, "LOC_LSHUF_CIV_CIVICS_NAME"],
  [PARAM.KeepMine, "bool", 0, "0", "LOC_LSHUF_KEEP_MINE_NAME"],
  [PARAM.LeadersOut, "LShufLeaderValues", 1, null, "LOC_LSHUF_LEADERS_OUT_NAME"],
  [PARAM.ModdedAbilities, "bool", 0, "0", "LOC_LSHUF_MODDED_ABILITIES_NAME"],
  [PARAM.ModdedAttributes, "bool", 0, "0", "LOC_LSHUF_MODDED_ATTRIBUTES_NAME"],
  [PARAM.ModdedBiases, "bool", 0, "0", "LOC_LSHUF_MODDED_BIASES_NAME"],
  [PARAM.ModdedOut, "LShufModdedLeaderValues", 1, null, "LOC_LSHUF_MODDED_OUT_NAME"],
  [PARAM.Pool1, "LShufPoolLeaderValues", 1, null, "LOC_LSHUF_POOL_NAME"],
  [PARAM.Personality, "LShufPersonalityValues", 0, PERSONA.Follows, "LOC_LSHUF_PERSONALITY_NAME"],
  [PARAM.Dealing, "LShufDealingValues", 0, DEALING.Balanced, "LOC_LSHUF_DEALING_NAME"],
  [PARAM.Reveal, "LShufRevealValues", 0, REVEAL.Start, "LOC_LSHUF_REVEAL_NAME"],
  [PARAM.Seed, "text", 0, "1", "LOC_LSHUF_SEED_NAME"],
  [PARAM.CivsOut, "LShufCivValues", 1, null, "LOC_LSHUF_CIVS_OUT_NAME"],
  // Build your own leader's stored picks (CONTRACTS 13): "|id|id|", named after the screen; slots 2..4 add the AI
  // leader each slot builds (LShufBuildFor<n>).
  [PARAM.BuildPicks, "text", 0, null, "LOC_LSHUF_BUILD_TITLE"],
  ["LShufBuildPicks2", "text", 0, null, "LOC_LSHUF_BUILD_TITLE"],
  ["LShufBuildFor2", "text", 0, null, "LOC_LSHUF_BUILD_FOR"],
  ["LShufBuildPicks3", "text", 0, null, "LOC_LSHUF_BUILD_TITLE"],
  ["LShufBuildFor3", "text", 0, null, "LOC_LSHUF_BUILD_FOR"],
  ["LShufBuildPicks4", "text", 0, null, "LOC_LSHUF_BUILD_TITLE"],
  ["LShufBuildFor4", "text", 0, null, "LOC_LSHUF_BUILD_FOR"]
];

const SELECT_DOMAINS = {
  LShufModeValues: [...Object.values(MODE), MODE_CUSTOM],
  LShufAValues: Object.values(A_MODE),
  LShufTValues: Object.values(T_MODE),
  LShufBValues: Object.values(B_MODE),
  LShufCAValues: Object.values(CA_MODE),
  LShufCUValues: Object.values(CU_MODE),
  LShufCCValues: Object.values(CC_MODE),
  LShufPersonalityValues: Object.values(PERSONA),
  LShufDealingValues: Object.values(DEALING),
  LShufRevealValues: Object.values(REVEAL)
};

async function shell(fixture) {
  need("data/frontend/parameters.sql");
  const run = await loadShell({ fixture, allowMissing: true });
  assert.ok(run.ran.includes("data/frontend/parameters.sql"));
  return run;
}

// The frontend Parameters table has no unique key, so INSERT OR IGNORE wouldn't stop a second load doubling the
// rows; the shell builds config once per launch, so one load is what the game does.
test("parameters.sql loads into the frontend copies", async () => {
  for (const fixture of ["base", "dlc-removed", "added-leader"]) {
    const run = await shell(fixture);
    try {
      const n = run.db.prepare("SELECT count(*) AS n FROM Parameters WHERE ParameterID LIKE 'LShuf%'").get().n;
      assert.equal(n, PARAMS.length, `${fixture}: one row per parameter`);
      if (run.missing.length) console.log(`${fixture}: shell items not there yet: ${run.missing.map((m) => `${m.rel} (${m.owner})`).join(", ")}`);
    } finally {
      run.close();
    }
  }
});

// The seven main options are ordinary rows in the mod's own section (LShufOptions), in this order; the rest stay hidden
// in GameOptions and are set from the advanced window.
const MAIN_SORT = {
  [PARAM.Mode]: 2300,
  [PARAM.Abilities]: 2301,
  [PARAM.Attributes]: 2302,
  [PARAM.Biases]: 2303,
  [PARAM.CivAbilities]: 2304,
  [PARAM.CivUniques]: 2305,
  [PARAM.CivCivics]: 2306,
  [PARAM.Personality]: 2307,
  [PARAM.KeepMine]: 2308,
  [PARAM.Reveal]: 2309
};

test("each parameter row matches section 2", async () => {
  const run = await shell("base");
  try {
    PARAMS.forEach(([id, domain, array, def, nameKey], i) => {
      const r = rows(run.db, "SELECT * FROM Parameters WHERE ParameterID = ?", id);
      assert.equal(r.length, 1, `${id}: one row`);
      const p = r[0];
      const want = {
        Domain: domain,
        Array: array,
        ConfigurationKey: CONFIG_KEY[id] || id,
        Name: nameKey,
        Description: id.startsWith("LShufBuild") ? "LOC_LSHUF_BUILD_INTRO" : nameKey.replace(/_NAME$/, "_DESC"),
        ConfigurationGroup: "Game",
        GroupID: id in MAIN_SORT ? "LShufOptions" : "GameOptions",
        Hidden: id in MAIN_SORT ? 0 : 1,
        ReadOnly: 0,
        SupportsSinglePlayer: 1,
        SupportsLANMultiplayer: 1,
        SupportsInternetMultiplayer: 1,
        SupportsHotseatMultiplayer: 1,
        ChangeableAfterGameStart: 0,
        // Hidden rows keep their numbers from before the two civilization rows went in above them.
        SortIndex: id in MAIN_SORT ? MAIN_SORT[id] : 2300 + i - 3,
        UxHint: [PARAM.LeadersOut, PARAM.ModdedOut, PARAM.CivsOut].includes(id) ? "InvertSelection" : null
      };
      for (const [k, v] of Object.entries(want)) assert.equal(p[k], v, `${id}.${k}`);
      assert.equal(p.DefaultValue == null ? null : String(p.DefaultValue), def, `${id}.DefaultValue`);
    });
    const groups = rows(run.db, "SELECT * FROM ParameterGroups WHERE GroupID LIKE 'LShuf%' OR Name LIKE 'LOC_LSHUF%'");
    assert.deepEqual(groups, [{ GroupID: "LShufOptions", Name: "LOC_LSHUF_SECTION_TITLE" }], "the section's row");
  } finally {
    run.close();
  }
});

test("select domains list their values in order, Description = Name + _DESC", async () => {
  const run = await shell("base");
  try {
    for (const [domain, values] of Object.entries(SELECT_DOMAINS)) {
      const got = rows(run.db, "SELECT Value, Name, Description FROM DomainValues WHERE Domain = ? ORDER BY SortIndex", domain);
      assert.deepEqual(got.map((r) => r.Value), values, `${domain} values`);
      for (const r of got) {
        assert.equal(r.Name, `LOC_${r.Value}`, `${domain} ${r.Value} Name`);
        assert.equal(r.Description, `LOC_${r.Value}_DESC`, `${domain} ${r.Value} Description`);
      }
    }
    const pool = rows(run.db, "SELECT * FROM DomainValues WHERE Domain = 'StandardLeaders' AND Value LIKE 'LSHUF_RANDOM_POOL%'");
    assert.equal(pool.length, 1, "one Random from the pool entry");
    assert.deepEqual([pool[0].Value, pool[0].Name, pool[0].Icon, pool[0].SortIndex],
      ["LSHUF_RANDOM_POOL_1", "LOC_LSHUF_RANDOM_POOL", "LEADER_RANDOM", -999], "right after Random's -1000");
  } finally {
    run.close();
  }
});

test("the civilization list comes from the frontend Civilizations table, one value per civ", async () => {
  for (const fixture of ["base", "dlc-removed", "added-leader"]) {
    const run = await shell(fixture);
    try {
      const civs = rows(
        run.db,
        "SELECT CivilizationType, MIN(CivilizationName) AS Name FROM Civilizations WHERE CivilizationType <> 'RANDOM' GROUP BY CivilizationType"
      );
      assert.ok(civs.length > 0, `${fixture}: the fixture has civilizations`);
      const got = rows(run.db, "SELECT Value, Name, Description FROM DomainValues WHERE Domain = 'LShufCivValues'");
      const sorted = (list) => list.map((r) => JSON.stringify(r)).sort();
      const want = civs.map((c) => ({ Value: listValue(c.CivilizationType), Name: c.Name, Description: c.Name }));
      assert.deepEqual(sorted(got), sorted(want), `${fixture}: LShufCivValues`);
    } finally {
      run.close();
    }
  }
});

test("leader domains come from the frontend Leaders table, so a missing DLC isn't listed", async () => {
  for (const fixture of ["base", "dlc-removed", "added-leader"]) {
    const run = await shell(fixture);
    try {
      const leaders = rows(run.db, "SELECT LeaderType, LeaderName FROM Leaders WHERE Domain = 'StandardLeaders'");
      const values = (domain) => rows(run.db, "SELECT Value, Name, Description FROM DomainValues WHERE Domain = ?", domain);
      const sorted = (list) => list.map((r) => JSON.stringify(r)).sort();
      const expect = (filter, wrap) =>
        sorted(
          leaders
            .filter((l) => filter(l.LeaderType))
            .map((l) => ({ Value: wrap(l.LeaderType), Name: l.LeaderName, Description: l.LeaderName }))
        );
      assert.deepEqual(sorted(values("LShufLeaderValues")), expect((t) => VANILLA_LEADERS.includes(t), listValue), `${fixture}: LShufLeaderValues`);
      assert.deepEqual(sorted(values("LShufModdedLeaderValues")), expect((t) => MODDED_LEADER_TYPES.includes(t), listValue), `${fixture}: modded`);
      const pool = sorted(values("LShufPoolLeaderValues").map((r) => ({ Value: r.Value, Name: r.Name })));
      assert.deepEqual(pool, sorted(leaders.map((l) => ({ Value: l.LeaderType, Name: l.LeaderName }))), `${fixture}: pool values`);
      const all = JSON.stringify(rows(run.db, "SELECT Value FROM DomainValues WHERE Domain LIKE 'LShuf%Leader%'"));
      if (fixture === "dlc-removed") assert.ok(!all.includes(DLC_LEADER), `${fixture}: ${DLC_LEADER} isn't listed`);
      if (fixture === "added-leader") {
        assert.ok(!values("LShufLeaderValues").some((r) => r.Value.includes(ADDED_LEADER)), "an unknown leader isn't in the re-deal list");
      }
    } finally {
      run.close();
    }
  }
});

// ---------------------------------------------------------------------------------------------------------------
// Text.

const contract = fs.readFileSync(path.join(PROJECT_ROOT, "CONTRACTS.md"), "utf8");
const section = (n) => contract.split(/\n## /).find((s) => s.startsWith(`${n}. `)) || "";
const KEY_RE = /LOC_LSHUF_[A-Z0-9_]*[A-Z0-9]/g;

export function contractKeys() {
  const keys = new Set();
  for (const line of section(2).split("\n").filter((l) => l.startsWith("| `LShuf"))) {
    for (const k of line.match(KEY_RE) || []) {
      keys.add(k);
      if (k.endsWith("_NAME")) keys.add(k.replace(/_NAME$/, "_DESC"));
    }
  }
  for (const line of section(8).split("\n").filter((l) => l.startsWith("| "))) {
    if (line.startsWith("| Reasons")) {
      for (const v of Object.values(REASON)) keys.add(`LOC_LSHUF_REASON_${v.toUpperCase().replace(/-/g, "_")}`);
    }
    for (const k of line.match(KEY_RE) || []) {
      if (k === "LOC_LSHUF_PIECE" || k === "LOC_LSHUF_REASON") continue;
      keys.add(k);
      if (line.startsWith("| Option values")) keys.add(`${k}_DESC`);
    }
  }
  return keys;
}

function placeholders() {
  const out = {};
  for (const m of contract.matchAll(/`(LOC_LSHUF_[A-Z0-9_]+)` \(((?:`\{\d_\w+\}`(?:, )?)+)/g)) {
    out[m[1]] = [...m[2].matchAll(/\{\d_\w+\}/g)].map((x) => x[0]);
  }
  return out;
}

function readText() {
  const xml = fs.readFileSync(need("text/en_us/lshuf-text.xml"), "utf8");
  assert.match(xml, /<Database>[\s\S]*<EnglishText>[\s\S]*<\/EnglishText>[\s\S]*<\/Database>/);
  const map = new Map();
  for (const m of xml.matchAll(/<(?:Row|Replace)\s+Tag="([^"]+)"[^>]*>\s*<Text>([\s\S]*?)<\/Text>/g)) {
    assert.ok(!map.has(m[1]), `duplicate Tag ${m[1]}`);
    map.set(m[1], m[2]);
  }
  return map;
}

test("every LOC key in CONTRACTS sections 2 and 8 has English text", () => {
  const keys = contractKeys();
  assert.ok(keys.size > 100, `read ${keys.size} keys from the contract`);
  const text = readText();
  const missing = [...keys].filter((k) => !text.has(k)).sort();
  assert.deepEqual(missing, [], `${missing.length} keys missing from text/en_us/lshuf-text.xml`);
  for (const [key, ph] of Object.entries(placeholders())) {
    for (const p of ph) assert.ok(text.get(key)?.includes(p), `${key} uses ${p}`);
  }
  assert.equal(text.get("LOC_LSHUF_MOD_NAME"), "Re-dealable Leader Abilities, Attributes, and Start Biases");
});

test("every LOC key parameters.sql names has English text", () => {
  const sql = fs.readFileSync(need("data/frontend/parameters.sql"), "utf8");
  const text = readText();
  const used = [...new Set(sql.match(KEY_RE) || [])];
  const missing = used.filter((k) => !text.has(k));
  assert.deepEqual(missing, []);
});
