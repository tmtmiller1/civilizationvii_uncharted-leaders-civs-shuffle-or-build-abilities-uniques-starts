// Workstream D's revealLines(leaderType, deal, lookups, opts) (ui/game/lshuf-reveal-lines.js): the
// "Who got what" lines under the ability text in the diplomacy leader panel. Plain result rows and a compose that
// echoes its key and arguments, so each line's key and origin can be read off.
import assert from "node:assert/strict";
import test from "node:test";

import { importShipped } from "./_harness.mjs";

const load = () => importShipped("ui/game/lshuf-reveal-lines.js");

// The piece text the generated keys hold, and the shipped descriptions the fallbacks split.
const TEXT = {
  LOC_LSHUF_PIECE_LEADER_B__B1: "Horses +1",
  LOC_A_DESC: "[BLIST][LI]a one[LI]a two[/BLIST]",
  LOC_E_DESC: "whole text no bullets",
  LOC_C_DESC: "[BLIST][LI]c one[/BLIST]"
};
const ABILITY = {
  LEADER_A: { name: "LOC_A_NAME", description: "LOC_A_DESC" },
  LEADER_C: { name: "LOC_C_NAME", description: "LOC_C_DESC" },
  LEADER_E: { name: "LOC_E_NAME", description: "LOC_E_DESC" }
};
const ATTRIBUTE = { TRAIT_CULT: "Cultural", TRAIT_ECON: "Economic" };

// A piece key the text file doesn't hold composes to itself, as in the game; every other key echoes its arguments.
const compose = (key, ...args) => {
  if (key in TEXT) return TEXT[key];
  return key.startsWith("LOC_LSHUF_PIECE_LEADER") ? key : `${key}(${args.join("|")})`;
};
const lookups = {
  compose,
  abilityOf: (leaderType) => ABILITY[leaderType] || null,
  leaderName: (leaderType) => String(leaderType).replace(/^LEADER_/, ""),
  attributeName: (traitType) => ATTRIBUTE[traitType] || null,
  whyOf: (leaderType) => (leaderType === "LEADER_D" ? "script" : null)
};

const deal = {
  leaders: [
    { LeaderType: "LEADER_A", Status: "dealt", Axes: "|ABILITY|ATTRIBUTES|BIASES|", Reason: null, AbilityFrom: null,
      PersonaFrom: "LEADER_B", BiasFrom: null },
    { LeaderType: "LEADER_B", Status: "dealt", Axes: "|ABILITY|BIASES|", Reason: null, AbilityFrom: "LEADER_C",
      PersonaFrom: "LEADER_C", BiasFrom: "LEADER_C" },
    { LeaderType: "LEADER_C", Status: "asshipped", Axes: null, Reason: "kept", AbilityFrom: null,
      PersonaFrom: "LEADER_C", BiasFrom: "LEADER_C" },
    { LeaderType: "LEADER_D", Status: "asshipped", Axes: null, Reason: "modded-notok", AbilityFrom: null,
      PersonaFrom: "LEADER_D", BiasFrom: "LEADER_D" },
    { LeaderType: "LEADER_F", Status: "dealt", Axes: "|BIASES|", Reason: null, AbilityFrom: null,
      PersonaFrom: "LEADER_F", BiasFrom: null }
  ],
  pieces: [
    { LeaderType: "LEADER_A", PieceId: "LEADER_E", FromLeaderType: "LEADER_E", Kind: "whole", SortIndex: 3 },
    { LeaderType: "LEADER_A", PieceId: "LEADER_B__B1", FromLeaderType: "LEADER_B", Kind: "bullet", SortIndex: 0 },
    { LeaderType: "LEADER_A", PieceId: "LEADER_A__B2", FromLeaderType: "LEADER_A", Kind: "bullet", SortIndex: 1 },
    { LeaderType: "LEADER_A", PieceId: "LEADER_C__REST", FromLeaderType: "LEADER_C", Kind: "remainder", SortIndex: 2 },
    { LeaderType: "LEADER_B", PieceId: "LEADER_C", FromLeaderType: "LEADER_C", Kind: "whole", SortIndex: 0 }
  ],
  attributes: [
    { LeaderType: "LEADER_A", TraitType: "TRAIT_CULT", FromLeaderType: "LEADER_B", Copy: 0 },
    { LeaderType: "LEADER_A", TraitType: "TRAIT_ECON", FromLeaderType: "LEADER_A", Copy: 0 },
    { LeaderType: "LEADER_A", TraitType: "TRAIT_UNKNOWN", FromLeaderType: null, Copy: 0 },
    { LeaderType: "LEADER_B", TraitType: "TRAIT_CULT", FromLeaderType: "LEADER_A", Copy: 0 }
  ],
  biases: [
    { TableName: "StartBiasTerrains", LeaderType: "LEADER_A", TargetType: "TERRAIN_HILL", Score: 5, Origin: "tags" },
    { TableName: "StartBiasRivers", LeaderType: "LEADER_F", TargetType: null, Score: 5, Origin: "rolled" }
  ]
};

test("split ability: one bullet per bonus, in SortIndex order, each with where it came from", async () => {
  const { revealLines } = await load();
  const lines = revealLines("LEADER_A", deal, lookups, { seed: 42, isLocal: true });
  assert.deepEqual(lines.slice(0, 4), [
    { kind: "bullet", text: "Horses +1", from: "LOC_LSHUF_DIPLO_FROM(B)", own: false },
    { kind: "bullet", text: "a two", from: "LOC_LSHUF_DIPLO_OWN()", own: true },
    { kind: "bullet", text: "LOC_LSHUF_PIECE_REST(LOC_C_NAME)", from: "LOC_LSHUF_DIPLO_FROM(C)", own: false },
    { kind: "bullet", text: "whole text no bullets", from: "LOC_LSHUF_DIPLO_FROM(E)", own: false }
  ]);
});

test("attributes, matched terrain, AI behavior and the shuffle number follow the bullets for the local leader", async () => {
  const { revealLines } = await load();
  const lines = revealLines("LEADER_A", deal, lookups, { seed: 42, isLocal: true });
  assert.deepEqual(lines.slice(4), [
    { kind: "line", text: "LOC_LSHUF_DIPLO_ATTRIBUTES(LOC_LSHUF_DIPLO_ITEM_FROM(Cultural|B), Economic)" },
    { kind: "line", text: "LOC_LSHUF_DIPLO_TERRAIN_MATCHED()" },
    { kind: "line", text: "LOC_LSHUF_DIPLO_BEHAVIOR_FROM(B)" },
    { kind: "line", text: "LOC_LSHUF_DEAL_NUMBER(42)" }
  ]);
});

test("whole ability: one line naming the leader it came from; attributes not dealt are left out", async () => {
  const { revealLines } = await load();
  assert.deepEqual(revealLines("LEADER_B", deal, lookups, { seed: 42, isLocal: false }), [
    { kind: "line", text: "LOC_LSHUF_DIPLO_ABILITY_FROM(C)" },
    { kind: "line", text: "LOC_LSHUF_DIPLO_TERRAIN_FROM(C)" },
    { kind: "line", text: "LOC_LSHUF_DIPLO_BEHAVIOR_FROM(C)" }
  ]);
});

test("rolled terrain with nothing else dealt gives the rolled line only", async () => {
  const { revealLines } = await load();
  assert.deepEqual(revealLines("LEADER_F", deal, lookups), [
    { kind: "line", text: "LOC_LSHUF_DIPLO_TERRAIN_DRAWN()" }
  ]);
});

test("a leader left out gets its reason, with the setup check's detail for a modded leader", async () => {
  const { revealLines } = await load();
  assert.deepEqual(revealLines("LEADER_C", deal, lookups, { seed: 42, isLocal: true }), [
    { kind: "line", text: "LOC_LSHUF_DIPLO_NOT_SHUFFLED(LOC_LSHUF_REASON_KEPT())" },
    { kind: "line", text: "LOC_LSHUF_DEAL_NUMBER(42)" }
  ]);
  assert.deepEqual(revealLines("LEADER_D", deal, lookups), [
    { kind: "line", text: "LOC_LSHUF_DIPLO_NOT_SHUFFLED(LOC_LSHUF_WHY_SCRIPT())" }
  ]);
});

test("a leader the deal doesn't know gives no lines", async () => {
  const { revealLines } = await load();
  assert.deepEqual(revealLines("LEADER_NOBODY", deal, lookups, { seed: 1, isLocal: true }), []);
});
