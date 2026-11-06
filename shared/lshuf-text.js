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
