// The game's data as each age loads it, read from the game's own module files: base-standard, the age module and
// every DLC module, taking the UpdateDatabase files of the action groups whose criteria hold for that age. From it,
// each civilization's ability as it stands in the age the civilization plays: the TraitModifiers rows and each
// modifier's effect, arguments and requirements. The Antiquity gameplay database holds only Antiquity's rows, so an
// Exploration or Modern civilization's ability is read from here.
//
//   node scripts/mapping/civ-age-source.mjs --dump [AGE_EXPLORATION|AGE_MODERN] [CIVILIZATION_X]
//
// The scratch databases take the Antiquity fixture's schema (tests/fixtures/source-db/gameplay-copy.sqlite).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { parseXml, childrenNamed, findAll, firstChild } from "./xml-lite.mjs";
import { applyDatabaseXml, applyGameEffects, applySql, resolveXrefs, schemaOf, scratchDb } from "./mod-loader.mjs";
import { DataSource } from "./data-source.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const STEAM = path.join(os.homedir(), "Library/Application Support/Steam/steamapps/common/Sid Meier's Civilization VII",
  "CivilizationVII.app/Contents/Resources");
const SAVED = "/Users/tylermiller/Repos/civilization_vii_mods/civilization_vii_1.5.0_game_files/Resources";
export const RESOURCES = fs.existsSync(path.join(STEAM, "Base")) ? STEAM : SAVED;
const FIXTURE = path.join(ROOT, "tests/fixtures/source-db/gameplay-copy.sqlite");

export const AGES = ["AGE_ANTIQUITY", "AGE_EXPLORATION", "AGE_MODERN"];
const AGE_MODULE = { AGE_ANTIQUITY: "age-antiquity", AGE_EXPLORATION: "age-exploration", AGE_MODERN: "age-modern" };

// The module folders in load order: base-standard, the age module, then every DLC module (each DLC's modules folder
// holds one .modinfo).
function moduleDirs(age) {
  const dirs = [path.join(RESOURCES, "Base/modules/base-standard"), path.join(RESOURCES, "Base/modules", AGE_MODULE[age])];
  const dlc = path.join(RESOURCES, "DLC");
  if (fs.existsSync(dlc)) {
    for (const name of fs.readdirSync(dlc).sort()) {
      const dir = path.join(dlc, name, "modules");
      if (fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.toLowerCase().endsWith(".modinfo"))) dirs.push(dir);
    }
  }
  return dirs;
}

// Whether a modinfo criterion holds in `age`: AlwaysMet, an AgeInUse naming the age, ModInUse (every DLC is
// installed here) and anything else the game decides at runtime count as met; an AgeInUse list without the age
// doesn't.
function criteriaFor(info) {
  const out = new Map();
  for (const c of findAll(info, "Criteria")) {
    if (!c.attrs.id) continue;
    const ages = childrenNamed(c, "AgeInUse").map((n) => n.text.trim());
    out.set(c.attrs.id, { ages, any: ages.length === 0 });
  }
  return out;
}

const holds = (criteria, id, age) => {
  if (!id || id === "always") return true;
  const c = criteria.get(id);
  return !c || c.any || c.ages.includes(age);
};

// Loads one module's game-scope UpdateDatabase files for the age into `game`, GameEffects into the maps.
function loadModule(dir, age, game, effects, problems) {
  const infoName = fs.readdirSync(dir).find((f) => f.toLowerCase().endsWith(".modinfo"));
  const info = parseXml(fs.readFileSync(path.join(dir, infoName), "utf8"));
  const criteria = criteriaFor(info);
  const seen = new Set();
  for (const group of findAll(info, "ActionGroup")) {
    if (group.attrs.scope !== "game" || !holds(criteria, group.attrs.criteria, age)) continue;
    for (const actions of childrenNamed(group, "Actions")) {
      for (const action of childrenNamed(actions, "UpdateDatabase")) {
        for (const item of childrenNamed(action, "Item")) {
          const rel = item.text.trim();
          if (!rel || seen.has(rel)) continue;
          seen.add(rel);
          const file = path.join(dir, rel);
          if (!fs.existsSync(file)) {
            problems.push(`${dir}: ${rel} listed but missing`);
            continue;
          }
          const source = fs.readFileSync(file, "utf8");
          if (/\.sql$/i.test(rel)) applySql(game, source, rel, problems);
          else if (/\.xml$/i.test(rel)) {
            const root = parseXml(source);
            if (firstChild(root, "GameEffects")) applyGameEffects(root, rel, effects.map, problems, effects.reqs, effects.sets);
            else applyDatabaseXml(game, root, rel, problems);
          }
        }
      }
    }
  }
}

const cache = new Map();

// { age, db, source: DataSource, problems }
export function ageSource(age) {
  if (cache.has(age)) return cache.get(age);
  const fixture = new DatabaseSync(FIXTURE, { readOnly: true });
  const game = scratchDb(schemaOf(fixture));
  fixture.close();
  const effects = { map: new Map(), reqs: new Map(), sets: new Map() };
  const problems = [];
  for (const dir of moduleDirs(age)) loadModule(dir, age, game, effects, problems);
  resolveXrefs(effects.map, effects.reqs);
  for (const [setId, set] of effects.sets) {
    try {
      game.prepare("INSERT OR IGNORE INTO RequirementSets (RequirementSetId, RequirementSetType) VALUES (?, ?)")
        .run(setId, set.type || "REQUIREMENTSET_TEST_ALL");
      set.requirements.forEach((r0, n) => {
        const r = r0.xref ? { ...(effects.reqs.get(r0.xref) || { type: `UNRESOLVED:${r0.xref}`, args: [] }), inverse: r0.inverse } : r0;
        const reqId = r0.xref || r.id || `${setId}__${n}`;
        game.prepare("INSERT OR IGNORE INTO Requirements (RequirementId, RequirementType, Inverse) VALUES (?, ?, ?)")
          .run(reqId, r.type, r.inverse ? 1 : 0);
        game.prepare("INSERT OR IGNORE INTO RequirementSetRequirements (RequirementSetId, RequirementId) VALUES (?, ?)").run(setId, reqId);
        for (const a of r.args || []) {
          game.prepare("INSERT OR IGNORE INTO RequirementArguments (RequirementId, Name, Value) VALUES (?, ?, ?)").run(reqId, a.name, a.value);
        }
      });
    } catch (e) {
      problems.push(`RequirementSet ${setId}: ${e.message}`);
    }
  }
  const out = { age, db: game, source: new DataSource(game, { gameEffects: effects.map }), problems };
  cache.set(age, out);
  return out;
}

// Each civilization's age and ability trait, from the age's own data: [{ civ, age, trait }].
export function civsOfAge(age) {
  const { db } = ageSource(age);
  return db.prepare(`SELECT ct.CivilizationType civ, ct.TraitType trait FROM CivilizationTraits ct
    JOIN LegacyCivilizations lc ON lc.CivilizationType = ct.CivilizationType AND lc.Age = ?
    WHERE ct.TraitType LIKE 'TRAIT_%_ABILITY' AND ct.CivilizationType IN (SELECT CivilizationType FROM Civilizations)
    GROUP BY ct.CivilizationType ORDER BY ct.CivilizationType`).all(age).map((r) => ({ ...r, age }));
}

// The ability's modifiers in that age: ids in order, and a reader for each modifier's effect, arguments and
// requirements (DataSource.modifier shape).
export function abilityInAge(age, trait) {
  const { db, source } = ageSource(age);
  const mods = db.prepare("SELECT ModifierId FROM TraitModifiers WHERE TraitType = ? ORDER BY ModifierId").all(trait).map((r) => r.ModifierId);
  return { mods, modifier: (id) => source.modifier(id), reach: (id) => source.reach(id) };
}

function dump(age, onlyCiv) {
  const fmt = (m) => {
    if (!m) return "    (no definition)";
    const args = m.args.map((a) => `${a.name}=${a.value}`).join(", ");
    const reqs = [...m.owner.map((r) => `owner:${r.inverse ? "!" : ""}${r.type}(${r.args.map((a) => `${a.name}=${a.value}`).join(",")})`),
      ...m.subject.map((r) => `subject:${r.inverse ? "!" : ""}${r.type}(${r.args.map((a) => `${a.name}=${a.value}`).join(",")})`)];
    return `    effect=${m.effect} coll=${m.collection} args[${args}]${reqs.length ? `\n      ${reqs.join("\n      ")}` : ""}`;
  };
  for (const c of civsOfAge(age)) {
    if (onlyCiv && c.civ !== onlyCiv) continue;
    const ab = abilityInAge(age, c.trait);
    console.log(`== ${c.civ} (${age}) ${c.trait}: ${ab.mods.length} modifiers`);
    for (const id of ab.mods) console.log(`  ${id}\n${fmt(ab.modifier(id))}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes("--dump")) {
    const age = args.find((a) => a.startsWith("AGE_")) || "AGE_EXPLORATION";
    const civ = args.find((a) => a.startsWith("CIVILIZATION_")) || null;
    const { problems } = ageSource(age);
    dump(age, civ);
    if (problems.length) console.log(`problems: ${problems.length} (first: ${JSON.stringify(problems[0]).slice(0, 200)})`);
  }
}
