// What the deal SQL leaves in the gameplay database (CONTRACTS 6; SPEC "Living with other mods", "Data safety",
// section 8): no foreign-key rows of its own, the DLC-removed copy builds, the rows other mods and the base game
// keep on a leader stay put, Normal with nothing Off is the game as shipped, and the Off switches do what they say.
// Waits on B and A.
import assert from "node:assert/strict";
import test from "node:test";

import {
  DLC_LEADER,
  ensureFixtures,
  fixtureForeignKeys,
  fixturePaths,
  gameConfig,
  openDb,
  loadGame,
  newForeignKeyRows,
  resultObjects,
  rows,
  snapshot,
  sqlResult
} from "./_harness.mjs";
import { label, MODES, OFF_SETS, reviewAll, shippedAbilities, shippedAttributes, SPLIT_MODES } from "./_deal.mjs";
import { DLC_MARK } from "../scripts/fixtures/build-fixtures.mjs";
import { BIAS_TABLES, BIAS_TARGET_COLUMN, MODE, ONOFF, REASON, STATUS, TRAIT } from "../shared/lshuf-constants.js";

const FIXTURES = ["base", "dlc-removed", "added-leader", "extra-modifier"];
const OPEN_UNLOCKS = "SELECT count(*) AS n FROM ProgressionTreeNodeUnlocks WHERE RequiredTraitType IS NULL";

// Rows SPEC section 3 says stay with their leader.
const PROTECTED = `TraitType LIKE 'TRAIT_CD_FLIP_%' OR TraitType LIKE 'TRAIT_PARTISANS_%'
  OR TraitType IN ('TRAIT_LEADER_MAJOR_CIV', 'TRAIT_LEADER_MINOR_CIV', 'TRAIT_LEADER_AGGRESSIVE', 'TRAIT_UNLOCK_FLEET_COMMANDER')
  OR TraitType LIKE 'TRAIT\\_AQ\\_%\\_VICTORY' ESCAPE '\\' OR TraitType LIKE 'TRAIT\\_EX\\_%\\_VICTORY' ESCAPE '\\'
  OR TraitType LIKE 'TRAIT\\_MO\\_%\\_VICTORY' ESCAPE '\\'`;

function* setups() {
  for (const fixture of FIXTURES) {
    for (const Mode of MODES) {
      for (const off of [OFF_SETS[0], OFF_SETS[OFF_SETS.length - 1]]) {
        const spec = { seed: 17, options: { Mode, ...off } };
        yield { fixture, spec, hooks: [] };
        if (SPLIT_MODES.includes(Mode)) yield { fixture, spec, hooks: [reviewAll()] };
      }
    }
  }
}

test("no foreign-key rows of our own, no unlock opened to everyone, our traits typed", async () => {
  for (const { fixture, spec, hooks } of setups()) {
    const where = `${label(fixture, spec)}${hooks.length ? " reviewed" : ""}`;
    const run = await loadGame({ fixture, config: gameConfig(spec), hooks });
    try {
      const fk = newForeignKeyRows(run.db, fixtureForeignKeys(fixture));
      assert.deepEqual(fk.newErrors, [], `${where}: tables whose foreign keys no longer check`);
      assert.deepEqual(fk.fresh.slice(0, 10), [], `${where}: ${fk.fresh.length} new foreign_key_check rows`);
      assert.equal(run.db.prepare(OPEN_UNLOCKS).get().n, run.pre.prepare(OPEN_UNLOCKS).get().n, `${where}: unlocks with no RequiredTraitType`);
      const untyped = rows(
        run.db,
        `SELECT t.TraitType FROM Traits t LEFT JOIN Types y ON y.Type = t.TraitType
         WHERE t.TraitType LIKE 'TRAIT_LSHUF_%' AND (y.Kind IS NULL OR y.Kind <> 'KIND_TRAIT')`
      );
      assert.deepEqual(untyped, [], `${where}: our traits have a KIND_TRAIT Types row`);
      const deleted = run.pre.prepare("SELECT count(*) AS n FROM Traits").get().n - run.db.prepare("SELECT count(*) AS n FROM Traits WHERE TraitType NOT LIKE 'TRAIT_LSHUF_%'").get().n;
      assert.equal(deleted, 0, `${where}: no Traits rows deleted`);
      const mods = run.pre.prepare("SELECT count(*) AS n FROM Modifiers").get().n;
      const modsKept = run.db.prepare("SELECT count(*) AS n FROM Modifiers WHERE ModifierId NOT LIKE 'LSHUF\\_%' ESCAPE '\\'").get().n;
      assert.equal(modsKept, mods, `${where}: no Modifiers rows deleted`);
    } finally {
      run.close();
    }
  }
});

test("the DLC-removed copy builds in every mode, and nothing names the missing leader", async () => {
  for (const Mode of MODES) {
    for (const off of OFF_SETS) {
      const spec = { seed: 99, options: { Mode, ...off } };
      const run = await loadGame({ fixture: "dlc-removed", config: gameConfig(spec) });
      try {
        const text = JSON.stringify(sqlResult(run.db));
        assert.ok(!text.includes(DLC_MARK), `${label("dlc-removed", spec)}: results mention ${DLC_LEADER}`);
        const named = rows(run.db, "SELECT LeaderType FROM LeaderTraits WHERE LeaderType = ? OR TraitType LIKE ?", DLC_LEADER, `%${DLC_MARK}%`);
        assert.deepEqual(named, []);
      } finally {
        run.close();
      }
    }
  }
});

test("rows other mods and the base game keep on a leader stay put", async () => {
  for (const { fixture, spec, hooks } of setups()) {
    if (fixture !== "base" && fixture !== "added-leader") continue;
    const where = `${label(fixture, spec)}${hooks.length ? " reviewed" : ""}`;
    const run = await loadGame({ fixture, config: gameConfig(spec), hooks });
    try {
      const lt = `SELECT LeaderType, TraitType FROM LeaderTraits WHERE ${PROTECTED}`;
      assert.ok(snapshot(run.pre, lt).length >= 38 * 2 + 114, `${where}: the fixture has the protected rows`);
      // Yi Sun-sin's Fleet Commander trait follows his Fleet Commander piece (CONTRACTS 23 R5); tests/civ-links.mjs
      // checks where it goes.
      const kept = `SELECT LeaderType, TraitType FROM LeaderTraits WHERE (${PROTECTED}) AND TraitType <> 'TRAIT_UNLOCK_FLEET_COMMANDER'`;
      assert.deepEqual(snapshot(run.db, kept), snapshot(run.pre, kept), `${where}: protected LeaderTraits rows`);
      const tm = `SELECT TraitType, ModifierId FROM TraitModifiers WHERE ${PROTECTED}`;
      assert.deepEqual(snapshot(run.db, tm), snapshot(run.pre, tm), `${where}: their TraitModifiers`);
      const ai = "SELECT * FROM AiLists WHERE LeaderType IS NULL OR LeaderType = 'TRAIT_LEADER_MAJOR_CIV'";
      assert.deepEqual(snapshot(run.db, ai), snapshot(run.pre, ai), `${where}: AiLists with no leader or MAJOR_CIV`);
    } finally {
      run.close();
    }
  }
});

const GAME_TABLES = [
  "LeaderTraits",
  "TraitModifiers",
  "ProgressionTreeNodeUnlocks",
  "AiLists",
  "AiFavoredItems",
  "LeaderCivPriorities",
  "Modifiers",
  "ModifierArguments",
  ...BIAS_TABLES
];

function liveBiasRows(db) {
  const out = [];
  for (const table of BIAS_TABLES) {
    const target = BIAS_TARGET_COLUMN[table];
    for (const r of rows(db, `SELECT * FROM ${table}`)) {
      out.push({
        TableName: table,
        LeaderType: r.LeaderType ?? null,
        CivilizationType: r.CivilizationType ?? null,
        TargetType: target ? r[target] : null,
        Score: Number(r.Score),
        Origin: "shipped"
      });
    }
  }
  return out.map((r) => JSON.stringify(r)).sort();
}

test("Normal with nothing Off is the game as shipped", async () => {
  for (const fixture of FIXTURES) {
    for (const seed of [1, 256]) {
      const spec = { seed, options: { Mode: MODE.None } };
      const run = await loadGame({ fixture, config: gameConfig(spec) });
      try {
        const where = label(fixture, spec);
        for (const t of GAME_TABLES) {
          assert.deepEqual(snapshot(run.db, `SELECT * FROM ${t}`), snapshot(run.pre, `SELECT * FROM ${t}`), `${where}: ${t}`);
        }
        const res = resultObjects(run.db, sqlResult(run.db));
        for (const r of res.leaders) {
          assert.deepEqual([r.Status, r.Axes], [STATUS.AsShipped, null], `${where}: ${r.LeaderType}`);
          assert.equal(r.AbilityFrom, r.LeaderType);
          assert.equal(r.BiasFrom, r.LeaderType);
        }
        const unknown = res.leaders.filter((r) => r.Reason !== REASON.ModeNone).map((r) => `${r.LeaderType}:${r.Reason}`);
        assert.ok(unknown.every((x) => x.endsWith(`:${REASON.Unknown}`)), `${where}: reasons other than mode-none: ${unknown}`);
        const biases = res.biases.map((b) => JSON.stringify({ ...b, Score: Number(b.Score) })).sort();
        assert.deepEqual(biases, liveBiasRows(run.pre), `${where}: LShufResultBiases lists the live bias rows as shipped`);
        const attrs = shippedAttributes(run.pre);
        const got = {};
        for (const a of res.attributes) (got[a.LeaderType] = got[a.LeaderType] || []).push(a.TraitType);
        for (const l of Object.keys(got)) got[l].sort();
        for (const l of Object.keys(attrs)) attrs[l].sort();
        assert.deepEqual(got, attrs, `${where}: attributes as shipped`);
        const abilities = shippedAbilities(run.pre);
        for (const u of res.unlocks) {
          const holder = Object.keys(abilities).find((l) => abilities[l].includes(u.FromTraitType));
          if (holder) assert.deepEqual([u.ToLeaderType, u.ToTraitType], [holder, u.FromTraitType], `${where}: unlock ${u.ProgressionTreeNodeType}`);
        }
      } finally {
        run.close();
      }
    }
  }
});

test("the Off switches: no biases, equal diplomatic actions, no abilities", async () => {
  ensureFixtures(["base"]);
  const src = openDb(fixturePaths("base").gameplay, { readOnly: true });
  const unlockMods = rows(
    src,
    "SELECT ModifierId FROM Modifiers WHERE ModifierId LIKE 'MOD_TRAIT_LEADER_ATTRIBUTE_UNLOCK_%' ORDER BY ModifierId"
  ).map((r) => r.ModifierId);
  src.close();
  assert.equal(unlockMods.length, 12);
  for (const Mode of MODES) {
    const spec = { seed: 5, options: { Mode, Biases: ONOFF.Off, Abilities: ONOFF.Off, Attributes: ONOFF.Off } };
    const run = await loadGame({ config: gameConfig(spec) });
    try {
      const where = label("base", spec);
      for (const t of BIAS_TABLES) assert.equal(run.db.prepare(`SELECT count(*) AS n FROM ${t}`).get().n, 0, `${where}: ${t} empty`);
      const attrRows = rows(run.db, "SELECT * FROM LeaderTraits WHERE TraitType IN (SELECT TraitType FROM LShufAttributeTraits)");
      assert.deepEqual(attrRows, [], `${where}: no attribute traits left`);
      const majors = rows(run.db, "SELECT LeaderType FROM Leaders WHERE IsMajorLeader = 1").map((r) => r.LeaderType);
      const equal = new Set(rows(run.db, "SELECT LeaderType FROM LeaderTraits WHERE TraitType = ?", TRAIT.EqualActions).map((r) => r.LeaderType));
      assert.deepEqual(majors.filter((l) => !equal.has(l)), [], `${where}: every leader holds ${TRAIT.EqualActions}`);
      const carried = rows(run.db, "SELECT ModifierId FROM TraitModifiers WHERE TraitType = ? ORDER BY ModifierId", TRAIT.EqualActions).map((r) => r.ModifierId);
      assert.deepEqual(carried, unlockMods, `${where}: the equal-actions trait carries the twelve unlock modifiers`);
      const named = rows(
        run.db,
        "SELECT lt.LeaderType, lt.TraitType FROM LeaderTraits lt JOIN Traits t ON t.TraitType = lt.TraitType WHERE t.Name IS NOT NULL"
      ).filter((r) => majors.includes(r.LeaderType));
      assert.deepEqual(named, [], `${where}: no leader holds an ability`);
    } finally {
      run.close();
    }
  }
});
