// CONTRACTS 23, the data side: data/mapping/lshuf-civ-links.sql is what scripts/mapping/build-deps.mjs makes from the
// game's files (skipped when they aren't on this machine); Joseon's Seowon bonus isn't a dealt card; Yi Sun-sin's
// Fleet Commander bullets are one piece, and TRAIT_UNLOCK_FLEET_COMMANDER goes to whoever holds it (R5).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { RESOURCES } from "../scripts/mapping/civ-age-source.mjs";
import { gameConfig, loadGame, PROJECT_ROOT, resultObjects, sqlResult } from "./_harness.mjs";
import { SPLIT_MODES, WHOLE_MODES } from "./_deal.mjs";
import { BOUND_PIECE_OF, PIECE_NEEDS } from "../shared/lshuf-constants.js";

const LINKS = path.join(PROJECT_ROOT, "data/mapping/lshuf-civ-links.sql");
const YI = "LEADER_YI_SUN_SIN";
const FLEET = "TRAIT_UNLOCK_FLEET_COMMANDER";

test("lshuf-civ-links.sql is what build-deps.mjs makes from the game's files", { skip: !fs.existsSync(path.join(RESOURCES, "Base")) }, async () => {
  const { buildDeps, renderDeps } = await import("../scripts/mapping/build-deps.mjs");
  assert.equal(fs.readFileSync(LINKS, "utf8"), renderDeps(buildDeps()), "rerun node scripts/mapping/build-deps.mjs");
});

test("lshuf-civ-links.sql loads twice and every bound modifier's piece is accounted for", () => {
  const db = new DatabaseSync(":memory:");
  const sql = fs.readFileSync(LINKS, "utf8");
  db.exec(sql);
  db.exec(sql);
  assert.ok(db.prepare("SELECT COUNT(*) n FROM LShufCivLinks").get().n > 0);
  assert.ok(db.prepare("SELECT COUNT(*) n FROM LShufBoundModifiers").get().n > 0);
  db.exec(fs.readFileSync(path.join(PROJECT_ROOT, "data/mapping/lshuf-civ-mapping.sql"), "utf8"));
  // A piece made only of bound modifiers stays with its civilization (R4): it would arrive empty anywhere else.
  const onlyBound = db.prepare(`SELECT m.PieceId, m.Movable FROM LShufCivMapping m WHERE EXISTS (
      SELECT 1 FROM LShufCivMappingModifiers mm WHERE mm.PieceId = m.PieceId)
    AND NOT EXISTS (SELECT 1 FROM LShufCivMappingModifiers mm WHERE mm.PieceId = m.PieceId AND mm.Role = 'effect'
      AND mm.ModifierId NOT IN (SELECT ModifierId FROM LShufBoundModifiers))`).all();
  assert.deepEqual(onlyBound.map((r) => [r.PieceId, r.Movable]).sort(),
    [["CIVILIZATION_CARTHAGE__B02", 1], ["CIVILIZATION_JOSEON__B02", 0],
      ["CIVILIZATION_PIRATE_REPUBLIC__B02", 1], ["CIVILIZATION_PIRATE_REPUBLIC__B03", 1]]);
  // Each is a bound piece, bound to one anchor: out of the random deck, with the unique (CONTRACTS 29). Carthage's
  // stays a card of its own for builders; its two doubling modifiers are bound through the piece (ByPiece).
  const pieces = db.prepare("SELECT PieceId, AnchorType FROM LShufBoundPieces ORDER BY PieceId").all();
  assert.deepEqual(pieces.map((r) => r.PieceId), onlyBound.map((r) => r.PieceId).sort());
  for (const bp of pieces) {
    const anchors = db.prepare(`SELECT DISTINCT b.AnchorType a FROM LShufCivMappingModifiers mm
      JOIN LShufBoundModifiers b ON b.ModifierId = mm.ModifierId WHERE mm.PieceId = ?`).all(bp.PieceId).map((r) => r.a);
    assert.deepEqual(anchors, [bp.AnchorType], `${bp.PieceId} is bound to ${bp.AnchorType} alone`);
  }
  const byPiece = db.prepare("SELECT ModifierId, ByPiece FROM LShufBoundModifiers WHERE ByPiece IS NOT NULL ORDER BY 1").all();
  assert.deepEqual(byPiece.map((r) => [r.ModifierId, r.ByPiece]), [
    ["MOD_CIV_DOUBLE_COLONISTS", "CIVILIZATION_CARTHAGE__B02"], ["MOD_CIV_DOUBLE_MERCHANTS", "CIVILIZATION_CARTHAGE__B02"],
    ["MOD_CIV_PIRATE_REPUBLIC_CAPTURE_SETTLERS", "CIVILIZATION_PIRATE_REPUBLIC__B03"],
    ["MOD_CIV_PIRATE_REPUBLIC_DISABLE_SETTLERS", "CIVILIZATION_PIRATE_REPUBLIC__B03"],
    ["MOD_CIV_PIRATE_REPUBLIC_FLEET_COMMANDER_LAND_CLAIM_CHARGE", "CIVILIZATION_PIRATE_REPUBLIC__B02"]
  ]);
  const units = {};
  for (const r of pieces.filter((x) => x.AnchorType.startsWith("UNIT_"))) (units[r.AnchorType] ||= []).push(r.PieceId);
  assert.deepEqual(BOUND_PIECE_OF, units, "shared/lshuf-constants.js BOUND_PIECE_OF");
  // A bonus that needs another bonus (the Pirates' no-Settlers rule and the settle charge) goes to the same unique,
  // so the random deal never parts them.
  const anchorOf = new Map(pieces.map((r) => [r.PieceId, r.AnchorType]));
  for (const [piece, needs] of Object.entries(PIECE_NEEDS)) {
    assert.ok(anchorOf.get(piece), `${piece} is a bound piece`);
    assert.equal(anchorOf.get(piece), anchorOf.get(needs), `${piece} and ${needs} go with the same unique`);
  }
  db.close();
});

test("Yi Sun-sin's Fleet Commander bullets are one piece with the Discipline unlock pinned to it", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(fs.readFileSync(path.join(PROJECT_ROOT, "data/schema/gameplay-tables.sql"), "utf8"));
  db.exec(fs.readFileSync(path.join(PROJECT_ROOT, "data/mapping/lshuf-mapping.sql"), "utf8"));
  const pieces = db.prepare("SELECT PieceId, BulletCount, BulletList FROM LShufMapping WHERE LeaderType = ? AND Kind = 'bullet' ORDER BY PieceId").all(YI);
  assert.deepEqual(pieces.map((p) => [p.PieceId, p.BulletCount, p.BulletList]),
    [[`${YI}__B01`, 3, "1|3|4"], [`${YI}__B02`, 1, null]]);
  const pin = db.prepare("SELECT PieceId FROM LShufMappingUnlocks WHERE ProgressionTreeNodeType = 'NODE_CIVIC_AQ_MAIN_DISCIPLINE' AND TargetType = 'UNIT_FLEET_COMMANDER'").get();
  assert.equal(pin?.PieceId, `${YI}__B01`);
  db.close();
});

// The leader that should hold the Fleet Commander trait after the deal: the B01 holder (split) or the holder of
// Yi's whole ability (whole); Yi himself when neither moved.
function fleetHolder(res) {
  const piece = res.pieces.find((p) => p.PieceId === `${YI}__B01`);
  if (piece) return piece.LeaderType;
  const whole = res.pieces.find((p) => p.FromLeaderType === YI && p.Kind !== "bullet");
  return whole ? whole.LeaderType : YI;
}

test("TRAIT_UNLOCK_FLEET_COMMANDER follows the piece that promises Fleet Commanders", async () => {
  let checked = 0;
  let moved = 0;
  for (const Mode of [...WHOLE_MODES, ...SPLIT_MODES]) {
    for (const seed of [3, 41, 200]) {
      const spec = { seed, options: { Mode } };
      const run = await loadGame({ config: gameConfig(spec) });
      try {
        const where = `${Mode} seed ${seed}`;
        const res = resultObjects(run.db, sqlResult(run.db));
        if (!res.pieces.some((p) => p.FromLeaderType === YI)) continue;
        const want = fleetHolder(res);
        checked += 1;
        if (want !== YI) moved += 1;
        const holders = run.db.prepare("SELECT LeaderType FROM LeaderTraits WHERE TraitType = ? ORDER BY 1").all(FLEET).map((r) => r.LeaderType);
        assert.deepEqual(holders, [want], `${where}: the trait sits with ${want}`);
        const unlock = run.db.prepare("SELECT RequiredTraitType FROM ProgressionTreeNodeUnlocks WHERE ProgressionTreeNodeType = 'NODE_CIVIC_AQ_MAIN_DISCIPLINE' AND TargetType = 'UNIT_FLEET_COMMANDER'").get();
        const traitsOfWant = run.db.prepare("SELECT TraitType FROM LeaderTraits WHERE LeaderType = ?").all(want).map((r) => r.TraitType);
        assert.ok(traitsOfWant.includes(unlock.RequiredTraitType), `${where}: ${want} holds the Discipline unlock's trait ${unlock.RequiredTraitType}`);
        assert.deepEqual(run.db.prepare("PRAGMA foreign_key_check(LeaderTraits)").all(), [], `${where}: LeaderTraits keys`);
      } finally {
        run.close();
      }
    }
  }
  assert.ok(checked > 0 && moved > 0, `Yi was dealt in ${checked} games, his Fleet Commanders moved in ${moved}`);
});
