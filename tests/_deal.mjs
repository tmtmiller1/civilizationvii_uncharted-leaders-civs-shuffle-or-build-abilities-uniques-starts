// Shared pieces for the deal tests: the option matrix, one call that loads a fixture for a setup and runs both
// runners, and the checks on result rows that the contract states (CONTRACTS 5.3, 5.4; SPEC section 3).
// Owned by workstream E.
import assert from "node:assert/strict";

import {
  dealConfig,
  dealModule,
  fixtureAge,
  gameConfig,
  jsResult,
  loadGame,
  readTableFrom,
  resultObjects,
  rows,
  DEAL_LOAD_ORDER,
  need,
  sqlResult,
  WaitingError
} from "./_harness.mjs";
import { MODDED_LEADERS, VANILLA_LEADERS } from "../shared/lshuf-known-leaders.js";
import {
  A_MODE, B_MODE, DEALING, MODE, MODE_CUSTOM, ONOFF, PERSONA, pieceId, PIECE_KIND, STATUS, T_MODE, TRAIT
} from "../shared/lshuf-constants.js";

export const MODES = Object.values(MODE);
// The modes that deal abilities. The two agenda presets (CONTRACTS 33) leave abilities and start terrain on Base game;
// tests/deal-human-own.mjs covers them.
export const AGENDA_MODES = [MODE.AgendasOnly, MODE.AgendasAttributes];
export const DEAL_MODES = MODES.filter((m) => m !== MODE.None && !AGENDA_MODES.includes(m));
export const WHOLE_MODES = [MODE.SwapAbilities, MODE.SwapLeaders];
export const SPLIT_MODES = [MODE.SplitMatched, MODE.SplitRandom];
export const OFF_SETS = [
  {},
  { Biases: ONOFF.Off },
  { Abilities: ONOFF.Off },
  { Attributes: ONOFF.Off },
  { Biases: ONOFF.Off, Abilities: ONOFF.Off, Attributes: ONOFF.Off }
];
// Custom combinations of the three parts (CONTRACTS 15), as options objects.
export const CUSTOM_COMBOS = [
  { Mode: MODE_CUSTOM, Abilities: A_MODE.Whole, Attributes: T_MODE.Paired, Biases: B_MODE.Rolled },
  { Mode: MODE_CUSTOM, Abilities: A_MODE.Split, Attributes: T_MODE.Paired, Biases: B_MODE.Paired },
  { Mode: MODE_CUSTOM, Abilities: A_MODE.Whole, Attributes: T_MODE.Normal, Biases: B_MODE.Matched },
  { Mode: MODE_CUSTOM, Abilities: A_MODE.Normal, Attributes: T_MODE.Random, Biases: B_MODE.Paired },
  { Mode: MODE_CUSTOM, Abilities: A_MODE.Split, Attributes: ONOFF.Off, Biases: B_MODE.Normal },
  { Mode: MODE_CUSTOM, Abilities: A_MODE.Normal, Attributes: T_MODE.Normal, Biases: B_MODE.Rolled }
];
export const DEALINGS = Object.values(DEALING);
export const PERSONAS = Object.values(PERSONA);

// LSHUF_TEST_SEEDS="1,2,3" widens or narrows every sampled matrix.
export const SAMPLE_SEEDS = process.env.LSHUF_TEST_SEEDS
  ? process.env.LSHUF_TEST_SEEDS.split(",").map(Number)
  : [1, 17, 256];

export const offLabel = (off) => Object.keys(off).join("+") || "none off";

// Marks every mapping row reviewed, so the split modes deal bullets instead of whole abilities (rows ship 0).
export const reviewAll = (leaders = null) => ({
  before: 20010,
  run: (db) =>
    leaders
      ? db.prepare(`UPDATE LShufMapping SET Reviewed = 1 WHERE LeaderType IN (${leaders.map(() => "?").join(",")})`).run(...leaders)
      : db.exec("UPDATE LShufMapping SET Reviewed = 1")
});

// A game on a later age's fixture loads for that age unless the spec names one.
const withAge = (fixture, spec) => (spec.age === undefined ? { ...spec, age: fixtureAge(fixture) } : spec);

// For the JS runner alone: every group before the deal (DEAL_LOAD_ORDER), so the deal SQL's own state doesn't matter.
// Until B's generated groups exist, the schema and the mapping only, with LShufKnownLeaders filled from
// shared/lshuf-known-leaders.js the way B's generator is to fill it (CONTRACTS 4.1); `run.jsOnly` says so.
export async function loadForJs({ fixture = "base", spec: given = {}, hooks = [] } = {}) {
  const spec = withAge(fixture, given);
  try {
    need("data/generated/modinfo-groups.xml");
    const config = gameConfig(spec);
    const run = await loadGame({ fixture, config, hooks, stopAt: DEAL_LOAD_ORDER, requireDeal: false });
    return Object.assign(run, { jsOnly: false });
  } catch (e) {
    if (!(e instanceof WaitingError) || e.owner !== "B") throw e;
    const known = {
      before: 20010,
      run: (db) => {
        const ins = db.prepare("INSERT OR IGNORE INTO LShufKnownLeaders (LeaderType, IsModded, ModId) VALUES (?, ?, ?)");
        for (const l of VANILLA_LEADERS) ins.run(l, 0, null);
        for (const m of MODDED_LEADERS) ins.run(m.leaderType, 1, m.modId);
      }
    };
    const run = await loadGame({ fixture, config: gameConfig(spec), hooks: [known, ...hooks], requireDeal: false });
    console.log(`JS only (${e.message}); LShufKnownLeaders filled by the test`);
    return Object.assign(run, { jsOnly: true });
  }
}

// Loads `fixture` for `spec` (see gameConfig) and returns the run plus both runners' normalized results.
export async function runBoth({ fixture = "base", spec: given = {}, hooks = [], js = true } = {}) {
  const spec = withAge(fixture, given);
  const deal = js ? await dealModule() : null;
  const run = await loadGame({ fixture, config: gameConfig(spec), hooks });
  const out = { run, sql: sqlResult(run.db) };
  if (deal) {
    const result = deal.computeDeal(deal.buildDealInput(readTableFrom(run.pre), dealConfig(spec)));
    out.jsRaw = result;
    out.js = jsResult(run.db, result);
  }
  out.objects = (which = "sql") => resultObjects(run.db, out[which]);
  return out;
}

export const label = (fixture, spec) =>
  `${fixture} seed ${spec.seed} ${spec.options?.Mode} ${spec.options?.Dealing || ""} ${offLabel(
    Object.fromEntries(["Biases", "Abilities", "Attributes"].filter((k) => spec.options?.[k] === ONOFF.Off).map((k) => [k, 1]))
  )}`.trim();

// The shipped ability trait of each major leader: the leader's trait whose Traits.Name is set (CONTRACTS 6).
export function shippedAbilities(pre) {
  const out = {};
  for (const r of rows(
    pre,
    `SELECT lt.LeaderType, lt.TraitType FROM LeaderTraits lt JOIN Traits t ON t.TraitType = lt.TraitType
     JOIN Leaders l ON l.LeaderType = lt.LeaderType WHERE l.IsMajorLeader = 1 AND t.Name IS NOT NULL`
  )) {
    (out[r.LeaderType] = out[r.LeaderType] || []).push(r.TraitType);
  }
  return out;
}

export function shippedAttributes(pre) {
  const out = {};
  for (const r of rows(
    pre,
    "SELECT LeaderType, TraitType FROM LeaderTraits WHERE TraitType IN (SELECT TraitType FROM LShufAttributeTraits)"
  )) {
    (out[r.LeaderType] = out[r.LeaderType] || []).push(r.TraitType);
  }
  return out;
}

// The original modifier ids behind a leader's ability rows after the deal: modifiers on the traits it holds that
// have a Name (an ability) or are TRAIT_LSHUF_<LEADER>, with copied ids mapped back (LSHUF_<LEADER>__<ORIGINAL>).
export function effectiveAbilityModifiers(db, leader) {
  const list = rows(
    db,
    `SELECT tm.ModifierId FROM LeaderTraits lt JOIN Traits t ON t.TraitType = lt.TraitType
     JOIN TraitModifiers tm ON tm.TraitType = lt.TraitType
     WHERE lt.LeaderType = ? AND (t.Name IS NOT NULL OR lt.TraitType = ?)`,
    leader,
    TRAIT.dealt(leader)
  );
  const prefix = `LSHUF_${leader}__`;
  return new Set(list.map((r) => (r.ModifierId.startsWith(prefix) ? r.ModifierId.slice(prefix.length) : r.ModifierId)));
}

const has = (axes, axis) => (axes || "").split("|").includes(axis);

// Checks on one result (plain objects) that hold for any fixture: CONTRACTS 5.3 and SPEC "The deal".
export function checkDealShape(result, { pre, spec, where }) {
  const options = spec.options || {};
  const mode = options.Mode || MODE.None;
  const abilitiesOff = options.Abilities === ONOFF.Off;
  const attributesOff = options.Attributes === ONOFF.Off;
  const majors = rows(pre, "SELECT LeaderType FROM Leaders WHERE IsMajorLeader = 1").map((r) => r.LeaderType);
  const resultLeaders = result.leaders.map((r) => r.LeaderType).sort();
  assert.deepEqual(resultLeaders, [...majors].sort(), `${where}: LShufResultLeaders has one row per major leader`);
  const byLeader = Object.fromEntries(result.leaders.map((r) => [r.LeaderType, r]));
  const piecesOf = (l) => result.pieces.filter((p) => p.LeaderType === l);
  const abilityPool = result.leaders.filter((r) => has(r.Axes, "ABILITY")).map((r) => r.LeaderType);

  for (const r of result.leaders) {
    assert.ok([STATUS.Dealt, STATUS.AsShipped].includes(r.Status), `${where}: ${r.LeaderType} status ${r.Status}`);
    if (r.Status === STATUS.AsShipped) {
      assert.equal(r.Axes, null, `${where}: as-shipped ${r.LeaderType} has no axes`);
      assert.ok(r.Reason, `${where}: as-shipped ${r.LeaderType} names a reason`);
    } else {
      assert.ok(r.Axes, `${where}: dealt ${r.LeaderType} names its axes`);
    }
  }
  if (mode === MODE.None) {
    assert.deepEqual(abilityPool, [], `${where}: mode None deals no abilities`);
  }

  // Pieces: SortIndex runs 0.. in order; each dealt piece is held once; each holder gets back as many as it gave.
  for (const l of majors) {
    const mine = piecesOf(l).map((p) => p.SortIndex).sort((a, b) => a - b);
    assert.deepEqual(mine, mine.map((_, i) => i), `${where}: ${l} SortIndex runs from 0`);
  }
  const ids = result.pieces.filter((p) => abilityPool.includes(p.LeaderType)).map((p) => p.PieceId);
  assert.equal(new Set(ids).size, ids.length, `${where}: no piece is dealt twice`);
  for (const l of abilityPool) {
    const given = result.pieces.filter((p) => p.FromLeaderType === l).length;
    assert.equal(piecesOf(l).length, given, `${where}: ${l} holds as many pieces as it gave up`);
    for (const p of piecesOf(l)) assert.ok(abilityPool.includes(p.FromLeaderType), `${where}: ${p.PieceId} came from the pool`);
    for (const p of piecesOf(l)) assert.ok(Object.values(PIECE_KIND).includes(p.Kind), `${where}: kind ${p.Kind}`);
  }
  if (WHOLE_MODES.includes(mode) && !abilitiesOff) {
    const from = abilityPool.map((l) => byLeader[l].AbilityFrom).sort();
    assert.deepEqual(from, [...abilityPool].sort(), `${where}: whole abilities are a permutation of the pool`);
    for (const l of abilityPool) {
      const want = [[pieceId.whole(byLeader[l].AbilityFrom), PIECE_KIND.Whole]];
      assert.deepEqual(piecesOf(l).map((p) => [p.PieceId, p.Kind]), want, `${where}: ${l} holds one whole ability`);
    }
  }
  for (const r of result.leaders) {
    if (r.Status !== STATUS.AsShipped || abilitiesOff) continue;
    assert.deepEqual(
      piecesOf(r.LeaderType).map((p) => [p.PieceId, p.FromLeaderType, p.Kind]),
      [[pieceId.whole(r.LeaderType), r.LeaderType, PIECE_KIND.Whole]],
      `${where}: as-shipped ${r.LeaderType} holds its own whole ability`
    );
    assert.equal(r.AbilityFrom, r.LeaderType);
  }

  // Attributes: a dealt attribute is held once; with attributes Off the pool holds only the equal-actions trait.
  const attrPool = result.leaders.filter((r) => has(r.Axes, "ATTRIBUTES")).map((r) => r.LeaderType);
  const dealtAttrs = result.attributes.filter((a) => attrPool.includes(a.LeaderType) && a.FromLeaderType != null);
  const attrKeys = dealtAttrs.map((a) => `${a.FromLeaderType}|${a.TraitType}`);
  if (mode !== MODE.SwapAbilities) {
    assert.equal(new Set(attrKeys).size, attrKeys.length, `${where}: no leader's attribute is dealt twice`);
  }
  if (attributesOff) {
    for (const a of result.attributes.filter((x) => attrPool.includes(x.LeaderType))) {
      assert.deepEqual([a.TraitType, a.FromLeaderType], [TRAIT.EqualActions, null], `${where}: attributes Off`);
    }
  }
  return { abilityPool, attrPool, byLeader };
}

// Each attribute a pool leader gave up comes back exactly once (split modes and Swap whole leaders), checked against
// the shipped LeaderTraits rows.
export function checkAttributesConserved(result, { pre, where, attrPool }) {
  const shipped = shippedAttributes(pre);
  const given = attrPool.flatMap((l) => (shipped[l] || []).map((t) => `${l}|${t}`)).sort();
  const got = result.attributes
    .filter((a) => attrPool.includes(a.LeaderType) && a.FromLeaderType != null)
    .map((a) => `${a.FromLeaderType}|${a.TraitType}`)
    .sort();
  assert.deepEqual(got, given, `${where}: every attribute given up is dealt exactly once`);
}

// In the split modes with the mapping reviewed: every movable bullet of a pool leader is dealt exactly once.
export function checkBulletsConserved(result, { pre, where, abilityPool }) {
  const bullets = rows(pre, "SELECT PieceId, LeaderType FROM LShufMapping WHERE Kind = 'bullet' AND Movable = 1");
  const dealt = new Map(result.pieces.filter((p) => abilityPool.includes(p.LeaderType)).map((p) => [p.PieceId, p]));
  for (const b of bullets.filter((x) => abilityPool.includes(x.LeaderType))) {
    const p = dealt.get(b.PieceId);
    if (!p) {
      // A leader goes in whole when it isn't split (modded check 3); then its __WHOLE piece is dealt instead.
      assert.ok(dealt.has(pieceId.whole(b.LeaderType)), `${where}: ${b.PieceId} is dealt (or its leader went whole)`);
      continue;
    }
    assert.equal(p.FromLeaderType, b.LeaderType, `${where}: ${b.PieceId} source`);
    assert.equal(p.Kind, PIECE_KIND.Bullet);
  }
}
