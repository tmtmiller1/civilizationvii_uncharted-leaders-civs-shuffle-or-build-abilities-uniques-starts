// The harness itself: criteria semantics (probes 7 and 13), modinfo parsing, load order, the fixtures, and a load of
// the schema alone into each fixture. Runs before any workstream's files exist.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  ADDED_LEADER,
  DLC_MARK,
  EXTRA_MODIFIER,
  FIXTURES,
  SOURCES
} from "../scripts/fixtures/build-fixtures.mjs";
import {
  conditionMet,
  configFromTables,
  dealConfig,
  ensureFixtures,
  fixtureForeignKeys,
  fixturePaths,
  gameConfig,
  loadGame,
  modinfoText,
  newForeignKeyRows,
  openDb,
  parseModinfo,
  rows,
  snapshot
} from "./_harness.mjs";
import { KEY, MODE, OPTION_DEFAULTS } from "../shared/lshuf-constants.js";

const matches = (key, value) => ({ type: "ConfigurationValueMatches", group: "Game", key, value });
const contains = (key, value) => ({ type: "ConfigurationValueContains", group: "Game", key, value });

test("criteria behave as probes 7 and 13 watched", () => {
  const cases = [
    [matches("K", "1"), { K: 1 }, false],
    [matches("K", "1"), { K: "1" }, true],
    [matches("K", "1"), {}, false],
    [matches("K", "1"), { K: true }, true],
    [matches("K", "true"), { K: true }, true],
    [matches("K", "1"), { K: false }, false],
    [matches("K", "17"), { K: "17" }, true],
    [matches("K", "17"), { K: "170" }, false],
    [contains("K", "LEADER_AMINA"), { K: ["LEADER_AMINA", "LEADER_PACHACUTI"] }, true],
    [contains("K", "LEADER_NOPE"), { K: ["LEADER_AMINA", "LEADER_PACHACUTI"] }, false],
    [contains("K", "LEADER_AMINA"), { K: "LEADER_AMINA,LEADER_PACHACUTI" }, true],
    [contains("K", "1,2,3"), { K: "1" }, true],
    [contains("K", "2,3"), { K: "1" }, false],
    [contains("K", "1,2,3"), { K: 1 }, false],
    [contains("K", "|LEADER_XERXES|"), { K: ["|LEADER_XERXES_ALT|"] }, false],
    [contains("K", "|LEADER_XERXES_ALT|"), { K: ["|LEADER_XERXES|", "|LEADER_XERXES_ALT|"] }, true],
    [contains("K", "|LEADER_XERXES|"), { K: [] }, false]
  ];
  for (const [cond, config, want] of cases) {
    assert.equal(conditionMet(cond, config), want, `${cond.type} ${cond.value} on ${JSON.stringify(config)}`);
  }
});

test("the template parses: fixed groups, scopes and load orders", async () => {
  const { criteria, groups } = parseModinfo(await modinfoText());
  assert.ok(criteria.get("always").conditions.every((c) => c.type === "AlwaysMet"));
  const byId = Object.fromEntries(groups.map((g) => [g.id, g]));
  for (const [id, scope, order] of [
    ["lshuf-shell", "shell", 20000],
    ["lshuf-game-schema", "game", 20000],
    ["lshuf-game-text", "game", 20100],
    ["lshuf-game-ui", "game", 20100]
  ]) {
    assert.ok(byId[id], `group ${id}`);
    assert.equal(byId[id].scope, scope);
    assert.equal(byId[id].loadOrder, order);
  }
  const schema = byId["lshuf-game-schema"].actions.find((a) => a.type === "UpdateDatabase").items;
  assert.deepEqual(schema, [
    "data/schema/gameplay-tables.sql", "data/mapping/lshuf-mapping.sql", "data/mapping/lshuf-civ-mapping.sql"
  ]);
});

const SYNTHETIC = `<Mod id="x" xmlns="ModInfo"><ActionCriteria>
  <Criteria id="always"><AlwaysMet></AlwaysMet></Criteria>
  <Criteria id="seed-17"><ConfigurationValueMatches><Group>Game</Group><ConfigurationId>LShufSeed</ConfigurationId><Value>17</Value></ConfigurationValueMatches></Criteria>
  <Criteria id="keep-amina"><ConfigurationValueMatches><Group>Game</Group><ConfigurationId>${KEY.keep("LEADER_AMINA")}</ConfigurationId><Value>1</Value></ConfigurationValueMatches></Criteria>
  <Criteria id="out-amina"><ConfigurationValueContains><Group>Game</Group><ConfigurationId>LShufExcludedLeaders</ConfigurationId><Value>|LEADER_AMINA|</Value></ConfigurationValueContains></Criteria>
</ActionCriteria><ActionGroups>
  <ActionGroup id="late" scope="game" criteria="always"><Properties><LoadOrder>20200</LoadOrder></Properties>
    <Actions><UpdateDatabase><Item>tests/fixtures/harness/late.sql</Item></UpdateDatabase></Actions></ActionGroup>
  <ActionGroup id="seed" scope="game" criteria="seed-17"><Properties><LoadOrder>20010</LoadOrder></Properties>
    <Actions><UpdateDatabase><Item>tests/fixtures/harness/seed17.sql</Item></UpdateDatabase></Actions></ActionGroup>
  <ActionGroup id="always" scope="game" criteria="always"><Properties><LoadOrder>20000</LoadOrder></Properties>
    <Actions><UpdateDatabase><Item>tests/fixtures/harness/always.sql</Item></UpdateDatabase>
    <UpdateText><Item>text/en_us/not-run.xml</Item></UpdateText></Actions></ActionGroup>
  <ActionGroup id="keep" scope="game" criteria="keep-amina"><Properties><LoadOrder>20010</LoadOrder></Properties>
    <Actions><UpdateDatabase><Item>tests/fixtures/harness/keep.sql</Item></UpdateDatabase></Actions></ActionGroup>
  <ActionGroup id="out" scope="game" criteria="out-amina"><Properties><LoadOrder>20010</LoadOrder></Properties>
    <Actions><UpdateDatabase><Item>tests/fixtures/harness/amina-out.sql</Item></UpdateDatabase></Actions></ActionGroup>
  <ActionGroup id="shell" scope="shell" criteria="always"><Actions><UpdateDatabase><Item>tests/fixtures/harness/early.sql</Item></UpdateDatabase></Actions></ActionGroup>
</ActionGroups></Mod>`;

test("loadGame runs matching groups in load order, document order within one, and keeps the pre-deal copy", async () => {
  const hits = (db) => rows(db, "SELECT Tag FROM HarnessHits ORDER BY Seq").map((r) => r.Tag);
  const config = gameConfig({ seed: 17, options: { KeepMine: "1" }, kept: ["LEADER_AMINA"], excluded: ["LEADER_AMINA"] });
  const run = await loadGame({ modinfo: SYNTHETIC, config, requireDeal: false });
  try {
    assert.deepEqual(hits(run.db), ["always", "seed17", "keep", "amina-out", "late"]);
    assert.deepEqual(hits(run.pre), ["always", "seed17", "keep", "amina-out"]);
  } finally {
    run.close();
  }
  const other = await loadGame({ modinfo: SYNTHETIC, config: gameConfig({ seed: 170 }), requireDeal: false });
  try {
    assert.deepEqual(hits(other.db), ["always", "late"]);
  } finally {
    other.close();
  }
  const hooked = await loadGame({
    modinfo: SYNTHETIC,
    config: gameConfig({ seed: 17 }),
    requireDeal: false,
    hooks: [{ before: 20010, run: (db) => db.exec("INSERT INTO HarnessHits (Tag) VALUES ('hook')") }]
  });
  try {
    assert.deepEqual(hits(hooked.db), ["always", "hook", "seed17", "late"]);
  } finally {
    hooked.close();
  }
});

test("gameConfig writes values the way the setup does, and dealConfig mirrors it", () => {
  const spec = {
    seed: 9,
    options: { Mode: MODE.SplitMatched, KeepMine: "1", ModdedBiases: "1" },
    kept: ["LEADER_AMINA"],
    excluded: ["LEADER_XERXES"],
    modOK: ["LEADER_REMILIA"],
    notInGame: ["LEADER_PACHACUTI"]
  };
  const c = gameConfig(spec);
  assert.equal(c.LShufSeed, "9");
  assert.equal(c.LShufKeepMine, true);
  assert.equal(c.LShufModdedAbilities, false);
  assert.deepEqual(c.LShufExcludedLeaders, ["|LEADER_XERXES|"]);
  assert.equal(c[KEY.keep("LEADER_AMINA")], "1");
  assert.equal(c[KEY.keep("LEADER_XERXES")], "0");
  assert.equal(c[KEY.modOK("LEADER_REMILIA")], "1");
  assert.equal(c[KEY.modOK("LEADER_FLAN")], "0");
  assert.deepEqual(c.LShufNotInGame, ["|LEADER_PACHACUTI|"]);
  const d = dealConfig(spec);
  assert.deepEqual(Object.keys(d.options).sort(), Object.keys(OPTION_DEFAULTS).sort());
  assert.deepEqual(d.out, [
    { LeaderType: "LEADER_PACHACUTI", Reason: "notingame" },
    { LeaderType: "LEADER_XERXES", Reason: "list" }
  ]);
  assert.equal(gameConfig({ options: {} })[KEY.modOK("LEADER_REMILIA")], undefined, "no modded box: no ModOK keys");
});

test("fixtures: built from the Debug copies, which stay untouched", () => {
  const before = Object.values(SOURCES).map((f) => fs.statSync(f).mtimeMs);
  ensureFixtures(FIXTURES);
  assert.deepEqual(Object.values(SOURCES).map((f) => fs.statSync(f).mtimeMs), before);
  for (const name of FIXTURES) assert.ok(fs.existsSync(fixturePaths(name).gameplay), name);
});

test("fixtures: each holds what its name says, with no new foreign-key rows", () => {
  const base = openDb(fixturePaths("base").gameplay, { readOnly: true });
  const count = (db, sql, ...a) => db.prepare(sql).get(...a).n;
  const openUnlocks = "SELECT count(*) AS n FROM ProgressionTreeNodeUnlocks WHERE RequiredTraitType IS NULL";
  const baseOpenUnlocks = count(base, openUnlocks);
  try {
    assert.equal(count(base, "SELECT count(*) AS n FROM LeaderTraits WHERE TraitType LIKE 'TRAIT_CD_FLIP_%'"), 38);
    assert.equal(count(base, "SELECT count(*) AS n FROM LeaderTraits WHERE TraitType LIKE 'TRAIT_PARTISANS_%'"), 38);
    assert.equal(count(base, "SELECT count(*) AS n FROM sqlite_master WHERE name LIKE 'LShuf%'"), 0);
  } finally {
    base.close();
  }
  const dlc = openDb(fixturePaths("dlc-removed").gameplay, { readOnly: true });
  try {
    assert.equal(count(dlc, "SELECT count(*) AS n FROM Types WHERE Type LIKE ?", `%${DLC_MARK}%`), 0);
    assert.equal(count(dlc, "SELECT count(*) AS n FROM Leaders WHERE IsMajorLeader = 1"), 37);
    const fk = newForeignKeyRows(dlc, fixtureForeignKeys("base"));
    assert.deepEqual(fk, { fresh: [], newErrors: [] });
    assert.equal(count(dlc, openUnlocks), baseOpenUnlocks, "removing the DLC left no unlock open to everyone");
  } finally {
    dlc.close();
  }
  const added = openDb(fixturePaths("added-leader").gameplay, { readOnly: true });
  try {
    assert.equal(count(added, "SELECT count(*) AS n FROM LeaderTraits WHERE LeaderType = ?", ADDED_LEADER), 4);
    assert.deepEqual(newForeignKeyRows(added, fixtureForeignKeys("base")), { fresh: [], newErrors: [] });
  } finally {
    added.close();
  }
  const extra = openDb(fixturePaths("extra-modifier").gameplay, { readOnly: true });
  try {
    assert.equal(count(extra, "SELECT count(*) AS n FROM TraitModifiers WHERE ModifierId = ?", EXTRA_MODIFIER), 1);
    assert.deepEqual(newForeignKeyRows(extra, fixtureForeignKeys("base")), { fresh: [], newErrors: [] });
  } finally {
    extra.close();
  }
});

test("the schema and the mapping load into every fixture, twice over, and leave the game's tables alone", async () => {
  for (const fixture of FIXTURES) {
    const run = await loadGame({ fixture, requireDeal: false, allowMissing: true, stopAt: 20010 });
    try {
      assert.ok(run.ran.includes("data/schema/gameplay-tables.sql"), fixture);
      run.db.exec(fs.readFileSync("data/schema/gameplay-tables.sql", "utf8"));
      const attrs = rows(run.db, "SELECT * FROM LShufAttributeTraits");
      assert.equal(attrs.length, 7);
      for (const a of attrs) {
        assert.equal(run.db.prepare("SELECT count(*) AS n FROM Traits WHERE TraitType = ?").get(a.TraitType).n, 1);
        assert.equal(run.db.prepare("SELECT count(*) AS n FROM Attributes WHERE AttributeType = ?").get(a.AttributeType).n, 1);
      }
      assert.deepEqual(newForeignKeyRows(run.db, fixtureForeignKeys(fixture)), { fresh: [], newErrors: [] });
      const src = openDb(fixturePaths(fixture).gameplay, { readOnly: true });
      assert.deepEqual(snapshot(run.db, "SELECT * FROM LeaderTraits"), snapshot(src, "SELECT * FROM LeaderTraits"));
      src.close();
      const cfg = configFromTables(run.db);
      assert.equal(cfg.seedRows, 0);
      if (run.missing.length) {
        console.log(`${fixture}: not loaded yet: ${run.missing.map((m) => `${m.rel} (${m.owner})`).join(", ")}`);
      }
    } finally {
      run.close();
    }
  }
});
