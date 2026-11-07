// The civilization mapping (data/mapping/lshuf-civ-mapping.sql, CONTRACTS 14/16): every civilization ability
// modifier, as the civilization's own age loads it (the gameplay fixture for Antiquity, the age modules through
// scripts/mapping/civ-age-source.mjs for Exploration and Modern), is in exactly one piece or listed as unplaced in
// CIV-REVIEW.md, and every mapped modifier exists in its age's data; every piece's bullet exists in the English
// text; no piece id collides with a leader piece; the piece text file loads and gives one row per piece per
// language.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { bulletAt } from "../shared/lshuf-text.js";
import { abilityInAge } from "../scripts/mapping/civ-age-source.mjs";
import { ensureFixtures, fixturePaths, openDb, PROJECT_ROOT } from "./_harness.mjs";

const MAPPING = path.join(PROJECT_ROOT, "data/mapping/lshuf-civ-mapping.sql");
const LEADER_MAPPING = path.join(PROJECT_ROOT, "data/mapping/lshuf-mapping.sql");
const REVIEW = path.join(PROJECT_ROOT, "data/mapping/CIV-REVIEW.md");
const PIECE_TEXT = path.join(PROJECT_ROOT, "data/text-generated/lshuf-civ-piece-text.sql");
const SOURCE_LOC = path.join(PROJECT_ROOT, "tests/fixtures/source-db/localization-copy.sqlite");

function gameplayWithMapping() {
  ensureFixtures(["base"]);
  const tmp = path.join(PROJECT_ROOT, "tests/fixtures/db", `civ-mapping-${process.pid}.sqlite`);
  fs.copyFileSync(fixturePaths("base").gameplay, tmp);
  const db = openDb(tmp);
  db.exec(fs.readFileSync(path.join(PROJECT_ROOT, "data/schema/gameplay-tables.sql"), "utf8"));
  db.exec(fs.readFileSync(LEADER_MAPPING, "utf8"));
  db.exec(fs.readFileSync(MAPPING, "utf8"));
  return { db, close: () => { db.close(); fs.rmSync(tmp, { force: true }); } };
}

// Each civilization's ability modifiers as its own age loads them: [{ civ, age, id }].
function liveModifiers(db) {
  const civs = db.prepare(`SELECT ct.CivilizationType civ, ct.TraitType trait,
      (SELECT MIN(Age) FROM LegacyCivilizations lc WHERE lc.CivilizationType = ct.CivilizationType) age
    FROM CivilizationTraits ct WHERE ct.TraitType LIKE 'TRAIT_%_ABILITY'
    AND ct.CivilizationType IN (SELECT CivilizationType FROM Civilizations) ORDER BY ct.CivilizationType`).all();
  const fromDb = db.prepare("SELECT ModifierId id FROM TraitModifiers WHERE TraitType = ?");
  return civs.flatMap((c) => {
    const ids = c.age && c.age !== "AGE_ANTIQUITY" ? abilityInAge(c.age, c.trait).mods : fromDb.all(c.trait).map((r) => r.id);
    return ids.map((id) => ({ civ: c.civ, age: c.age, id }));
  });
}

test("every civilization ability modifier of its own age is in exactly one piece, or listed as unplaced", () => {
  const { db, close } = gameplayWithMapping();
  try {
    const live = liveModifiers(db);
    assert.ok(live.length > 200, `live modifiers: ${live.length}`);
    for (const age of ["AGE_EXPLORATION", "AGE_MODERN"]) assert.ok(live.some((r) => r.age === age), `${age} modifiers read`);
    const placed = db.prepare(`SELECT m.ModifierId id, COUNT(*) n FROM LShufCivMappingModifiers m GROUP BY m.ModifierId`).all();
    for (const p of placed) assert.equal(p.n, 1, `${p.id} placed once`);
    const placedSet = new Set(placed.map((p) => p.id));
    const review = fs.readFileSync(REVIEW, "utf8");
    const missing = live.filter((r) => !placedSet.has(r.id) && !review.includes(`Unplaced: ${r.id}.`)).map((r) => r.id);
    assert.deepEqual(missing, [], "modifiers neither placed nor listed as unplaced");
    const liveKeys = new Set(live.map((r) => `${r.civ} ${r.id}`));
    const mapped = db.prepare(`SELECT p.CivilizationType civ, p.Age age, m.ModifierId id FROM LShufCivMappingModifiers m
      JOIN LShufCivMapping p ON p.PieceId = m.PieceId`).all();
    const stray = mapped.filter((r) => !liveKeys.has(`${r.civ} ${r.id}`)).map((r) => `${r.civ} (${r.age}): ${r.id}`);
    assert.deepEqual(stray, [], "mapped modifiers that aren't on the ability in the civilization's own age");
    const civs = db.prepare("SELECT COUNT(DISTINCT CivilizationType) n FROM LShufCivMapping").get().n;
    assert.equal(civs, 50, "50 civilizations mapped");
    const noAge = db.prepare("SELECT PieceId FROM LShufCivMapping WHERE Age IS NULL OR Age NOT IN ('AGE_ANTIQUITY', 'AGE_EXPLORATION', 'AGE_MODERN')").all();
    assert.deepEqual(noAge, [], "every piece carries its civilization's age");
  } finally {
    close();
  }
});

test("every piece's bullet exists in the English text, and no id collides with a leader piece", () => {
  const { db, close } = gameplayWithMapping();
  const loc = new DatabaseSync(SOURCE_LOC, { readOnly: true });
  try {
    const get = loc.prepare("SELECT Text FROM LocalizedText WHERE Language = 'en_US' AND Tag = ?");
    const pieces = db.prepare("SELECT PieceId, DescriptionKey, BulletIndex, BulletCount, BulletText FROM LShufCivMapping").all();
    for (const p of pieces) {
      const text = get.get(p.DescriptionKey)?.Text;
      assert.ok(text, `${p.PieceId}: English text for ${p.DescriptionKey}`);
      for (let i = 0; i < Number(p.BulletCount); i++) {
        assert.ok(bulletAt(text, Number(p.BulletIndex) + i), `${p.PieceId}: bullet ${Number(p.BulletIndex) + i} exists`);
      }
      assert.equal(bulletAt(text, Number(p.BulletIndex)), String(p.BulletText).split("[N]")[0], `${p.PieceId}: text matches`);
    }
    const clash = db.prepare("SELECT PieceId FROM LShufCivMapping WHERE PieceId IN (SELECT PieceId FROM LShufMapping)").all();
    assert.deepEqual(clash, [], "no piece id shared with the leader mapping");
  } finally {
    loc.close();
    close();
  }
});

test("the civilization piece text loads and gives one row per piece per language", () => {
  const tmp = path.join(PROJECT_ROOT, "tests/fixtures/db", `civ-piece-text-${process.pid}.sqlite`);
  fs.copyFileSync(SOURCE_LOC, tmp);
  const loc = new DatabaseSync(tmp);
  const map = new DatabaseSync(":memory:");
  try {
    map.exec(fs.readFileSync(MAPPING, "utf8"));
    const pieces = map.prepare("SELECT PieceId, DescriptionKey FROM LShufCivMapping").all();
    loc.exec(fs.readFileSync(PIECE_TEXT, "utf8"));
    const perLang = loc.prepare("SELECT COUNT(*) n FROM LocalizedText WHERE Tag = ? AND Language = 'en_US'");
    for (const p of pieces) assert.equal(perLang.get(`LOC_LSHUF_CIVPIECE_${p.PieceId}`).n, 1, `${p.PieceId}: one English row`);
    const languages = loc.prepare("SELECT COUNT(DISTINCT Language) n FROM LocalizedText WHERE Tag = ?");
    const sample = pieces[0];
    const sourceLangs = loc.prepare("SELECT COUNT(DISTINCT Language) n FROM LocalizedText WHERE Tag = ?").get(sample.DescriptionKey).n;
    assert.equal(languages.get(`LOC_LSHUF_CIVPIECE_${sample.PieceId}`).n, sourceLangs, "a row in every language the source has");
  } finally {
    loc.close();
    map.close();
    fs.rmSync(tmp, { force: true });
  }
});
