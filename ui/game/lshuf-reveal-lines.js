// The "Who got what" lines for one leader: where each dealt bonus came from, the attributes it holds and from whom, the
// start terrain's origin, the AI behavior's origin, and the shuffle number for the local player. Shown under the
// ability text in the diplomacy leader panel (ui/game/lshuf-reveal-panel.js). Pure: every engine call comes in
// through `lookups`, so tests can pass plain functions.
//
// lookups:
//   compose(key, ...args) -> string            Locale.compose
//   abilityOf(leaderType) -> { name, description } | null   the leader's shipped ability keys
//   leaderName(leaderType) -> string            the leader's composed name
//   attributeName(traitType) -> string | null   the attribute an attribute trait stands for, composed
//   whyOf(leaderType) -> string | null          the setup screen's check detail for a modded leader left out
import { REASON, STATUS } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-constants.js";
import { bulletAt, splitBullets } from "/re-dealable-leader-abilities-attributes-and-start-biases/shared/lshuf-text.js";
import { reasonKey, whyKey } from "/re-dealable-leader-abilities-attributes-and-start-biases/ui/display/lshuf-display-util.js";

// LShufResultLeaders.Axes holds the dealt axes as |ABILITY|ATTRIBUTES|BIASES|.
const AXIS = { Ability: "ABILITY", Attributes: "ATTRIBUTES", Biases: "BIASES" };
const hasAxis = (row, axis) => String(row.Axes || "").includes(`|${axis}|`);
const BULLET_ID = /__B(\d+)$/;

const composed = (lookups, key, ...args) => {
  if (!key) return "";
  const text = lookups.compose(key, ...args);
  return text == null ? "" : String(text);
};
const missing = (text, key) => !text || text === key;

// "from Amina", or "their own" for a part the leader had already.
const fromLabel = (leaderType, from, lookups) => (from && from !== leaderType
  ? composed(lookups, "LOC_LSHUF_DIPLO_FROM", lookups.leaderName(from))
  : composed(lookups, "LOC_LSHUF_DIPLO_OWN"));

// The text of one piece's bullet, the way the ability description shows it (lshuf-display-text.js bulletText).
function bulletText(piece, lookups) {
  const key = `LOC_LSHUF_PIECE_${piece.PieceId}`;
  const text = composed(lookups, key);
  if (!missing(text, key)) return text.trim();
  const match = BULLET_ID.exec(String(piece.PieceId));
  const ability = lookups.abilityOf(piece.FromLeaderType);
  if (!match || !ability) return "";
  return bulletAt(composed(lookups, ability.description), Number(match[1]));
}

// The bullets one piece contributes, each with the leader it came from.
function pieceBullets(piece, lookups) {
  const from = piece.FromLeaderType;
  const ability = lookups.abilityOf(from);
  if (piece.Kind === "bullet") {
    const text = bulletText(piece, lookups);
    return text ? [{ text, from }] : [];
  }
  if (piece.Kind === "remainder") {
    return [{ text: composed(lookups, "LOC_LSHUF_PIECE_REST", ability ? ability.name : from), from }];
  }
  const whole = ability ? composed(lookups, ability.description) : "";
  const split = splitBullets(whole);
  if (split.bullets.length) return split.bullets.map((text) => ({ text, from }));
  return whole.trim() ? [{ text: whole.trim(), from }] : [];
}

// The ability lines: one "Ability from X" line for a whole ability, one bullet per bonus otherwise.
function abilityLines(leaderType, row, deal, lookups) {
  if (!hasAxis(row, AXIS.Ability)) return [];
  const pieces = (deal.pieces || []).filter((p) => p.LeaderType === leaderType)
    .sort((a, b) => Number(a.SortIndex) - Number(b.SortIndex));
  if (!pieces.length) return [];
  if (pieces.length === 1 && pieces[0].Kind === "whole") {
    const from = pieces[0].FromLeaderType;
    const text = from && from !== leaderType
      ? composed(lookups, "LOC_LSHUF_DIPLO_ABILITY_FROM", lookups.leaderName(from))
      : composed(lookups, "LOC_LSHUF_DIPLO_ABILITY_OWN");
    return [{ kind: "line", text }];
  }
  const out = [];
  for (const piece of pieces) {
    for (const bullet of pieceBullets(piece, lookups)) {
      out.push({
        kind: "bullet", text: bullet.text, from: fromLabel(leaderType, bullet.from, lookups),
        own: !bullet.from || bullet.from === leaderType
      });
    }
  }
  return out;
}

// "Attributes: Cultural (from Amina), Economic" for the attribute cards the leader holds.
function attributeLine(leaderType, row, deal, lookups) {
  if (!hasAxis(row, AXIS.Attributes)) return [];
  const items = [];
  for (const card of deal.attributes || []) {
    if (card.LeaderType !== leaderType) continue;
    const name = lookups.attributeName(card.TraitType);
    if (!name) continue;
    const from = card.FromLeaderType;
    items.push(from && from !== leaderType
      ? composed(lookups, "LOC_LSHUF_DIPLO_ITEM_FROM", name, lookups.leaderName(from))
      : name);
  }
  if (!items.length) return [];
  return [{ kind: "line", text: composed(lookups, "LOC_LSHUF_DIPLO_ATTRIBUTES", items.join(", ")) }];
}

// Where the start terrain came from: another leader, or rolled or matched for this game (the bias rows' Origin).
function terrainLine(leaderType, row, deal, lookups) {
  if (!hasAxis(row, AXIS.Biases)) return [];
  if (row.BiasFrom && row.BiasFrom !== leaderType) {
    return [{ kind: "line", text: composed(lookups, "LOC_LSHUF_DIPLO_TERRAIN_FROM", lookups.leaderName(row.BiasFrom)) }];
  }
  if (row.BiasFrom) return [];
  const own = (deal.biases || []).filter((b) => b.LeaderType === leaderType);
  const key = own.some((b) => b.Origin === "tags") ? "LOC_LSHUF_DIPLO_TERRAIN_MATCHED" : "LOC_LSHUF_DIPLO_TERRAIN_DRAWN";
  return [{ kind: "line", text: composed(lookups, key) }];
}

function behaviorLine(leaderType, row, lookups) {
  if (!row.PersonaFrom || row.PersonaFrom === leaderType) return [];
  return [{ kind: "line", text: composed(lookups, "LOC_LSHUF_DIPLO_BEHAVIOR_FROM", lookups.leaderName(row.PersonaFrom)) }];
}

// The key of the reason a leader was left out, with the setup screen's check detail for a modded leader.
export function reasonKeyOf(row, whyOf) {
  if (!row || !row.Reason) return null;
  const why = row.Reason === REASON.ModdedNotOK && whyOf ? whyOf(row.LeaderType) : null;
  return why ? whyKey(why) : reasonKey(row.Reason);
}

/**
 * The section's lines for one leader, in display order. Each line is { kind: "line", text } or
 * { kind: "bullet", text, from } (a bonus and the "from Amina" label after it). Empty when the leader isn't in the
 * deal or has nothing to say.
 * @param {string} leaderType
 * @param {{leaders: object[], pieces: object[], attributes: object[], biases: object[]}} deal result rows
 * @param {object} lookups see the file comment
 * @param {{ seed?: *, isLocal?: boolean }} opts the shuffle number shows for the local player's leader
 */
export function revealLines(leaderType, deal, lookups, opts = {}) {
  const row = (deal.leaders || []).find((r) => r.LeaderType === leaderType);
  if (!row) return [];
  const lines = [];
  const reason = reasonKeyOf(row, lookups.whyOf);
  if (reason && row.Status !== STATUS.Dealt) {
    lines.push({ kind: "line", text: composed(lookups, "LOC_LSHUF_DIPLO_NOT_SHUFFLED", composed(lookups, reason)) });
  }
  if (row.Status === STATUS.Dealt) {
    lines.push(...abilityLines(leaderType, row, deal, lookups));
    lines.push(...attributeLine(leaderType, row, deal, lookups));
    lines.push(...terrainLine(leaderType, row, deal, lookups));
    lines.push(...behaviorLine(leaderType, row, lookups));
  }
  if (opts.isLocal && opts.seed != null && lines.length) {
    lines.push({ kind: "line", text: composed(lookups, "LOC_LSHUF_DEAL_NUMBER", String(opts.seed)) });
  }
  return lines;
}
