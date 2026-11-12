// Other mods' data changes win (SPEC "Living with other mods", workspace rules): a leader another mod adds plays as
// shipped unless it's keyed in, a modifier another mod adds to a vanilla ability travels with that ability (as a
// remainder piece in the split modes, copied under LSHUF_<RECEIVER>__ with every argument as it is), and a bias row
// another mod removed stays removed. Waits on B and A.
import assert from "node:assert/strict";
import test from "node:test";

import { gameConfig, loadGame, resultObjects, rows, snapshot, sqlResult } from "./_harness.mjs";
import { DEAL_MODES, effectiveAbilityModifiers, label, reviewAll, SAMPLE_SEEDS, SPLIT_MODES, WHOLE_MODES } from "./_deal.mjs";
import {
  ADDED_ABILITY,
  ADDED_LEADER,
  EXTRA_MODIFIER,
  REMOVED_BIAS
} from "../scripts/fixtures/build-fixtures.mjs";
import { BIAS_TABLES, copiedModifierId, MODE, pieceId, PIECE_KIND, REASON, STATUS } from "../shared/lshuf-constants.js";

const results = (run) => resultObjects(run.db, sqlResult(run.db));

test("a leader another mod adds plays as shipped", async () => {
  for (const Mode of DEAL_MODES) {
    for (const seed of SAMPLE_SEEDS) {
      const spec = { seed, options: { Mode } };
      const where = label("added-leader", spec);
      const run = await loadGame({ fixture: "added-leader", config: gameConfig(spec) });
      try {
        const same = (sql) => assert.deepEqual(snapshot(run.db, sql, ADDED_LEADER), snapshot(run.pre, sql, ADDED_LEADER), `${where}: ${sql}`);
        same("SELECT * FROM LeaderTraits WHERE LeaderType = ?");
        for (const t of BIAS_TABLES) same(`SELECT * FROM ${t} WHERE LeaderType = ?`);
        const tm = `SELECT * FROM TraitModifiers WHERE TraitType = '${ADDED_ABILITY}'`;
        assert.deepEqual(snapshot(run.db, tm), snapshot(run.pre, tm), `${where}: its ability's modifiers`);
        const holders = rows(run.db, "SELECT LeaderType FROM LeaderTraits WHERE TraitType = ?", ADDED_ABILITY).map((r) => r.LeaderType);
        assert.deepEqual(holders, [ADDED_LEADER], `${where}: nobody else holds its ability`);
        const res = results(run);
        const r = res.leaders.find((x) => x.LeaderType === ADDED_LEADER);
        assert.deepEqual([r?.Status, r?.Reason], [STATUS.AsShipped, REASON.Unknown], `${where}: result row`);
        const holdersOfPieces = res.pieces.filter((p) => p.FromLeaderType === ADDED_LEADER).map((p) => p.LeaderType);
        assert.deepEqual(holdersOfPieces, [ADDED_LEADER], `${where}: only it holds its pieces`);
      } finally {
        run.close();
      }
    }
  }
});

test("the same leader, keyed in, is dealt", async () => {
  const keyIn = { before: 20010, run: (db) => db.prepare("INSERT OR IGNORE INTO LShufKnownLeaders (LeaderType, IsModded, ModId) VALUES (?, 0, NULL)").run(ADDED_LEADER) };
  for (const Mode of [MODE.SwapAbilities, MODE.SwapLeaders]) {
    const spec = { seed: 17, options: { Mode } };
    const run = await loadGame({ fixture: "added-leader", config: gameConfig(spec), hooks: [keyIn] });
    try {
      const r = results(run).leaders.find((x) => x.LeaderType === ADDED_LEADER);
      assert.equal(r?.Status, STATUS.Dealt, `${label("added-leader", spec)}: keyed-in leader`);
    } finally {
      run.close();
    }
  }
});

test("a bias row another mod removed stays removed", async () => {
  const { table, LeaderType, BiomeType } = REMOVED_BIAS;
  for (const Mode of [MODE.None, ...DEAL_MODES]) {
    const run = await loadGame({ fixture: "added-leader", config: gameConfig({ seed: 17, options: { Mode } }) });
    try {
      if (Mode === MODE.None) {
        const n = run.db.prepare(`SELECT count(*) AS n FROM ${table} WHERE LeaderType = ? AND BiomeType = ?`).get(LeaderType, BiomeType).n;
        assert.equal(n, 0, `${Mode}: the removed row isn't put back`);
      }
      const back = results(run).biases.filter(
        (b) => b.TableName === table && b.TargetType === BiomeType && b.Origin === "shipped" && b.LeaderType === LeaderType
      );
      assert.deepEqual(back, [], `${Mode}: LShufResultBiases doesn't list the removed row as shipped`);
    } finally {
      run.close();
    }
  }
});

test("an extra modifier on a vanilla ability goes wherever that ability goes", async () => {
  for (const Mode of WHOLE_MODES) {
    for (const seed of SAMPLE_SEEDS) {
      const spec = { seed, options: { Mode } };
      const run = await loadGame({ fixture: "extra-modifier", config: gameConfig(spec) });
      try {
        const res = results(run);
        const holder = res.leaders.find((r) => r.AbilityFrom === "LEADER_AMINA")?.LeaderType;
        assert.ok(holder, `${label("extra-modifier", spec)}: someone holds Amina's ability`);
        assert.ok(effectiveAbilityModifiers(run.db, holder).has(EXTRA_MODIFIER), `${label("extra-modifier", spec)}: ${holder} has the extra modifier`);
      } finally {
        run.close();
      }
    }
  }
});

test("split modes, mapping reviewed: the extra modifier travels in Amina's remainder piece", async () => {
  for (const Mode of SPLIT_MODES) {
    for (const seed of SAMPLE_SEEDS) {
      const spec = { seed, options: { Mode } };
      const where = `${label("extra-modifier", spec)} reviewed`;
      const run = await loadGame({ fixture: "extra-modifier", config: gameConfig(spec), hooks: [reviewAll(["LEADER_AMINA"])] });
      try {
        const listed = rows(run.pre, "SELECT * FROM LShufMappingModifiers WHERE ModifierId = ?", EXTRA_MODIFIER);
        assert.deepEqual(listed, [], `${where}: the mapping doesn't list the extra modifier`);
        const res = results(run);
        const rest = res.pieces.find((p) => p.PieceId === pieceId.rest("LEADER_AMINA"));
        assert.ok(rest, `${where}: a ${pieceId.rest("LEADER_AMINA")} piece is dealt`);
        assert.deepEqual([rest.Kind, rest.FromLeaderType], [PIECE_KIND.Remainder, "LEADER_AMINA"]);
        const holder = rest.LeaderType;
        assert.ok(effectiveAbilityModifiers(run.db, holder).has(EXTRA_MODIFIER), `${where}: ${holder} has the extra modifier`);
        if (holder !== "LEADER_AMINA") {
          const copy = copiedModifierId(holder, EXTRA_MODIFIER);
          // The Tooltip too: a yield line names the ability the bonus came from, not the holder's.
          const args = (db, id) => rows(db, "SELECT Name, Extra, SecondExtra, Type, Value FROM ModifierArguments WHERE ModifierId = ?", id).map((a) => JSON.stringify(a)).sort();
          assert.deepEqual(args(run.db, copy), args(run.pre, EXTRA_MODIFIER), `${where}: every argument copied as it is`);
        }
      } finally {
        run.close();
      }
    }
  }
});
