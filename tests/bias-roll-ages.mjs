// A leader's rolled or logical start terrain is the same in every age: the next age loads other civilizations'
// start-bias rows, and the leader rolls read only the leader rows (lshuf-deal-bias-stats.js biasStats). Before, the
// game's deal at an Exploration load disagreed with the setup preview for leaders on Random roll.
import assert from "node:assert/strict";
import test from "node:test";

import { biasStats, rollBiases, tagBiases } from "../shared/deal/lshuf-deal-bias-stats.js";

const leaderRows = [
  { TableName: "StartBiasBiomes", LeaderType: "LEADER_A", CivilizationType: null, TargetType: "BIOME_DESERT", Score: 50 },
  { TableName: "StartBiasTerrains", LeaderType: "LEADER_B", CivilizationType: null, TargetType: "TERRAIN_HILL", Score: 20 },
  { TableName: "StartBiasRivers", LeaderType: "LEADER_C", CivilizationType: null, TargetType: null, Score: 10 },
  { TableName: "StartBiasAdjacentToCoasts", LeaderType: "LEADER_D", CivilizationType: null, TargetType: null, Score: 200 }
];
const antiquityCivs = [
  { TableName: "StartBiasBiomes", LeaderType: null, CivilizationType: "CIVILIZATION_ROME", TargetType: "BIOME_PLAINS", Score: 100 },
  { TableName: "StartBiasIslands", LeaderType: null, CivilizationType: "CIVILIZATION_TONGA", TargetType: null, Score: 50000 }
];
const explorationCivs = [
  { TableName: "StartBiasResources", LeaderType: null, CivilizationType: "CIVILIZATION_SPAIN", TargetType: "RESOURCE_SILVER", Score: 15 },
  { TableName: "StartBiasTerrains", LeaderType: null, CivilizationType: "CIVILIZATION_INCA", TargetType: "TERRAIN_MOUNTAIN", Score: 40 },
  { TableName: "StartBiasLakes", LeaderType: null, CivilizationType: "CIVILIZATION_BUGANDA", TargetType: null, Score: 150 }
];

test("leader rolls don't change when the age's civilization rows do", () => {
  const before = biasStats([...leaderRows, ...antiquityCivs], 2);
  const after = biasStats([...leaderRows, ...explorationCivs], 3);
  for (const seed of [1, 17, 128, 256]) {
    for (let rank = 0; rank < 40; rank += 1) {
      assert.deepEqual(rollBiases(seed, after, rank, false), rollBiases(seed, before, rank, false), `seed ${seed} rank ${rank}`);
    }
  }
});

test("a leader roll only lands on a table some leader uses", () => {
  const stats = biasStats([...leaderRows, ...explorationCivs], 3);
  const used = new Set(leaderRows.map((r) => r.TableName));
  for (let rank = 0; rank < 200; rank += 1) {
    for (const b of rollBiases(5, stats, rank, false)) assert.ok(used.has(b.table), b.table);
  }
});

test("logical start terrain from bonus tags is the same in every age", () => {
  const tags = new Map([["BIOME_DESERT", 4], ["RESOURCE_SILVER", 5], ["LAKE", 3], ["TERRAIN_HILL", 2]]);
  const before = tagBiases(biasStats([...leaderRows, ...antiquityCivs], 2), tags, 2);
  const after = tagBiases(biasStats([...leaderRows, ...explorationCivs], 3), tags, 2);
  assert.deepEqual(after, before);
});
