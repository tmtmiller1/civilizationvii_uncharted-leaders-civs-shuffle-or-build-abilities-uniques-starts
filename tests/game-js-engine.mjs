// The game's script engine refuses some JavaScript that Node accepts, and a refusal there throws at runtime while
// every test here passes. Seen 2026-11-09: a \p{L} class in a RegExp emptied the Build your own civilization grid
// ("Invalid property name in character class"). This scans the code the game loads for such patterns.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RULES = [
  [/\\[pP]\{/, "Unicode property escapes (\\p{...}) in a RegExp"],
  [/\(\?<[=!]/, "lookbehind in a RegExp"],
  [/:not\(/, ":not() in a querySelector selector"]
];

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return files(p);
    return p.endsWith(".js") ? [p] : [];
  });
}

test("game-loaded scripts avoid what the game's engine refuses", () => {
  const found = [];
  for (const f of [...files(path.join(ROOT, "ui")), ...files(path.join(ROOT, "shared"))]) {
    const lines = fs.readFileSync(f, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (/^\s*\/\//.test(line)) return;
      for (const [re, what] of RULES) if (re.test(line)) found.push(`${path.relative(ROOT, f)}:${i + 1} ${what}`);
    });
  }
  assert.deepEqual(found, []);
});
