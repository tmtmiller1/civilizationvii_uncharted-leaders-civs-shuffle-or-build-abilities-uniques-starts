// A note every time things come together (owner, 2026-11-12; docs/NOTES-AUDIT.md): merged bonuses, a unique that
// brings bonuses, a bonus that needs another, the great person a civic or an ability brings (ui/setup/
// lshuf-build-notes.js markBundleNotes), the merged line in Who got what (ui/game/lshuf-reveal-lines.js), and the
// settings that set or depend on another row (text/en_us/lshuf-text.xml).
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { importShipped } from "./_harness.mjs";

// compose echoes the key and its arguments, so each note's key and values can be read off the card text.
globalThis.Locale = { compose: (key, ...args) => `${key}(${args.join("|")})` };
const AGOGE = "CIVNODE_NODE_CIVIC_AQ_GREECE_AGOGE";
const EKKLESIA = "CIVNODE_NODE_CIVIC_AQ_GREECE_EKKLESIA";
globalThis.Database = {
  query: (_db, sql) => (String(sql).includes("LShufSetup_CivRiders") ? [{ LeadId: AGOGE, RiderId: EKKLESIA }] : [])
};
globalThis.Controls = { define() {} };

const { markBundleNotes } = await import("../ui/setup/lshuf-build-notes.js");
const { andList, mergedBullets } = await import("../shared/lshuf-text.js");

const card = (id, kind, name, extra = {}) => ({ id, kind, name, text: `${name} text`, ...extra });

test("mergedBullets reads a bullet list or a run, andList joins them", () => {
  assert.deepEqual(mergedBullets({ BulletIndex: 1, BulletList: "1|3|4" }), [1, 3, 4]);
  assert.deepEqual(mergedBullets({ BulletIndex: 2, BulletCount: 2 }), [2, 3]);
  assert.equal(mergedBullets({ BulletIndex: 2, BulletCount: 1 }), null);
  assert.equal(andList(["1", "3", "4"]), "1, 3 and 4");
  assert.equal(andList(["2", "3"]), "2 and 3");
});

test("each kind of card that comes with something says so", () => {
  const cards = [
    card("LEADER_YI_SUN_SIN__B01", "bullet", "Yi 1", { merged: [1, 3, 4] }),
    card("CIVILIZATION_PIRATE_REPUBLIC__B03", "civbullet", "Pirates 3", { goesWith: "CIVUNQ_UNIT_BUCCANEER" }),
    card("CIVILIZATION_PIRATE_REPUBLIC__B02", "civbullet", "Pirates 2", { goesWith: "CIVUNQ_UNIT_BUCCANEER" }),
    card("CIVUNQ_UNIT_BUCCANEER", "civunique", "Buccaneer"),
    card(AGOGE, "civcivic", "Agoge"),
    card("CIVCIVC_CIVILIZATION_GREECE", "civcivics", "Greek civics"),
    card("CIVABIL_CIVILIZATION_HAN", "civability", "Han ability")
  ];
  const people = [
    { civ: "CIVILIZATION_GREECE", unit: "UNIT_LOGIOS", nameKey: "LOC_UNIT_LOGIOS_NAME", descKey: "LOC_UNIT_LOGIOS_DESCRIPTION",
      anchor: "BUILDING_ODEON", node: "NODE_CIVIC_AQ_GREECE_EKKLESIA" },
    { civ: "CIVILIZATION_HAN", unit: "UNIT_SHI_DAFU", nameKey: "LOC_UNIT_SHI_DAFU_NAME", descKey: "LOC_UNIT_SHI_DAFU_DESCRIPTION",
      anchor: null, node: null }
  ];
  markBundleNotes(cards, people);
  const text = (id) => cards.find((c) => c.id === id).text;
  assert.match(text("LEADER_YI_SUN_SIN__B01"), /LOC_LSHUF_BUILD_CARD_MERGED\(1, 3 and 4\)/);
  assert.match(text("CIVILIZATION_PIRATE_REPUBLIC__B03"), /LOC_LSHUF_BUILD_NEEDS_BONUS\(Pirates 3\|Pirates 2\)/);
  assert.match(text("CIVUNQ_UNIT_BUCCANEER"), /LOC_LSHUF_BUILD_BRINGS\(Pirates 3 and Pirates 2\)/);
  // The Logios is unlocked at Ekklesia, which rides on Agoge's card; the whole tree says so too.
  assert.match(text(AGOGE), /LOC_LSHUF_BUILD_GREAT_PERSON\(LOC_UNIT_LOGIOS_NAME\(\)/);
  assert.match(text("CIVCIVC_CIVILIZATION_GREECE"), /LOC_LSHUF_BUILD_GREAT_PERSON\(LOC_UNIT_LOGIOS_NAME/);
  assert.match(text("CIVABIL_CIVILIZATION_HAN"), /LOC_LSHUF_BUILD_GREAT_PERSON\(LOC_UNIT_SHI_DAFU_NAME/);
  assert.doesNotMatch(text("CIVABIL_CIVILIZATION_HAN"), /LOGIOS/);
  assert.match(text("CIVABIL_CIVILIZATION_HAN"), /LOC_LSHUF_BUILD_CARD_WHOLE\(\)/);
  assert.match(text("CIVCIVC_CIVILIZATION_GREECE"), /LOC_LSHUF_BUILD_CARD_WHOLE_TREE\(\)/);
});

test("Who got what says when merged bonuses came together", async () => {
  const { revealLines } = await importShipped("ui/game/lshuf-reveal-lines.js");
  const deal = {
    leaders: [{ LeaderType: "LEADER_A", Status: "dealt", Axes: "|ABILITY|", AbilityFrom: "LEADER_YI", PersonaFrom: "LEADER_A" }],
    pieces: [{ LeaderType: "LEADER_A", PieceId: "LEADER_YI__B01", FromLeaderType: "LEADER_YI", Kind: "bullet", SortIndex: 0 }],
    attributes: [], biases: [], unlocks: [], meta: []
  };
  const lookups = {
    compose: (key, ...args) => (key.startsWith("LOC_LSHUF_PIECE_") ? "Fleet bonuses" : `${key}(${args.join("|")})`),
    abilityOf: () => null, leaderName: (l) => l.replace("LEADER_", ""), attributeName: () => null, whyOf: () => null,
    mergedOf: (id) => (id === "LEADER_YI__B01" ? [1, 3, 4] : null)
  };
  const lines = revealLines("LEADER_A", deal, lookups).map((l) => l.text);
  assert.ok(lines.includes("LOC_LSHUF_DIPLO_MERGED(1, 3 and 4|YI)"), lines.join(" / "));
});

test("settings that set or depend on another row say so", () => {
  const xml = fs.readFileSync(new URL("../text/en_us/lshuf-text.xml", import.meta.url), "utf8");
  const text = (tag) => (xml.match(new RegExp(`<Row Tag="${tag}"><Text>([^<]*)</Text>`)) || [])[1] || "";
  assert.match(text("LOC_LSHUF_MODE_AGENDAS_DESC"), /sets Leader personalities to Shuffled/);
  assert.match(text("LOC_LSHUF_MODE_AGENDAS_ATTRIBUTES_DESC"), /sets Leader personalities to Shuffled/);
  assert.match(text("LOC_LSHUF_MODE_DESC"), /New personalities modes also set Leader personalities to Shuffled/);
  assert.match(text("LOC_LSHUF_CIV_MODE_DESC"), /sets the rows under Advanced settings/);
  for (const tag of ["LOC_LSHUF_T_PAIRED_DESC", "LOC_LSHUF_B_PAIRED_DESC", "LOC_LSHUF_B_MATCHED_DESC", "LOC_LSHUF_PERSONA_FOLLOWS_DESC"]) {
    assert.match(text(tag), /With leader abilities on Base game/, tag);
  }
  for (const tag of ["LOC_LSHUF_CU_PAIRED_DESC", "LOC_LSHUF_CC_PAIRED_DESC"]) {
    assert.match(text(tag), /Unless civilization abilities are on Swap whole/, tag);
  }
  assert.match(text("LOC_LSHUF_CIV_CIVICS_DESC"), /great people a quarter brings/);
  assert.match(text("LOC_LSHUF_CIV_ABILITIES_DESC"), /great person/);
  assert.match(text("LOC_LSHUF_HUMAN_MODE_DESC"), /the same way as the AI players, or a way of your own/);
});
