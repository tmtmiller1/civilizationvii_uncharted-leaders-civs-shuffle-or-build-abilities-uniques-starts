// Reads each known leader's ability from data: the base game and DLC leaders from Debug/*-copy.sqlite, the listed
// modded leaders from their mod folders on tp-share. The ability is the leader's trait whose Traits.Name is set
// (gameplay), checked against the frontend LeaderItems KIND_TRAIT row. Never by name pattern.

import { join } from "node:path";
import { homedir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { splitBullets } from "../../shared/lshuf-text.js";
import { VANILLA_LEADERS, MODDED_LEADERS } from "../../shared/lshuf-known-leaders.js";
import { DataSource } from "./data-source.mjs";
import { loadMod, schemaOf } from "./mod-loader.mjs";

export const DEBUG_DIR = join(homedir(), "Library", "Application Support", "Civilization VII", "Debug");
export const REFERENCE_MODS = "/Volumes/tp-share/Repos_Mine/civilization_vii_reference_mods";

export function openDebugDbs(dir = DEBUG_DIR) {
  const open = (name) => new DatabaseSync(join(dir, name), { readOnly: true });
  return {
    gameplay: open("gameplay-copy.sqlite"),
    frontend: open("frontend-copy.sqlite"),
    localization: open("localization-copy.sqlite")
  };
}

const AGENDA_EFFECT_PREFIX = "EFFECT_DIPLOMACY_AGENDA_";

// An agenda modifier: its effect is one of the game's agenda effects (EFFECT_DIPLOMACY_AGENDA_TIMED_UPDATE and its
// siblings ON_WAR_START, ON_DISPERSE_IP), or it carries the agenda's own name (a ModName argument that is an
// agenda name key, as Franklin's Civic Virtue rule does). The second test reads the argument, not the id.
export function agendaReason(mod) {
  if (!mod) return null;
  if (mod.effect && mod.effect.startsWith(AGENDA_EFFECT_PREFIX)) return mod.effect;
  const name = mod.args.find((a) => a.name === "ModName");
  if (name && /^LOC_DIPLOMACY_AGENDA_/.test(name.value)) return `ModName ${name.value}`;
  return null;
}

function abilityOf(db, leaderType) {
  return db
    .prepare(
      "SELECT t.TraitType, t.Name, t.Description FROM LeaderTraits lt JOIN Traits t ON t.TraitType = lt.TraitType WHERE lt.LeaderType = ? AND t.Name IS NOT NULL ORDER BY t.TraitType"
    )
    .all(leaderType);
}

function configTraitOf(db, leaderType) {
  try {
    return db.prepare("SELECT Type, Description FROM LeaderItems WHERE LeaderType = ? AND Kind = 'KIND_TRAIT'").all(leaderType);
  } catch {
    return [];
  }
}

function leaderRecord({ leaderType, source, gameplayDb, frontendDb, textOf, isModded, modId, problems }) {
  const rec = { leaderType, isModded, modId, problems: [...problems], trait: null, modifiers: [], bullets: [], before: "", after: "" };
  const leaderRow = gameplayDb.prepare("SELECT LeaderType, IsMajorLeader FROM Leaders WHERE LeaderType = ?").get(leaderType);
  if (!leaderRow) {
    rec.problems.push({ what: `no Leaders row for ${leaderType}` });
    return rec;
  }
  const abilities = abilityOf(gameplayDb, leaderType);
  if (abilities.length !== 1) {
    rec.problems.push({ what: `${abilities.length} traits with a Name on ${leaderType} (expected 1): ${abilities.map((a) => a.TraitType).join(", ")}` });
    if (!abilities.length) return rec;
  }
  const ability = abilities[0];
  rec.trait = ability.TraitType;
  rec.nameTag = ability.Name;
  rec.descTag = ability.Description;
  const config = configTraitOf(frontendDb, leaderType);
  rec.configTrait = config.map((c) => c.Type);
  if (!config.length) rec.problems.push({ what: "no frontend LeaderItems KIND_TRAIT row" });
  else if (!config.some((c) => c.Type === rec.trait)) {
    rec.problems.push({ what: `frontend LeaderItems KIND_TRAIT is ${rec.configTrait.join(", ")}, gameplay ability is ${rec.trait}` });
  }
  rec.descText = textOf(ability.Description);
  if (rec.descText == null) rec.problems.push({ what: `no en_US text for ${ability.Description}` });
  const split = splitBullets(rec.descText || "");
  rec.bullets = split.bullets;
  rec.before = split.before;
  rec.after = split.after;
  const ids = gameplayDb.prepare("SELECT ModifierId FROM TraitModifiers WHERE TraitType = ? ORDER BY rowid").all(rec.trait).map((r) => r.ModifierId);
  for (const id of ids) {
    const m = source.modifier(id);
    if (!m) rec.problems.push({ what: `TraitModifiers names ${id}, which has no Modifiers row or GameEffects entry` });
    rec.modifiers.push({ id, info: m, agenda: agendaReason(m) });
  }
  return rec;
}

export function readVanilla(dbs) {
  const source = new DataSource(dbs.gameplay);
  const textStmt = dbs.localization.prepare("SELECT Text FROM LocalizedText WHERE Tag = ? AND Language = 'en_US'");
  const textOf = (tag) => textStmt.get(tag)?.Text ?? null;
  const leaders = VANILLA_LEADERS.map((leaderType) =>
    leaderRecord({
      leaderType,
      source,
      gameplayDb: dbs.gameplay,
      frontendDb: dbs.frontend,
      textOf,
      isModded: false,
      modId: null,
      problems: []
    })
  );
  return { source, leaders };
}

// The listed modded leaders, one mod folder at a time (the Witch Trial pack holds three).
export function readModded(dbs, vanillaSource, root = REFERENCE_MODS) {
  const gameplaySchema = schemaOf(dbs.gameplay);
  const frontendSchema = schemaOf(dbs.frontend);
  const loaded = new Map();
  const leaders = [];
  for (const entry of MODDED_LEADERS) {
    const dir = join(root, entry.workshopId);
    if (!loaded.has(dir)) loaded.set(dir, loadMod(dir, { gameplaySchema, frontendSchema }));
    const mod = loaded.get(dir);
    if (mod.error) {
      leaders.push({
        leaderType: entry.leaderType,
        isModded: true,
        modId: entry.modId,
        problems: [{ what: mod.error }],
        trait: null,
        modifiers: [],
        bullets: [],
        unparsed: true
      });
      continue;
    }
    const source = new DataSource(mod.game, { fallback: vanillaSource, gameEffects: mod.gameEffects });
    const textOf = (tag) => (mod.texts.has(tag) ? mod.texts.get(tag) : null);
    // Problems that touch this leader's files are the ones worth showing; keep the rest as a count.
    const rec = leaderRecord({
      leaderType: entry.leaderType,
      source,
      gameplayDb: mod.game,
      frontendDb: mod.shell,
      textOf,
      isModded: true,
      modId: entry.modId,
      problems: []
    });
    if (mod.modId !== entry.modId) rec.problems.push({ what: `modinfo id is ${mod.modId}, the list says ${entry.modId}` });
    rec.loadProblems = mod.problems;
    rec.workshopId = entry.workshopId;
    rec.title = entry.title;
    rec.source = source;
    rec.textOf = textOf;
    rec.unlocks = (() => {
      try {
        return mod.game
          .prepare("SELECT ProgressionTreeNodeType, TargetType, RequiredTraitType FROM ProgressionTreeNodeUnlocks WHERE RequiredTraitType = ?")
          .all(rec.trait || "");
      } catch {
        return [];
      }
    })();
    if (!rec.trait || !rec.descText) rec.unparsed = true;
    leaders.push(rec);
  }
  return leaders;
}
