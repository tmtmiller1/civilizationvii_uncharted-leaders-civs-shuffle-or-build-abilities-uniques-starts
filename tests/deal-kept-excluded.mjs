// Kept leaders (Keep my leader as chosen) and left-out leaders play as shipped in every mode and under the Off
// switches: their LeaderTraits, ability modifiers, legend unlocks, biases and personality rows stay, and nobody else
// is dealt any of their pieces. A left-out LEADER_XERXES leaves LEADER_XERXES_ALT in the deal. Waits on B and A.
import assert from "node:assert/strict";
import test from "node:test";

import { gameConfig, loadGame, resultObjects, snapshot, sqlResult } from "./_harness.mjs";
import { DEAL_MODES, label, OFF_SETS, reviewAll, shippedAbilities, SPLIT_MODES } from "./_deal.mjs";
import { BIAS_TABLES, pieceId, REASON, STATUS } from "../shared/lshuf-constants.js";

const KEPT = "LEADER_AMINA";
const OUT = "LEADER_XERXES";

function untouched(run, leader, where) {
  const ability = shippedAbilities(run.pre)[leader];
  assert.equal(ability?.length, 1, `${where}: ${leader} has one ability in the fixture`);
  const same = (sql, ...args) => assert.deepEqual(snapshot(run.db, sql, ...args), snapshot(run.pre, sql, ...args), `${where}: ${leader}: ${sql}`);
  same("SELECT * FROM LeaderTraits WHERE LeaderType = ?", leader);
  same("SELECT * FROM LeaderTraits WHERE TraitType = ?", ability[0]);
  same("SELECT * FROM TraitModifiers WHERE TraitType = ?", ability[0]);
  same("SELECT * FROM ProgressionTreeNodeUnlocks WHERE RequiredTraitType = ?", ability[0]);
  same("SELECT * FROM LeaderCivPriorities WHERE Leader = ?", leader);
  same("SELECT * FROM AiLists WHERE LeaderType = ?", ability[0]);
  for (const t of BIAS_TABLES) same(`SELECT * FROM ${t} WHERE LeaderType = ?`, leader);
}

test("kept and left-out leaders stay as shipped in every mode", async () => {
  for (const Mode of DEAL_MODES) {
    for (const off of [OFF_SETS[0], OFF_SETS[OFF_SETS.length - 1]]) {
      for (const seed of [3, 200]) {
        for (const hooks of SPLIT_MODES.includes(Mode) ? [[], [reviewAll()]] : [[]]) {
          const spec = { seed, options: { Mode, KeepMine: "1", ...off }, kept: [KEPT], excluded: [OUT] };
          const where = `${label("base", spec)}${hooks.length ? " reviewed" : ""}`;
          const run = await loadGame({ config: gameConfig(spec), hooks });
          try {
            untouched(run, KEPT, where);
            untouched(run, OUT, where);
            const res = resultObjects(run.db, sqlResult(run.db));
            const row = (l) => res.leaders.find((r) => r.LeaderType === l);
            for (const [leader, reason] of [[KEPT, REASON.Kept], [OUT, REASON.List]]) {
              const r = row(leader);
              assert.deepEqual([r.Status, r.Reason], [STATUS.AsShipped, reason], `${where}: ${leader}`);
              assert.deepEqual([r.AbilityFrom, r.PersonaFrom, r.BiasFrom], [leader, leader, leader], `${where}: ${leader} from`);
              const held = res.pieces.filter((p) => p.LeaderType === leader).map((p) => p.PieceId);
              assert.deepEqual(held, [pieceId.whole(leader)], `${where}: ${leader} holds its own ability`);
              const given = res.pieces.filter((p) => p.FromLeaderType === leader && p.LeaderType !== leader);
              assert.deepEqual(given, [], `${where}: nobody else holds ${leader}'s pieces`);
              const attrs = res.attributes.filter((a) => a.FromLeaderType === leader && a.LeaderType !== leader);
              assert.deepEqual(attrs, [], `${where}: nobody else holds ${leader}'s attributes`);
            }
            const alt = row("LEADER_XERXES_ALT");
            assert.notEqual(alt.Reason, REASON.List, `${where}: LEADER_XERXES_ALT isn't left out by LEADER_XERXES`);
            if (!Object.keys(off).length) assert.equal(alt.Status, STATUS.Dealt, `${where}: LEADER_XERXES_ALT is dealt`);
          } finally {
            run.close();
          }
        }
      }
    }
  }
});
