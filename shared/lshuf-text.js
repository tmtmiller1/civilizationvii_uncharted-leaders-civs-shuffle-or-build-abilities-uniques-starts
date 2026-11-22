// How an ability description splits into bullets, in one place: the mapping script (bullet index and text), the
// generated piece text and the runtime display all count bullets the same way. Owned by the lead.
//
// An ability description is "[BLIST][LI]first[LI]second[/BLIST]", sometimes with text before [BLIST] or after
// [/BLIST]. Bullet 1 is the text after the first [LI]. A description with no [LI] has no bullets, and its ability
// can only be dealt whole.

const LI = "[LI]";

export function splitBullets(text) {
  const source = String(text || "");
  const first = source.indexOf(LI);
  if (first < 0) return { before: source, bullets: [], after: "" };
  const open = source.lastIndexOf("[BLIST]", first);
  const before = open >= 0 ? source.slice(0, open) : source.slice(0, first);
  const closeAt = source.indexOf("[/BLIST]", first);
  const body = closeAt >= 0 ? source.slice(first, closeAt) : source.slice(first);
  const after = closeAt >= 0 ? source.slice(closeAt + "[/BLIST]".length) : "";
  const bullets = body
    .split(LI)
    .slice(1)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
  return { before, bullets, after };
}

// Bullet n (1-based), or "" when there isn't one.
export const bulletAt = (text, index) => splitBullets(text).bullets[index - 1] || "";

export const joinBullets = (bullets) => (bullets.length ? `[BLIST]${bullets.map((b) => LI + b).join("")}[/BLIST]` : "");

// The bonus numbers a mapping piece holds when it's more than one ("1|3|4", or a run of BulletCount from BulletIndex),
// else null: those bonuses only work together, so the mapping merges them into one piece.
export function mergedBullets(piece) {
  const list = String((piece && piece.BulletList) || "").split("|").map(Number).filter((n) => n > 0);
  const first = Number(piece && piece.BulletIndex);
  const count = Math.max(1, Number((piece && piece.BulletCount) || 1));
  const nums = list.length ? list : Array.from({ length: count }, (_, i) => first + i);
  return nums.length > 1 ? nums : null;
}

// "1, 3 and 4" (the mod's text is English only for now).
export const andList = (items) => (items.length < 2 ? items.join("")
  : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);
