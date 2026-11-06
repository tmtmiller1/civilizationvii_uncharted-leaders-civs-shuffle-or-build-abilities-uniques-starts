// Prints each known leader's bullets and ability modifiers (arguments and requirements), the raw material the
// drafts in vanilla-draft.mjs and modded-draft.mjs were written from. Usage:
//   node scripts/mapping/dump-abilities.mjs [--modded] [LEADER_X ...]

import { openDebugDbs, readVanilla, readModded } from "./read-leaders.mjs";

const argv = process.argv.slice(2);
const modded = argv.includes("--modded");
const only = argv.filter((a) => !a.startsWith("--"));
const dbs = openDebugDbs();
const { source, leaders: vanilla } = readVanilla(dbs);
const leaders = modded ? readModded(dbs, source) : vanilla;

const fmtArgs = (args) =>
  args
    .filter((a) => a.name !== "Tooltip")
    .map((a) => `${a.name}=${a.value}`)
    .join(", ");
const fmtReqs = (reqs, label) => reqs.map((r) => `      ${label}: ${r.inverse ? "NOT " : ""}${r.type}(${fmtArgs(r.args)})`).join("\n");

for (const rec of leaders) {
  if (only.length && !only.includes(rec.leaderType)) continue;
  console.log(`\n=== ${rec.leaderType} ${rec.trait || "(no ability)"}${rec.modId ? ` [${rec.modId}]` : ""}`);
  for (const p of rec.problems) console.log(`  PROBLEM: ${p.what}`);
  if (rec.loadProblems && rec.loadProblems.length) console.log(`  (${rec.loadProblems.length} load problems)`);
  if (rec.before && rec.before.trim()) console.log(`  BEFORE: ${rec.before.trim()}`);
  rec.bullets.forEach((b, i) => console.log(`  B${i + 1}: ${b}`));
  if (rec.after && rec.after.trim()) console.log(`  AFTER: ${rec.after.trim()}`);
  for (const m of rec.modifiers) {
    const i = m.info;
    if (!i) {
      console.log(`  - ${m.id} (MISSING)`);
      continue;
    }
    console.log(`  - ${m.id} [${i.effect} / ${i.collection}]${m.agenda ? " AGENDA" : ""} ${m.agenda ? "" : fmtArgs(i.args)}`);
    if (!m.agenda) {
      if (i.subject.length) console.log(fmtReqs(i.subject, "S"));
      if (i.owner.length) console.log(fmtReqs(i.owner, "O"));
    }
  }
}
