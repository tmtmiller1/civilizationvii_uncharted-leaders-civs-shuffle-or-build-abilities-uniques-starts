// A civilization bonus's text in another age (LShufCivMappingAgeText, LOC_LSHUF_CIVPIECE_<PieceId>__AQ/EX/MO): the
// game scales an ability's numbers by age, so Spain's coastal yields read +1 in Antiquity, +2 in Exploration (its
// own age) and +3 in Modern; civPieceKey picks the wording of the age being played and falls back to the piece's own.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { PROJECT_ROOT } from "./_harness.mjs";
import { civPieceKey, currentAge } from "../ui/display/lshuf-display-util.js";

const MAPPING = path.join(PROJECT_ROOT, "data/mapping/lshuf-civ-mapping.sql");
const PIECE_TEXT = path.join(PROJECT_ROOT, "data/text-generated/lshuf-civ-piece-text.sql");
const SOURCE_LOC = path.join(PROJECT_ROOT, "tests/fixtures/source-db/localization-copy.sqlite");
const SUFFIX = { AGE_ANTIQUITY: "AQ", AGE_EXPLORATION: "EX", AGE_MODERN: "MO" };
const plain = (s) => String(s || "").replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();

function loaded() {
  const tmp = path.join(PROJECT_ROOT, "tests/fixtures/db", `civ-age-text-${process.pid}.sqlite`);
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.copyFileSync(SOURCE_LOC, tmp);
  const loc = new DatabaseSync(tmp);
  loc.exec(fs.readFileSync(PIECE_TEXT, "utf8"));
  const map = new DatabaseSync(":memory:");
  map.exec(fs.readFileSync(MAPPING, "utf8"));
  const text = loc.prepare("SELECT Text FROM LocalizedText WHERE Language = 'en_US' AND Tag = ?");
  const close = () => { loc.close(); map.close(); fs.rmSync(tmp, { force: true }); };
  return { loc, map, english: (tag) => text.get(tag)?.Text ?? null, close };
}

test("every age text row has its English line, differs from the piece's own and isn't for a dropped piece or the own age", () => {
  const t = loaded();
  try {
    const rows = t.map.prepare(`SELECT a.PieceId, a.Age, m.Age OwnAge,
      (SELECT 1 FROM LShufCivPieceDead d WHERE d.PieceId = a.PieceId AND d.Age = a.Age) Dead
      FROM LShufCivMappingAgeText a JOIN LShufCivMapping m ON m.PieceId = a.PieceId`).all();
    assert.ok(rows.length > 50, `age text rows: ${rows.length}`);
    for (const r of rows) {
      const aged = t.english(`LOC_LSHUF_CIVPIECE_${r.PieceId}__${SUFFIX[r.Age]}`);
      assert.ok(aged, `${r.PieceId} in ${r.Age}: an English line`);
      assert.notEqual(plain(aged), plain(t.english(`LOC_LSHUF_CIVPIECE_${r.PieceId}`)), `${r.PieceId} in ${r.Age}: differs from its own`);
      assert.notEqual(r.Age, r.OwnAge, `${r.PieceId}: no row for its own age`);
      assert.equal(r.Dead, null, `${r.PieceId} in ${r.Age}: a dropped piece has no text there`);
    }
  } finally {
    t.close();
  }
});

test("Spain's coastal yields read +1 in Antiquity, +2 in its own age and +3 in Modern", () => {
  const t = loaded();
  try {
    const id = "CIVILIZATION_SPAIN__B01";
    assert.match(plain(t.english(`LOC_LSHUF_CIVPIECE_${id}__AQ`)), /^\+1 Food, \+1 Gold,? and \+1 Production in Coastal Settlements/);
    assert.match(plain(t.english(`LOC_LSHUF_CIVPIECE_${id}`)), /^\+2 Food, \+2 Gold and \+2 Production/);
    assert.match(plain(t.english(`LOC_LSHUF_CIVPIECE_${id}__MO`)), /^\+3 Food, \+3 Gold and \+3 Production/);
    assert.equal(t.english(`LOC_LSHUF_CIVPIECE_${id}__EX`), null, "no row for Spain's own age");
  } finally {
    t.close();
  }
});

test("civPieceKey: the age's key when the age has one, the piece's own otherwise", () => {
  const t = loaded();
  const saved = Object.fromEntries(["Locale", "Game", "GameInfo", "GameSetup"].map((k) => [k, globalThis[k]]));
  try {
    globalThis.Locale = { compose: (key) => t.english(key) ?? key };
    const spain = "CIVILIZATION_SPAIN__B01";
    assert.equal(civPieceKey(spain, "AGE_ANTIQUITY"), `LOC_LSHUF_CIVPIECE_${spain}__AQ`);
    assert.equal(civPieceKey(spain, "AGE_EXPLORATION"), `LOC_LSHUF_CIVPIECE_${spain}`);
    assert.equal(civPieceKey(spain, null), `LOC_LSHUF_CIVPIECE_${spain}`);
    const america = "CIVILIZATION_AMERICA__B02"; // "+1 Production on Resources" in every age
    assert.equal(civPieceKey(america, "AGE_ANTIQUITY"), `LOC_LSHUF_CIVPIECE_${america}`, "same wording, no age key");
    // The age being played: the running game's first, the setup's start age row otherwise.
    globalThis.GameSetup = { findGameParameter: () => ({ value: { value: "AGE_MODERN" } }) };
    delete globalThis.Game;
    assert.equal(currentAge(), "AGE_MODERN");
    assert.equal(civPieceKey(spain), `LOC_LSHUF_CIVPIECE_${spain}__MO`);
    globalThis.Game = { age: 7 };
    globalThis.GameInfo = { Ages: { lookup: (h) => (h === 7 ? { AgeType: "AGE_ANTIQUITY" } : null) } };
    assert.equal(currentAge(), "AGE_ANTIQUITY");
  } finally {
    Object.assign(globalThis, saved);
    for (const k of Object.keys(saved)) if (saved[k] === undefined) delete globalThis[k];
    t.close();
  }
});
