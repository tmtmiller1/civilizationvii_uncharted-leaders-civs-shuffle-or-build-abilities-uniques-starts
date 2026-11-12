// A civilization's bonus outside its own age (Test of Time): the game attaches that age's version of the modifiers
// behind a bullet (Spain's coastal yields are TRAIT_MOD_TOT_AQ_COASTAL_SETTLEMENT_YIELDS in Antiquity), so the apply
// copies those (LShufCivMappingAgeModifiers), the giver doesn't keep them, and a bullet the age drops
// (LShufCivPieceDead: Spain's town conversion in Antiquity) is out of the deal and can't be taken. Found in a lab game
// on 2026-11-11: Greece dealt Spain's first bonus in Antiquity got none of its yields.
import assert from "node:assert/strict";
import test from "node:test";

import { assertSameResult, rows } from "./_harness.mjs";
import { label, runBoth } from "./_deal.mjs";
import { BUILD, CA_MODE, MODE } from "../shared/lshuf-constants.js";

const AMINA = "LEADER_AMINA";
const ROME = "CIVILIZATION_ROME";
const SPAIN = "CIVILIZATION_SPAIN";
const CIVA = (civ) => `TRAIT_LSHUF_CIVA_${civ}`;
const COASTAL_AQ = "TRAIT_MOD_TOT_AQ_COASTAL_SETTLEMENT_YIELDS";
const ALTAR_AQ = "TRAIT_MOD_TOT_AQ_ALTAR_SETTLEMENT_YIELDS";
const modsOf = (db, trait) => rows(db, "SELECT ModifierId FROM TraitModifiers WHERE TraitType = ? ORDER BY 1", trait).map((r) => r.ModifierId);

async function both(spec, fixture = "base") {
  const r = await runBoth({ fixture, spec });
  try {
    assertSameResult(r.js, r.sql, `${label(fixture, spec)}: computeDeal vs SQL`);
    return { res: r.objects("sql"), run: r.run, close: () => r.run.close() };
  } catch (e) {
    r.run.close();
    throw e;
  }
}

test("Antiquity: Rome built with Spain's two bonuses holds the coastal yields' Antiquity modifiers; the town conversion isn't dealt", async () => {
  const builder = { leader: AMINA, civ: ROME, pieces: [BUILD.civBullet(SPAIN, 1), BUILD.civBullet(SPAIN, 2)] };
  const r = await both({ seed: 51, options: { Mode: MODE.None, CivAbilities: CA_MODE.Split }, builder });
  try {
    const held = r.res.civPieces.filter((p) => p.CivilizationType === ROME && p.Kind === "bullet").map((p) => p.PieceId);
    assert.deepEqual(held, [BUILD.civBullet(SPAIN, 1)], "Rome holds Spain's first bonus and not the one Antiquity drops");
    const everyone = r.res.civPieces.filter((p) => p.Kind === "bullet").map((p) => p.PieceId);
    assert.ok(!everyone.includes(BUILD.civBullet(SPAIN, 2)), "nobody is dealt the town conversion in Antiquity");
    assert.ok(!everyone.includes(BUILD.civBullet(SPAIN, 3)), "nor Spain's favored wonder");
    const rome = modsOf(r.run.db, CIVA(ROME));
    assert.ok(rome.includes(`LSHUF_${ROME}__${COASTAL_AQ}`), `Rome's dealt ability carries the coastal yields: ${rome.join(", ")}`);
    assert.ok(rome.includes(`LSHUF_${ROME}__${ALTAR_AQ}`), "and the Altar half");
    const spain = modsOf(r.run.db, CIVA(SPAIN));
    assert.ok(!spain.some((id) => id.endsWith(COASTAL_AQ) || id.endsWith(ALTAR_AQ)), `Spain doesn't keep them: ${spain.join(", ")}`);
    // The copy keeps the game's own label, so the yield line names where the bonus came from.
    const tip = (id) => rows(r.run.db, "SELECT Value FROM ModifierArguments WHERE ModifierId = ? AND Name = 'Tooltip'", id).map((x) => x.Value);
    assert.deepEqual(tip(`LSHUF_${ROME}__${COASTAL_AQ}`), tip(COASTAL_AQ), "the copy's Tooltip is the original's");
    assert.ok(tip(COASTAL_AQ).length === 1 && /SPAIN/.test(tip(COASTAL_AQ)[0]), "which names Spain's ability");
  } finally {
    r.close();
  }
});

test("every age: no piece the age drops is dealt, and a dealt piece of another age's civ has a modifier to copy", async () => {
  for (const fixture of ["base", "exploration", "modern"]) {
    const r = await both({ seed: 53, options: { Mode: MODE.None, CivAbilities: CA_MODE.Split } }, fixture);
    try {
      const age = rows(r.run.db, "SELECT Value FROM LShufOptions WHERE Name = 'Age'")[0].Value;
      const dead = new Set(rows(r.run.db, "SELECT PieceId FROM LShufCivPieceDead WHERE Age = ?", age).map((x) => x.PieceId));
      assert.ok(dead.size > 0, `${fixture}: the age has dropped pieces listed`);
      const dealt = r.res.civPieces.filter((p) => p.Kind === "bullet");
      assert.ok(dealt.length > 0, `${fixture}: pieces dealt`);
      for (const p of dealt) assert.ok(!dead.has(p.PieceId), `${fixture}: ${p.PieceId} is dropped in ${age} and was dealt`);
      // A dealt bonus of a civ from another age, not a rule piece: at least one of its modifiers was copied.
      const otherAge = rows(r.run.db, `SELECT r.CivilizationType civ, r.PieceId piece FROM LShufResultCivPieces r
        JOIN LShufCivMapping m ON m.PieceId = r.PieceId WHERE r.Kind = 'bullet' AND m.Age <> ?
          AND r.PieceId NOT IN (SELECT PieceId FROM LShufCivRulePieces)`, age);
      for (const o of otherAge) {
        const copied = rows(r.run.db, `SELECT 1 FROM TraitModifiers tm WHERE tm.TraitType = ? AND tm.ModifierId IN (
          SELECT 'LSHUF_' || ? || '__' || ModifierId FROM LShufCivMappingModifiers WHERE PieceId = ?
          UNION SELECT 'LSHUF_' || ? || '__' || ModifierId FROM LShufCivMappingAgeModifiers WHERE PieceId = ?)`,
        CIVA(o.civ), o.civ, o.piece, o.civ, o.piece);
        assert.ok(copied.length > 0, `${fixture}: ${o.civ} was dealt ${o.piece} and none of its modifiers came along`);
      }
    } finally {
      r.close();
    }
  }
});
