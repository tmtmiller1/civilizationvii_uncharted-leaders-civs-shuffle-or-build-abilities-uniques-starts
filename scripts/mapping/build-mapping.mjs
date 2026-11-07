// Builds the mapping (CONTRACTS.md 4.3) from data plus the drafts:
//   data/mapping/lshuf-mapping.sql     INSERT OR IGNORE rows for LShufMapping, LShufMappingModifiers,
//                                      LShufMappingUnlocks, LShufReviewedSets (runs in gameplay and config)
//   data/mapping/REVIEW.md             the owner's review list
//   data/mapping/mapping-summary.json  counts per leader
//
// Reads ~/Library/Application Support/Civilization VII/Debug/{gameplay,frontend,localization}-copy.sqlite
// read-only, and the listed leader mods' folders on tp-share. Usage: node scripts/mapping/build-mapping.mjs

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pieceId, joinTags, biasTableOfTag, BIAS_TABLES } from "../../shared/lshuf-constants.js";
import { MODDED_LEADERS } from "../../shared/lshuf-known-leaders.js";
import { openDebugDbs, readVanilla, readModded } from "./read-leaders.mjs";
import { VANILLA_DRAFT } from "./vanilla-draft.mjs";
import { MODDED_DRAFT } from "./modded-draft.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT_DIR = join(ROOT, "data", "mapping");

const SPECIFIC_KINDS = new Set(["KIND_CIVILIZATION", "KIND_UNIT", "KIND_CONSTRUCTIBLE", "KIND_PROJECT"]);
const BIAS_KINDS = new Set(["KIND_BIOME", "KIND_TERRAIN", "KIND_FEATURE_CLASS", "KIND_RESOURCE"]);
const REQ_WORD_TAGS = {
  REQUIREMENT_PLOT_IS_COASTAL_LAND: "COAST",
  REQUIREMENT_PLOT_ADJACENT_TO_COAST: "COAST",
  REQUIREMENT_PLOT_IS_COAST: "COAST",
  REQUIREMENT_PLOT_IS_LAKE: "LAKE",
  REQUIREMENT_PLOT_ADJACENT_TO_LAKE: "LAKE",
  REQUIREMENT_PLOT_IS_RIVER: "RIVER",
  REQUIREMENT_PLOT_IS_NATURAL_WONDER: "NATURAL_WONDER",
  REQUIREMENT_PLAYER_DISCOVERED_NATURAL_WONDER: "NATURAL_WONDER",
  REQUIREMENT_PLAYER_DISCOVERED_NATURAL_WONDER_FIRST: "NATURAL_WONDER",
  REQUIREMENT_CITY_IS_ISLAND: "ISLAND"
};
const ADJACENCY_WORD_TAGS = { AdjacentRiver: "RIVER", AdjacentLake: "LAKE", AdjacentNaturalWonder: "NATURAL_WONDER" };

// ---------------------------------------------------------------------------------------------------------------
// What a set of modifiers reaches: bias tags and specific types, read from arguments, requirements, attached
// modifiers, unit abilities and adjacencies.

function dataBiasTags(source, modifierIds) {
  const tags = [];
  const add = (t) => {
    if (t && biasTableOfTag(t) && !tags.includes(t)) tags.push(t);
  };
  for (const id of modifierIds) {
    for (const e of source.reach(id)) {
      if (e.inverse) continue;
      if (e.name === "#type") {
        if (e.value === "REQUIREMENT_PLOT_ADJACENT_TO_RIVER") {
          const nav = (e.args || []).find((a) => a.name === "Navigable");
          add(nav && /^(true|1)$/i.test(String(nav.value)) ? "TERRAIN_NAVIGABLE_RIVER" : "RIVER");
        } else add(REQ_WORD_TAGS[e.value]);
        continue;
      }
      if (e.where.startsWith("adjacency:")) {
        if (ADJACENCY_WORD_TAGS[e.name] && /^(1|true)$/i.test(e.value)) add(ADJACENCY_WORD_TAGS[e.name]);
        if (e.name === "AdjacentNavigableRiver" && /^(1|true)$/i.test(e.value)) add("TERRAIN_NAVIGABLE_RIVER");
      }
      if (BIAS_KINDS.has(source.kindOf(e.value))) add(e.value);
    }
  }
  return tags;
}

function specificTypes(source, modifierIds) {
  const found = [];
  for (const id of modifierIds) {
    for (const e of source.reach(id)) {
      if (e.name === "#type" || e.inverse) continue;
      const v = e.value;
      if (found.includes(v)) continue;
      if (SPECIFIC_KINDS.has(source.kindOf(v)) || source.tagCategory(v) === "UNIT_CLASS") found.push(v);
    }
  }
  return found;
}

function leaderCheckHits(source, modifierIds) {
  return modifierIds.filter((id) => source.reach(id).some((e) => e.name === "#type" && e.value === "REQUIREMENT_PLAYER_LEADER_TYPE_MATCHES"));
}

// ---------------------------------------------------------------------------------------------------------------
// Pieces for one leader.

function expandMods(entries, liveIds) {
  const out = [];
  const misses = [];
  for (const m of entries || []) {
    if (m.startsWith("re:")) {
      const re = new RegExp(m.slice(3));
      const hits = liveIds.filter((id) => re.test(id));
      if (!hits.length) misses.push(m);
      out.push(...hits);
    } else if (liveIds.includes(m)) out.push(m);
    else misses.push(m);
  }
  return { ids: out, misses };
}

function buildLeader(rec, draftEntry, source) {
  const L = rec.leaderType;
  const result = { rec, pieces: [], unplaced: [], problems: [...rec.problems.map((p) => p.what)], notes: [] };
  if (!rec.trait) {
    result.problems.push("No ability found; nothing written for this leader.");
    return result;
  }
  const agendaMods = rec.modifiers.filter((m) => m.agenda);
  const effectIds = rec.modifiers.filter((m) => !m.agenda).map((m) => m.id);
  const draft = Array.isArray(draftEntry) ? { bullets: draftEntry } : draftEntry || null;
  const assigned = new Map(); // modifier id -> piece id

  if (agendaMods.length) {
    const nonTimed = agendaMods.filter((m) => m.agenda !== "EFFECT_DIPLOMACY_AGENDA_TIMED_UPDATE");
    const names = agendaMods
      .map((m) => m.info && m.info.args.find((a) => a.name === "ModName"))
      .filter(Boolean)
      .map((a) => a.value);
    const pid = pieceId.agenda(L);
    result.pieces.push({
      PieceId: pid,
      Kind: "agenda",
      BulletIndex: null,
      BulletText: null,
      BiasTags: null,
      Value: 1,
      SpecificTo: joinTags(specificTypes(source, agendaMods.map((m) => m.id))),
      Movable: 1,
      Guess: nonTimed.length ? 1 : 0,
      modifiers: agendaMods.map((m) => ({ id: m.id, role: "agenda", why: m.agenda })),
      agendaNames: [...new Set(names)],
      why: nonTimed.length
        ? `Agenda rows read from data, ${nonTimed.map((m) => `${m.id} by ${m.agenda}`).join("; ")}, which isn't EFFECT_DIPLOMACY_AGENDA_TIMED_UPDATE.`
        : "Agenda rows read from data (EFFECT_DIPLOMACY_AGENDA_TIMED_UPDATE).",
      Note: nonTimed.length
        ? "Includes agenda modifiers beyond DIPLOMACY_AGENDA_TIMED_UPDATE; check they belong with the personality."
        : null
    });
    for (const m of agendaMods) assigned.set(m.id, pid);
  }

  const bulletCount = rec.bullets.length;
  if (!draft) {
    result.problems.push("No draft entry for this leader; every ability modifier is unplaced.");
  } else if (draft.noBullets || bulletCount === 0) {
    if (bulletCount > 0) result.problems.push(`Draft says no bullets but the live text has ${bulletCount}.`);
    result.wholeOnly = true;
    if (draft.note) result.notes.push(draft.note);
  } else if (!draft.bullets || draft.bullets.length !== bulletCount) {
    result.problems.push(
      `Draft has ${draft.bullets ? draft.bullets.length : 0} bullets, the live text has ${bulletCount}; no bullet rows written until the draft is fixed.`
    );
  } else {
    draft.bullets.forEach((b, i) => {
      const n = i + 1;
      const pid = pieceId.bullet(L, n);
      const eff = expandMods(b.mods, effectIds);
      const hid = expandMods(b.hidden, effectIds);
      for (const miss of [...eff.misses, ...hid.misses]) result.problems.push(`${pid}: drafted ${miss} isn't on the live ability.`);
      const modifiers = [...eff.ids.map((id) => ({ id, role: "effect" })), ...hid.ids.map((id) => ({ id, role: "hidden" }))];
      for (const m of modifiers) {
        if (assigned.has(m.id)) result.problems.push(`${m.id} is drafted into both ${assigned.get(m.id)} and ${pid}.`);
        else assigned.set(m.id, pid);
      }
      const ids = modifiers.map((m) => m.id);
      const dataTags = dataBiasTags(source, ids);
      const drafted = (b.bias || []).filter((t) => !dataTags.includes(t));
      for (const t of b.bias || []) if (!biasTableOfTag(t)) result.problems.push(`${pid}: bias tag ${t} isn't a known tag.`);
      const specific = specificTypes(source, ids);
      const single = bulletCount === 1;
      result.pieces.push({
        PieceId: pid,
        Kind: "bullet",
        BulletIndex: n,
        BulletText: rec.bullets[i],
        BiasTags: joinTags([...dataTags, ...drafted]),
        dataTags,
        draftedTags: drafted,
        Value: b.value,
        SpecificTo: joinTags(specific),
        Movable: b.movable === 0 ? 0 : 1,
        Guess: single && ids.length ? 0 : 1,
        modifiers,
        why: single ? "The only bullet: every non-agenda modifier is its own." : b.why,
        Note: b.note || null
      });
    });
  }
  for (const id of draft && draft.unplaced ? draft.unplaced : []) {
    if (!effectIds.includes(id)) result.problems.push(`Drafted unplaced ${id} isn't on the live ability.`);
  }
  for (const id of effectIds) {
    if (assigned.has(id)) continue;
    const why =
      draft && draft.unplaced && draft.unplaced.includes(id)
        ? draft.unplacedWhy || "Drafted as unplaced."
        : result.wholeOnly
          ? "The description has no bullets, so the ability is dealt whole."
          : "Not drafted into any bullet.";
    result.unplaced.push({ id, why });
  }
  return result;
}

// ---------------------------------------------------------------------------------------------------------------
// Shipped context for the review list.

function shippedBiases(db, leaderType) {
  const out = [];
  for (const t of BIAS_TABLES) {
    try {
      for (const r of db.prepare(`SELECT * FROM ${t} WHERE LeaderType = ?`).all(leaderType)) {
        const target = r.BiomeType || r.TerrainType || r.FeatureClassType || r.ResourceType || null;
        out.push(`${t.replace("StartBias", "")}${target ? ` ${target}` : ""} ${r.Score}`);
      }
    } catch {
      // table missing in a scratch DB
    }
  }
  return out;
}

// The seven attribute traits, from the lead's schema file (LShufAttributeTraits rows), not from a name pattern.
function attributeTraits() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(join(ROOT, "data", "schema", "gameplay-tables.sql"), "utf8"));
  return db.prepare("SELECT TraitType FROM LShufAttributeTraits").all().map((r) => r.TraitType);
}

function hasAttributeTraits(db, leaderType, traits) {
  return db
    .prepare(`SELECT COUNT(*) AS n FROM LeaderTraits WHERE LeaderType = ? AND TraitType IN (${traits.map(() => "?").join(",")})`)
    .get(leaderType, ...traits).n;
}

// ---------------------------------------------------------------------------------------------------------------
// Output helpers.

const sqlValue = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

function insertRows(table, columns, rows, chunk = 40) {
  const out = [];
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    out.push(`INSERT OR IGNORE INTO ${table} (${columns.join(", ")}) VALUES\n${part.map((r) => `  (${columns.map((c) => sqlValue(r[c])).join(", ")})`).join(",\n")};`);
  }
  return out.join("\n");
}

export function plainText(s) {
  return String(s || "")
    .replace(/\[icon:[^\]]*\]/gi, "")
    .replace(/\[TIP:[^\]]*\]/gi, "")
    .replace(/\[\/TIP\]/gi, "")
    .replace(/\[\/?(B|I|LIST|BLIST|LI|COLOR[^\]]*)\]/gi, "")
    .replace(/\[(N|NEWLINE)\]/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

function wrap(text, width = 118, indent = "") {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = indent;
  for (const w of words) {
    if (line.trim().length && (line + " " + w).length > width) {
      lines.push(line);
      line = indent + w;
    } else line = line.trim().length ? `${line} ${w}` : indent + w;
  }
  if (line.trim().length) lines.push(line);
  return lines.join("\n");
}

const item = (text, indent = 0) => {
  const pad = " ".repeat(indent);
  const w = wrap(text, 118, pad + "  ");
  return pad + "-" + w.slice(pad.length + 1);
};

// ---------------------------------------------------------------------------------------------------------------

function main() {
  const dbs = openDebugDbs();
  const { source: vanillaSource, leaders: vanilla } = readVanilla(dbs);
  const modded = readModded(dbs, vanillaSource);
  const locStmt = dbs.localization.prepare("SELECT Text FROM LocalizedText WHERE Tag = ? AND Language = 'en_US'");
  const loc = (tag) => (tag ? locStmt.get(tag)?.Text ?? null : null);

  const built = [];
  for (const rec of vanilla) {
    const leader = buildLeader(rec, VANILLA_DRAFT[rec.leaderType], vanillaSource);
    built.push({ ...leader, db: dbs.gameplay, source: vanillaSource });
  }
  for (const rec of modded) {
    const leader = buildLeader(rec, MODDED_DRAFT[rec.leaderType], rec.source || vanillaSource);
    built.push({ ...leader, db: null, source: rec.source });
  }

  // Legend-node unlocks in vanilla: rows whose RequiredTraitType is a vanilla leader's ability trait.
  const abilityTraits = new Map(vanilla.filter((r) => r.trait).map((r) => [r.trait, r.leaderType]));
  const unlockRows = dbs.gameplay
    .prepare(
      `SELECT u.ProgressionTreeNodeType, u.TargetType, u.RequiredTraitType, n.ProgressionTree FROM ProgressionTreeNodeUnlocks u
       LEFT JOIN ProgressionTreeNodes n ON n.ProgressionTreeNodeType = u.ProgressionTreeNodeType
       WHERE u.RequiredTraitType IS NOT NULL ORDER BY u.RequiredTraitType, u.ProgressionTreeNodeType, u.TargetType`
    )
    .all()
    .filter((u) => abilityTraits.has(u.RequiredTraitType));
  // A leader with no attribute traits (Ibn Battuta) has nothing for its legend nodes to follow; they go with the
  // bullet that carries its hidden attribute-unlock rows.
  const unlockPiece = new Map();
  const attrTraits = attributeTraits();
  for (const b of built) {
    if (b.rec.isModded || !b.rec.trait) continue;
    if (hasAttributeTraits(dbs.gameplay, b.rec.leaderType, attrTraits) > 0) continue;
    const holders = b.pieces.filter((p) => p.modifiers.some((m) => m.role === "hidden"));
    if (holders.length === 1) unlockPiece.set(b.rec.trait, holders[0].PieceId);
    else b.problems.push(`No attribute traits, and ${holders.length} pieces carry hidden rows; legend unlocks left with PieceId NULL.`);
  }
  for (const u of unlockRows) u.PieceId = unlockPiece.get(u.RequiredTraitType) || null;

  // ---- SQL ----
  const mappingRows = [];
  const modifierRows = [];
  for (const b of built) {
    for (const p of b.pieces) {
      mappingRows.push({
        PieceId: p.PieceId,
        LeaderType: b.rec.leaderType,
        AbilityTrait: b.rec.trait,
        Kind: p.Kind,
        BulletIndex: p.BulletIndex,
        BulletText: p.BulletText,
        BiasTags: p.BiasTags,
        Value: p.Value,
        SpecificTo: p.SpecificTo,
        Movable: p.Movable,
        Reviewed: 1,
        Guess: p.Guess,
        IsModded: b.rec.isModded ? 1 : 0,
        ModId: b.rec.modId,
        Note: p.Note
      });
      for (const m of p.modifiers) modifierRows.push({ PieceId: p.PieceId, ModifierId: m.id, Role: m.role });
    }
  }
  const reviewedSets = modded
    .filter((r) => r.trait)
    .map((r) => ({ AbilityTrait: r.trait, ModifierSet: joinTags([...new Set(r.modifiers.map((m) => m.id))].sort()) }));

  const sql = [
    "-- Generated by scripts/mapping/build-mapping.mjs. Don't edit by hand; change the drafts in scripts/mapping/ and",
    "-- run the script again, then scripts/mapping/merge-pieces.mjs. The mapping tables (CONTRACTS.md 4.3). Every",
    "-- bullet is matched to its effects by name, arguments and requirements (Guess = 1 marks a match made that way);",
    "-- bullets one effect serves together are merged into one piece, and every row ships Reviewed = 1. Rows are",
    "-- bullet-to-modifier match was drafted from text and arguments. INSERT OR IGNORE only, no foreign keys to game",
    "-- tables, so this file runs in both the gameplay and the config database and can run twice.",
    `-- Built ${new Date().toISOString().slice(0, 10)} from Debug/gameplay-copy.sqlite, Debug/frontend-copy.sqlite,`,
    "-- Debug/localization-copy.sqlite and the listed leader mods' files on tp-share.",
    "",
    insertRows(
      "LShufMapping",
      ["PieceId", "LeaderType", "AbilityTrait", "Kind", "BulletIndex", "BulletText", "BiasTags", "Value", "SpecificTo", "Movable", "Reviewed", "Guess", "IsModded", "ModId", "Note"],
      mappingRows,
      25
    ),
    "",
    insertRows("LShufMappingModifiers", ["PieceId", "ModifierId", "Role"], modifierRows, 60),
    "",
    insertRows("LShufMappingUnlocks", ["ProgressionTreeNodeType", "TargetType", "RequiredTraitType", "ProgressionTree", "PieceId"], unlockRows, 60),
    "",
    insertRows("LShufReviewedSets", ["AbilityTrait", "ModifierSet"], reviewedSets, 30),
    ""
  ].join("\n");
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "lshuf-mapping.sql"), sql);

  // ---- summary ----
  const per = {};
  const totals = {
    leaders: 0,
    vanillaLeaders: 0,
    moddedLeaders: 0,
    pieces: 0,
    bulletPieces: 0,
    agendaPieces: 0,
    modifiers: 0,
    placed: 0,
    unplaced: 0,
    guesses: 0,
    specificModifiers: 0,
    specificPieces: 0,
    movable0: 0,
    unlocks: unlockRows.length,
    wholeOnly: 0,
    problems: 0
  };
  const specificModifierIds = new Set();
  for (const b of built) {
    const L = b.rec.leaderType;
    const bulletPieces = b.pieces.filter((p) => p.Kind === "bullet");
    const placed = b.pieces.reduce((n, p) => n + p.modifiers.length, 0);
    for (const p of b.pieces) for (const m of p.modifiers) if (specificTypes(b.source || vanillaSource, [m.id]).length) specificModifierIds.add(`${L}:${m.id}`);
    per[L] = {
      isModded: !!b.rec.isModded,
      modId: b.rec.modId,
      abilityTrait: b.rec.trait,
      bullets: b.rec.bullets.length,
      bulletPieces: bulletPieces.length,
      agendaPiece: b.pieces.some((p) => p.Kind === "agenda"),
      modifiers: b.rec.modifiers.length,
      placed,
      hidden: b.pieces.reduce((n, p) => n + p.modifiers.filter((m) => m.role === "hidden").length, 0),
      agendaModifiers: b.pieces.filter((p) => p.Kind === "agenda").reduce((n, p) => n + p.modifiers.length, 0),
      unplaced: b.unplaced.length,
      guesses: b.pieces.filter((p) => p.Guess === 1).length,
      specificPieces: b.pieces.filter((p) => p.SpecificTo).length,
      movable0: b.pieces.filter((p) => p.Movable === 0).length,
      unlocks: unlockRows.filter((u) => u.RequiredTraitType === b.rec.trait).length,
      wholeOnly: !!b.wholeOnly,
      problems: b.problems
    };
    totals.leaders++;
    if (b.rec.isModded) totals.moddedLeaders++;
    else totals.vanillaLeaders++;
    totals.pieces += b.pieces.length;
    totals.bulletPieces += bulletPieces.length;
    totals.agendaPieces += per[L].agendaPiece ? 1 : 0;
    totals.modifiers += b.rec.modifiers.length;
    totals.placed += placed;
    totals.unplaced += b.unplaced.length;
    totals.guesses += per[L].guesses;
    totals.specificPieces += per[L].specificPieces;
    totals.movable0 += per[L].movable0;
    totals.wholeOnly += b.wholeOnly ? 1 : 0;
    totals.problems += b.problems.length;
  }
  totals.specificModifiers = specificModifierIds.size;
  const vanillaSpecific = [...specificModifierIds].filter((k) => !per[k.split(":")[0]].isModded).length;
  totals.specificModifiersVanilla = vanillaSpecific;
  totals.reviewedSets = reviewedSets.length;
  totals.rows = {
    LShufMapping: mappingRows.length,
    LShufMappingModifiers: modifierRows.length,
    LShufMappingUnlocks: unlockRows.length,
    LShufReviewedSets: reviewedSets.length
  };
  writeFileSync(join(OUT_DIR, "mapping-summary.json"), JSON.stringify({ built: new Date().toISOString().slice(0, 10), totals, leaders: per }, null, 2) + "\n");

  // ---- review list ----
  writeFileSync(join(OUT_DIR, "REVIEW.md"), reviewMarkdown({ built, totals, unlockRows, loc, dbs, vanillaSource }));

  console.log(JSON.stringify(totals, null, 2));
  for (const b of built) for (const p of b.problems) console.log(`PROBLEM ${b.rec.leaderType}: ${p}`);
}

function leaderName(b, loc) {
  if (b.rec.isModded) {
    const entry = MODDED_LEADERS.find((m) => m.leaderType === b.rec.leaderType);
    return entry ? entry.title : b.rec.leaderType;
  }
  const row = b.db.prepare("SELECT Name FROM Leaders WHERE LeaderType = ?").get(b.rec.leaderType);
  return (row && loc(row.Name)) || b.rec.leaderType;
}

function reviewMarkdown({ built, totals, unlockRows, loc, dbs }) {
  const out = [];
  const p = (s = "") => out.push(s);
  p("# Mapping review list");
  p();
  p(
    wrap(
      `Built ${new Date().toISOString().slice(0, 10)} by scripts/mapping/build-mapping.mjs from the compiled Debug databases and the listed leader mods' files on tp-share. Nothing in the game's data links an ability bullet to its modifiers, so every match below with more than one bullet is a guess drafted from the bullet text against the modifiers' arguments and requirements (scripts/mapping/vanilla-draft.mjs and modded-draft.mjs). Every row ships Reviewed = 0, so the split modes deal each of these leaders whole until you confirm its rows. Nothing here has been watched in a game.`
    )
  );
  p();
  p(
    wrap(
      `To confirm a leader, check each bullet's modifiers and value below, fix the draft file if something's wrong, rerun the script, and then mark its rows reviewed. Value runs 1 (small) to 5 (large) and is a rough feel for the Balanced deal; drawbacks score 1 because the scale has no negatives.`
    )
  );
  p();
  p("## Totals");
  p();
  p(item(`${totals.vanillaLeaders} base game and DLC leaders, ${totals.moddedLeaders} listed modded leaders.`));
  p(item(`${totals.rows.LShufMapping} pieces (${totals.bulletPieces} bullets, ${totals.agendaPieces} agenda pieces); ${totals.guesses} of them are guesses.`));
  p(item(`${totals.modifiers} ability modifiers: ${totals.placed} placed in a piece, ${totals.unplaced} unplaced (they stay in the leader's remainder).`));
  p(item(`${totals.unlocks} legend-node unlocks recorded (base game and DLC only).`));
  p(
    item(
      `${totals.specificModifiersVanilla} base game and DLC modifiers (${totals.specificModifiers} with the modded ones) name a specific civ, unit, unit class, building, improvement or project; ${totals.specificPieces} pieces carry a SpecificTo flag.`
    )
  );
  p(item(`${totals.movable0} pieces set Movable = 0; ${totals.wholeOnly} modded abilities have no bullets and can only be dealt whole.`));
  p();
  p("## Things to decide first");
  p();
  const firsts = [
    "Agenda modifiers. CONTRACTS 4.3 names DIPLOMACY_AGENDA_TIMED_UPDATE, but three leaders carry agenda rows with other effects: Harriet Tubman's Veracity is EFFECT_DIPLOMACY_AGENDA_ON_WAR_START (her only agenda row), Tecumseh's first Suzerain of the World row is EFFECT_DIPLOMACY_AGENDA_ON_DISPERSE_IP, and Franklin's FRANKLIN_MOD_AGENDA_CIVIC_VIRTUE is EFFECT_BASIC_DIPLOMACY_MODS carrying the agenda's own name (ModName LOC_DIPLOMACY_AGENDA_CIVIC_VIRTUE_NAME). The script puts all three on the agenda piece and marks those pieces Guess = 1. That makes 40 agenda rows across 38 leaders, where SPEC 2 counts 37.",
    "Ibn Battuta's Wildcard bullet. Its modifier, IBN_BATTUTA_MOD_WILDCARD_ATTRIBUTE, is EFFECT_DO_NOTHING, and nothing in the database or the game's scripts grants the two Wildcard points, so the engine keys the grant to something else. Whether another leader holding this piece gets the points needs a lab check. His two hidden Expansionist unlocks and his three legend-node unlocks ride with this piece.",
    "Yi Sun-sin's first bullet. The free Fleet Commander moves, but building them in Antiquity needs TRAIT_UNLOCK_FLEET_COMMANDER, which stays with Yi (CONTRACTS 12.4), and so does the Discipline civic unlock when he keeps most of his pieces. Another leader may get one free commander and no way to build more.",
    "Genghis Khan. One modifier (GENGHIS_KHAN_ARMY_COMMANDER_ABILITY) carries bullets 2 and 3 and the +5 of bullet 1. The draft puts it on bullet 2 and sets bullet 3 to Movable = 0 since it has no modifier of its own.",
    "Shipped start biases that no bullet explains: Confucius Grassland, Hatshepsut Desert, Jose Rizal Tropical, Xerxes and Xerxes (alt) Desert, Ibn Battuta Flat, Charlemagne River, Trung Trac Vegetated. In Split random these leaders' bias tags come only from their bullets, so these leanings drop out. Coast tags on naval bullets are drafted from text; the data only names coasts through requirements, and none of the base game's ability modifiers has one.",
    "SpecificTo holds every civ, unit, unit class, building, improvement or project type a piece reaches, as |A|B|, because several pieces name more than one. Going by the data, every base game and DLC piece still works on another leader, so only two bullets set Movable = 0, both with no modifier at all (Genghis Khan bullet 3, Akyuu bullet 3)."
  ];
  for (const f of firsts) p(item(f));
  p();

  const section = (title, list) => {
    p(`## ${title}`);
    p();
    for (const b of list) leaderSection(b);
  };
  const leaderSection = (b) => {
    const r = b.rec;
    p(`### ${leaderName(b, loc)} (${r.leaderType})`);
    p();
    const facts = [`Ability ${r.trait || "not found"}`];
    if (r.isModded) facts.push(`mod ${r.modId}, Workshop ${r.workshopId}`);
    if (r.configTrait && r.configTrait.length) facts.push(r.configTrait.includes(r.trait) ? "frontend LeaderItems agrees" : `frontend LeaderItems says ${r.configTrait.join(", ")}`);
    facts.push(`${r.modifiers.length} modifiers, ${r.bullets.length} bullets`);
    const biasDb = r.isModded ? (r.source ? r.source.db : null) : dbs.gameplay;
    const shipped = biasDb ? shippedBiases(biasDb, r.leaderType) : [];
    facts.push(shipped.length ? `shipped leader biases: ${shipped.join(", ")}` : "no shipped leader biases");
    p(wrap(facts.join("; ") + "."));
    p();
    for (const x of b.problems) p(item(`Problem: ${x}`));
    for (const n of b.notes) p(item(`Note: ${n}`));
    if (b.problems.length || b.notes.length) p();
    if (r.unparsed) {
      p(wrap("The mod's files couldn't be read into an ability, so nothing is written for this leader."));
      p();
      return;
    }
    for (const piece of b.pieces) {
      if (piece.Kind === "bullet") {
        p(
          item(
            `Bullet ${piece.BulletIndex} (${piece.PieceId}), value ${piece.Value}${piece.Guess ? ", guess" : ", read from data"}${piece.Movable ? "" : ", Movable = 0"}: "${plainText(piece.BulletText)}"`
          )
        );
        const eff = piece.modifiers.filter((m) => m.role === "effect").map((m) => m.id);
        const hid = piece.modifiers.filter((m) => m.role === "hidden").map((m) => m.id);
        p(item(`Modifiers: ${eff.length ? eff.join(", ") : "none"}.${hid.length ? ` Hidden: ${hid.join(", ")}.` : ""}`, 2));
        p(item(`Why: ${piece.why}`, 2));
        if (piece.dataTags.length || piece.draftedTags.length) {
          const parts = [];
          if (piece.dataTags.length) parts.push(`${piece.dataTags.join(", ")} read from requirements or adjacencies`);
          if (piece.draftedTags.length) parts.push(`${piece.draftedTags.join(", ")} drafted from the text (a guess)`);
          p(item(`Bias tags: ${parts.join("; ")}.`, 2));
        }
        if (piece.SpecificTo) p(item(`SpecificTo: ${piece.SpecificTo}`, 2));
        if (piece.Note) p(item(`Note: ${piece.Note}`, 2));
      } else {
        const names = (piece.agendaNames || []).map((t) => (r.textOf && r.textOf(t)) || loc(t) || t);
        p(item(`Agenda (${piece.PieceId})${names.length ? `, ${names.join(" / ")}` : ""}${piece.Guess ? ", check" : ""}: ${piece.modifiers.map((m) => m.id).join(", ")}.`));
        if (piece.Guess) p(item(piece.why, 2));
        if (piece.SpecificTo) p(item(`SpecificTo: ${piece.SpecificTo}`, 2));
      }
    }
    for (const u of b.unplaced) p(item(`Unplaced: ${u.id}. ${u.why}`));
    if (r.isModded && r.source) {
      const hits = leaderCheckHits(r.source, r.modifiers.map((m) => m.id));
      if (hits.length) p(item(`Check 2 would fail: ${hits.join(", ")} use REQUIREMENT_PLAYER_LEADER_TYPE_MATCHES.`));
      if (r.unlocks && r.unlocks.length) {
        p(item(`The mod's own ability-gated unlocks (not written to LShufMappingUnlocks, which holds the base game's): ${r.unlocks.map((u) => `${u.ProgressionTreeNodeType} -> ${u.TargetType}`).join(", ")}.`));
      }
    } else if (!r.isModded) {
      const mine = unlockRows.filter((u) => u.RequiredTraitType === r.trait);
      if (mine.length) {
        const byTree = {};
        for (const u of mine) byTree[u.ProgressionTree || "no tree"] = (byTree[u.ProgressionTree || "no tree"] || 0) + 1;
        const override = mine.find((u) => u.PieceId);
        p(
          item(
            `Legend and leader-only unlocks: ${mine.length} (${Object.entries(byTree).map(([t, n]) => `${t} ${n}`).join(", ")})${override ? `, all following ${override.PieceId}` : ""}.`
          )
        );
      }
    }
    p();
  };
  section("Base game and DLC leaders", built.filter((b) => !b.rec.isModded));
  section("Listed modded leaders", built.filter((b) => b.rec.isModded));
  return out.join("\n");
}

main();
