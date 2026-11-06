// Setup parameters (CONTRACTS section 2, workstream C's data/frontend/parameters.sql) load into the frontend copies and
// hold what the contract says; every LOC key the contract lists exists in text/en_us/lshuf-text.xml (workstream F),
// with the placeholders the contract gives it.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { loadShell, need, PROJECT_ROOT, rows } from "./_harness.mjs";
import { ADDED_LEADER, DLC_LEADER } from "../scripts/fixtures/build-fixtures.mjs";
import { CONFIG_KEY, DEALING, listValue, MODE, ONOFF, PARAM, PERSONA, REASON, REVEAL } from "../shared/lshuf-constants.js";
import { MODDED_LEADER_TYPES, VANILLA_LEADERS } from "../shared/lshuf-known-leaders.js";

// Section 2's table, in order: [ParameterID, Domain, Array, Default, Name key].
const PARAMS = [
  [PARAM.Mode, "LShufModeValues", 0, MODE.None, "LOC_LSHUF_MODE_NAME"],
  [PARAM.Biases, "LShufOnOffValues", 0, ONOFF.Redealt, "LOC_LSHUF_BIASES_NAME"],
  [PARAM.Abilities, "LShufOnOffValues", 0, ONOFF.Redealt, "LOC_LSHUF_ABILITIES_NAME"],
  [PARAM.Attributes, "LShufOnOffValues", 0, ONOFF.Redealt, "LOC_LSHUF_ATTRIBUTES_NAME"],
  [PARAM.KeepMine, "bool", 0, "0", "LOC_LSHUF_KEEP_MINE_NAME"],
  [PARAM.LeadersOut, "LShufLeaderValues", 1, null, "LOC_LSHUF_LEADERS_OUT_NAME"],
  [PARAM.ModdedAbilities, "bool", 0, "0", "LOC_LSHUF_MODDED_ABILITIES_NAME"],
  [PARAM.ModdedAttributes, "bool", 0, "0", "LOC_LSHUF_MODDED_ATTRIBUTES_NAME"],
  [PARAM.ModdedBiases, "bool", 0, "0", "LOC_LSHUF_MODDED_BIASES_NAME"],
  [PARAM.ModdedOut, "LShufModdedLeaderValues", 1, null, "LOC_LSHUF_MODDED_OUT_NAME"],
  [PARAM.Pool1, "LShufPoolLeaderValues", 1, null, "LOC_LSHUF_POOL1_NAME"],
  [PARAM.Pool2, "LShufPoolLeaderValues", 1, null, "LOC_LSHUF_POOL2_NAME"],
  [PARAM.Personality, "LShufPersonalityValues", 0, PERSONA.Follows, "LOC_LSHUF_PERSONALITY_NAME"],
  [PARAM.Dealing, "LShufDealingValues", 0, DEALING.Balanced, "LOC_LSHUF_DEALING_NAME"],
  [PARAM.Reveal, "LShufRevealValues", 0, REVEAL.Start, "LOC_LSHUF_REVEAL_NAME"],
  [PARAM.Seed, "text", 0, "1", "LOC_LSHUF_SEED_NAME"]
];

const SELECT_DOMAINS = {
  LShufModeValues: Object.values(MODE),
  LShufOnOffValues: Object.values(ONOFF),
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
        Description: nameKey.replace(/_NAME$/, "_DESC"),
        ConfigurationGroup: "Game",
        GroupID: "GameOptions",
        Hidden: 1,
        ReadOnly: 0,
        SupportsSinglePlayer: 1,
        SupportsLANMultiplayer: 1,
        SupportsInternetMultiplayer: 1,
        SupportsHotseatMultiplayer: 1,
        ChangeableAfterGameStart: 0,
        SortIndex: 2300 + i,
        UxHint: [PARAM.LeadersOut, PARAM.ModdedOut].includes(id) ? "InvertSelection" : null
      };
      for (const [k, v] of Object.entries(want)) assert.equal(p[k], v, `${id}.${k}`);
      assert.equal(p.DefaultValue == null ? null : String(p.DefaultValue), def, `${id}.DefaultValue`);
    });
    const groups = rows(run.db, "SELECT * FROM ParameterGroups WHERE GroupID LIKE 'LShuf%' OR Name LIKE 'LOC_LSHUF%'");
    assert.deepEqual(groups, [], "no ParameterGroups row");
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
    for (const n of [1, 2]) {
      const r = rows(run.db, "SELECT * FROM DomainValues WHERE Domain = 'StandardLeaders' AND Value = ?", `LSHUF_RANDOM_POOL_${n}`);
      assert.equal(r.length, 1, `Random from pool ${n}`);
      assert.deepEqual([r[0].Name, r[0].Icon, r[0].SortIndex], [`LOC_LSHUF_RANDOM_POOL_${n}`, "LEADER_RANDOM", -1000 + n]);
    }
  } finally {
    run.close();
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
  assert.equal(text.get("LOC_LSHUF_OPEN_BUTTON"), "Re-dealable Leaders...");
});

test("every LOC key parameters.sql names has English text", () => {
  const sql = fs.readFileSync(need("data/frontend/parameters.sql"), "utf8");
  const text = readText();
  const used = [...new Set(sql.match(KEY_RE) || [])];
  const missing = used.filter((k) => !text.has(k));
  assert.deepEqual(missing, []);
});
