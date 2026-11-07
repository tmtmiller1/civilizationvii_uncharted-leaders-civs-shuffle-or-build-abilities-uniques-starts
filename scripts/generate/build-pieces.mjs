// The card ids of Build your own leader (CONTRACTS 13), one action group each: every bullet in the mapping file,
// one whole, one behavior and one start terrain card per known leader, the seven attribute traits
// (data/schema/gameplay-tables.sql), a civilization start terrain card per known civilization, and the civilization
// ability and unique cards of shared/lshuf-known-civ-items.js, and every bonus in the civilization mapping file.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BUILD, GENERIC_BIASES, pieceId } from "../../shared/lshuf-constants.js";
import { KNOWN_LEADERS } from "../../shared/lshuf-known-leaders.js";
import { KNOWN_CIVS } from "../../shared/lshuf-known-civs.js";
import { KNOWN_CIV_ITEMS } from "../../shared/lshuf-known-civ-items.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const ATTRIBUTE_TRAITS = [
  "TRAIT_LEADER_ATTRIBUTE_CULTURAL",
  "TRAIT_LEADER_ATTRIBUTE_ECONOMIC",
  "TRAIT_LEADER_ATTRIBUTE_EXPANSIONIST",
  "TRAIT_LEADER_ATTRIBUTE_MILITARISTIC",
  "TRAIT_LEADER_ATTRIBUTE_POLITICAL",
  "TRAIT_LEADER_ATTRIBUTE_SCIENTIFIC",
  "TRAIT_LEADER_ATTRIBUTE_WILDCARD"
];

// Bullet piece ids from a mapping file (the rows of Kind 'bullet'): the leader mapping, or the civilization
// mapping (CONTRACTS 19).
export function mappingBulletIds(file = "data/mapping/lshuf-mapping.sql") {
  const sql = fs.readFileSync(path.join(root, file), "utf8");
  const ids = new Set();
  for (const m of sql.matchAll(/'([A-Za-z0-9_]+__B\d{2})'/g)) ids.add(m[1]);
  return [...ids].sort();
}
export const civMappingBulletIds = () => mappingBulletIds("data/mapping/lshuf-civ-mapping.sql");

export function buildPieceIds() {
  const ids = new Set(mappingBulletIds());
  for (const l of KNOWN_LEADERS) {
    ids.add(pieceId.whole(l));
    ids.add(BUILD.persona(l));
    ids.add(BUILD.bias(l));
  }
  for (const [tag] of GENERIC_BIASES) ids.add(BUILD.genericBias(tag));
  for (const t of ATTRIBUTE_TRAITS) {
    ids.add(BUILD.attribute(t));
    ids.add(BUILD.attribute(t, 2));
  }
  for (const c of KNOWN_CIVS) ids.add(BUILD.civBias(c));
  // Civilization abilities and uniques (CONTRACTS 14).
  for (const i of KNOWN_CIV_ITEMS) {
    if (i.kind === "ability") ids.add(BUILD.civAbility(i.civ));
    else if (i.kind === "civics") ids.add(BUILD.civCivics(i.civ));
    else ids.add(BUILD.civUnique(i.type));
  }
  for (const id of civMappingBulletIds()) ids.add(id);
  return [...ids].sort();
}
