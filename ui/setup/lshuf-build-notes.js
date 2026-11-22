// A note on every build card that comes with something else (owner, 2026-11-12; docs/NOTES-AUDIT.md): a whole ability
// or civics tree, bonuses that only work together and come as one card, a unique that brings bonuses with it, a bonus
// that needs another bonus, and the great person a civic or an ability brings. Read from the card data, the bonus links
// (PIECE_NEEDS, goesWith) and the great-person grants (LShufSetup_CivGreatPeople).
import { BUILD, BUILD_KIND, PIECE_NEEDS } from "/uncharted-leaders-and-civs/shared/lshuf-constants.js";
import { andList, joinBullets, splitBullets } from "/uncharted-leaders-and-civs/shared/lshuf-text.js";
import { compose, composedOrEmpty, query } from "/uncharted-leaders-and-civs/ui/setup/lshuf-build-query.js";
import { leadOf } from "/uncharted-leaders-and-civs/ui/setup/lshuf-build-civics.js";

// The great people each civilization's ability grants (game 1.5.1), with the civic that unlocks the quarter or
// improvement a grant names. [] on a setup copy without the table.
export function greatPeopleRows() {
  try {
    return query(`SELECT g.CivilizationType AS civ, g.UnitType AS unit, g.NameKey AS nameKey, g.DescKey AS descKey,
      g.AnchorType AS anchor, (SELECT MIN(c.NodeType) FROM LShufSetup_CivCivics c
        WHERE c.CivilizationType = g.CivilizationType AND c.UnlockType = g.UnitType) AS node
      FROM LShufSetup_CivGreatPeople g ORDER BY 1, 2`);
  } catch {
    return [];
  }
}

function addNote(card, line) {
  if (!card || !line) return;
  const own = splitBullets(card.text).bullets;
  card.text = joinBullets([...(own.length ? own : [card.text]), line].filter(Boolean));
}

// Notes a card carries from its own data: whole, whole tree, merged bonuses, a bonus it needs.
function ownNotes(c, byId) {
  if (c.kind === BUILD_KIND.Whole || c.kind === BUILD_KIND.CivAbility) addNote(c, compose("LOC_LSHUF_BUILD_CARD_WHOLE"));
  if (c.kind === BUILD_KIND.CivCivics) addNote(c, compose("LOC_LSHUF_BUILD_CARD_WHOLE_TREE"));
  if (c.merged) addNote(c, compose("LOC_LSHUF_BUILD_CARD_MERGED", andList(c.merged.map(String))));
  const other = byId.get(PIECE_NEEDS[c.id]);
  if (other) addNote(c, compose("LOC_LSHUF_BUILD_NEEDS_BONUS", c.name, other.name));
}

// A unique the game ties bonuses to (a card's goesWith) names them.
function bringsNotes(cards, byId) {
  const brings = new Map();
  for (const c of cards) {
    if (!c.goesWith || !byId.has(c.goesWith)) continue;
    if (!brings.has(c.goesWith)) brings.set(c.goesWith, []);
    brings.get(c.goesWith).push(c.name);
  }
  for (const [id, names] of brings) addNote(byId.get(id), compose("LOC_LSHUF_BUILD_BRINGS", andList(names)));
}

// The civic (or its lead) and the whole tree for a great person a quarter or improvement brings, else the ability.
function personTargets(g, byId) {
  const civic = g.node ? BUILD.civCivic(g.node) : null;
  if (g.anchor && civic) return [byId.get(civic) || byId.get(leadOf(civic)), byId.get(BUILD.civCivics(g.civ))];
  return [byId.get(BUILD.civAbility(g.civ))];
}

export function markBundleNotes(cards, people = []) {
  const byId = new Map(cards.map((c) => [c.id, c]));
  for (const c of cards) ownNotes(c, byId);
  bringsNotes(cards, byId);
  for (const g of people) {
    const line = compose("LOC_LSHUF_BUILD_GREAT_PERSON", composedOrEmpty(g.nameKey) || g.unit, composedOrEmpty(g.descKey));
    for (const t of new Set(personTargets(g, byId))) addNote(t, line);
  }
}
