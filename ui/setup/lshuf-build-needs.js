// Picked cards whose text names a civilization's unique the builder doesn't hold: Carthage's "Receive a second
// Merchant or Colonist" bonus only does its Colonist half for a civ that has the Colonist. The build screen lists each
// one under the slots with a button to take the unique. Pure: cards and picks in, needs out.
//
// A unique counts as named when the card's text carries its icon ([icon:UNIT_COLONIST]) or its name as a whole word.
// It counts as held when it's the builder civilization's own (its card is marked own) or one of the picks.
import { BUILD_KIND, PIECE_NEEDS, buildKindOf } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";

const UNIQUE_PREFIX = "CIVUNQ_";
const ICON = /\[icon:([A-Za-z0-9_]+)\]/g;
const MARKUP = /\[[^\]]*\]/g;
// Shorter names (a three-letter unit) would match ordinary words.
const MIN_NAME = 4;

const typeOf = (card) => String(card.id).slice(UNIQUE_PREFIX.length);

// A letter in any script: one whose upper and lower case differ, or one of the scripts without case (CJK, Arabic and
// the like, above U+02FF). The game's script engine has no \p{L} in regular expressions, so this stands in for it.
const isLetter = (ch) => !!ch && (ch.toLowerCase() !== ch.toUpperCase() || ch.charCodeAt(0) > 0x2ff);

// Whether `name` sits in `text` as a whole word, ignoring case.
function wholeWord(text, name) {
  const hay = text.toLowerCase();
  const needle = name.toLowerCase();
  for (let at = hay.indexOf(needle); at >= 0; at = hay.indexOf(needle, at + 1)) {
    if (!isLetter(hay[at - 1]) && !isLetter(hay[at + needle.length])) return true;
  }
  return false;
}

function namedTypes(text, uniques) {
  const found = new Set();
  for (const m of String(text || "").matchAll(ICON)) found.add(m[1]);
  const plain = String(text || "").replace(MARKUP, " ");
  for (const [type, card] of uniques) {
    const name = String(card.name || "").trim();
    if (name.length < MIN_NAME) continue;
    if (wholeWord(plain, name)) found.add(type);
  }
  return found;
}

// The uniques the builder holds: the builder civilization's own and the ones picked.
function heldUniques(cards, picks) {
  const held = new Set(cards.filter((c) => c.kind === BUILD_KIND.CivUnique && c.own).map(typeOf));
  for (const id of picks) {
    if (buildKindOf(id) === BUILD_KIND.CivUnique) held.add(String(id).slice(UNIQUE_PREFIX.length));
  }
  return held;
}

/**
 * Each picked card that names a unique the builder doesn't hold, with that unique's card, and each picked bonus
 * that needs another bonus the builder hasn't taken (`bonus: true`, `unique` is then that bonus's card).
 * @param {object[]} cards the screen's cards ({ id, kind, name, text, civ, own })
 * @param {string[]} picks the builder's picked ids
 * @returns {{ card: object, unique: object, bonus?: boolean }[]} in pick order, one entry per card and unique
 */
export function uniqueNeeds(cards, picks) {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const uniques = new Map();
  for (const c of cards) if (c.kind === BUILD_KIND.CivUnique) uniques.set(typeOf(c), c);
  const held = heldUniques(cards, picks);
  const out = [];
  for (const id of picks) {
    const card = byId.get(id);
    if (!card || card.kind === BUILD_KIND.CivUnique) continue;
    // A bonus that needs another bonus (PIECE_NEEDS) comes first: it's the one that leaves the builder short.
    const other = byId.get(PIECE_NEEDS[id]);
    if (other && !picks.includes(other.id) && !other.own) out.push({ card, unique: other, bonus: true });
    for (const type of namedTypes(card.text, uniques)) {
      if (!held.has(type) && uniques.has(type)) out.push({ card, unique: uniques.get(type) });
    }
  }
  return out;
}
