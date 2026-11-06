// `npm run check`: node --check on every shipped and tool JS file. Lint catches more; this is the quick pass.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const roots = ["ui", "shared", "scripts", "tests"];
const files = [];
const walk = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== "db") walk(full);
    else if (/\.(m?js)$/.test(entry.name)) files.push(full);
  }
};
roots.forEach(walk);
let failed = 0;
for (const file of files) {
  const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (r.status !== 0) {
    failed++;
    process.stdout.write(`FAIL ${file}\n${r.stderr}`);
  }
}
console.log(`${files.length - failed}/${files.length} files parse`);
process.exit(failed ? 1 : 0);
