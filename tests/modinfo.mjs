// The built modinfo (scripts/build-modinfo.mjs) names no missing file, and workstream B's generated groups have the
// ids, criteria, files and load orders CONTRACTS section 9 gives them.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { builder, need, ownerOf, parseModinfo, PROJECT_ROOT } from "./_harness.mjs";
import {
  configKeyOf, DEALING, KEY, MODE, OPTION_DEFAULTS, PARAM, PERSONA, REVEAL, SEED_MAX, SEED_MIN, A_MODE, B_MODE,
  T_MODE, CA_MODE, CU_MODE, MODE_CUSTOM, CC_MODE
} from "../shared/lshuf-constants.js";
import { KNOWN_LEADERS, MODDED_LEADER_TYPES, VANILLA_LEADERS } from "../shared/lshuf-known-leaders.js";

const MODINFO = "uncharted-leaders-and-civs.modinfo";

test("the built modinfo names no missing file", async () => {
  const { buildModinfo, missingItems } = await builder();
  const missing = missingItems(buildModinfo());
  const byOwner = {};
  for (const rel of missing) (byOwner[ownerOf(rel)] = byOwner[ownerOf(rel)] || []).push(rel);
  assert.deepEqual(byOwner, {}, `missing files by workstream: ${JSON.stringify(byOwner, null, 1)}`);
});

test("the .modinfo on disk is the one the builder makes", async () => {
  const { buildModinfo } = await builder();
  const onDisk = fs.readFileSync(need(MODINFO), "utf8");
  assert.ok(onDisk === buildModinfo(), "the .modinfo is stale: run npm run build:modinfo");
});

test("every .js and .css under ui/ and shared/ is imported in both scopes; UIScripts entries per section 7", async () => {
  const { buildModinfo } = await builder();
  const { groups } = parseModinfo(buildModinfo());
  const shipped = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(PROJECT_ROOT, dir), { withFileTypes: true })) {
      if (e.isDirectory()) walk(`${dir}/${e.name}`);
      else if (/\.(js|css)$/.test(e.name)) shipped.push(`${dir}/${e.name}`);
    }
  };
  ["ui", "shared"].forEach(walk);
  const itemsOf = (id, type) =>
    groups
      .find((g) => g.id === id)
      .actions.filter((a) => a.type === type)
      .flatMap((a) => a.items);
  for (const id of ["lshuf-shell", "lshuf-game-ui"]) {
    const imports = itemsOf(id, "ImportFiles");
    assert.deepEqual(shipped.filter((f) => !imports.includes(f)), [], `${id} ImportFiles`);
  }
  assert.deepEqual(itemsOf("lshuf-shell", "UIScripts"), ["ui/setup/lshuf-setup.js", "ui/display/lshuf-setup-display.js"]);
  assert.deepEqual(itemsOf("lshuf-game-ui", "UIScripts"), ["ui/game/lshuf-game.js"]);
});

function generated() {
  need("data/generated/modinfo-criteria.xml");
  need("data/generated/modinfo-groups.xml");
  const xml = `<Mod><ActionCriteria>${fs.readFileSync(path.join(PROJECT_ROOT, "data/generated/modinfo-criteria.xml"), "utf8")}</ActionCriteria>
    <ActionGroups>${fs.readFileSync(path.join(PROJECT_ROOT, "data/generated/modinfo-groups.xml"), "utf8")}</ActionGroups></Mod>`;
  return parseModinfo(xml);
}

function expectGroup(model, id, { type, key, value }) {
  const g = model.groups.find((x) => x.id === id);
  assert.ok(g, `group ${id}`);
  assert.equal(g.scope, "game", `${id} scope`);
  const c = model.criteria.get(g.criteria);
  assert.ok(c, `${id}: criteria ${g.criteria} defined`);
  assert.deepEqual(
    c.conditions.map((x) => [x.type, x.group, x.key, x.value]),
    [[type, "Game", key, value]],
    `${id} criteria`
  );
  return g;
}

const BOOLS = ["KeepMine", "ModdedAbilities", "ModdedAttributes", "ModdedBiases"];
const VALUES = {
  Mode: [...Object.values(MODE), MODE_CUSTOM],
  Biases: Object.values(B_MODE),
  Abilities: Object.values(A_MODE),
  Attributes: Object.values(T_MODE),
  CivAbilities: Object.values(CA_MODE),
  CivUniques: Object.values(CU_MODE),
  CivCivics: Object.values(CC_MODE),
  Personality: Object.values(PERSONA),
  Dealing: Object.values(DEALING),
  Reveal: Object.values(REVEAL),
  KeepBuiltCiv: ["1", "0"],
  HumanFollows: ["1", "0"]
};

test("generated groups: ids, criteria and files as section 9 gives them", () => {
  const model = generated();
  const M = "ConfigurationValueMatches";
  const C = "ConfigurationValueContains";
  const ids = model.groups.map((g) => g.id);
  assert.equal(new Set(ids).size, ids.length, "group ids are unique");
  assert.ok(ids.every((id) => id.startsWith("lshuf-")), "group ids start with lshuf-");
  for (let n = SEED_MIN; n <= SEED_MAX; n++) {
    const g = expectGroup(model, `lshuf-seed-${n}`, { type: M, key: PARAM.Seed, value: String(n) });
    const items = g.actions.filter((a) => a.type === "UpdateDatabase").flatMap((a) => a.items);
    assert.deepEqual(items, [`data/generated/seed/seed-${n}.sql`], `lshuf-seed-${n} file`);
  }
  for (const name of Object.keys(OPTION_DEFAULTS)) {
    const key = configKeyOf(PARAM[name]);
    if (BOOLS.includes(name)) expectGroup(model, `lshuf-opt-${name}-1`, { type: M, key, value: "1" });
    else for (const v of VALUES[name]) expectGroup(model, `lshuf-opt-${name}-${v}`, { type: M, key, value: v });
  }
  for (const l of KNOWN_LEADERS) {
    expectGroup(model, `lshuf-keep-${l}`, { type: M, key: KEY.keep(l), value: "1" });
    expectGroup(model, `lshuf-notin-${l}`, { type: C, key: KEY.NotInGame, value: `|${l}|` });
  }
  for (const l of VANILLA_LEADERS) expectGroup(model, `lshuf-out-${l}`, { type: C, key: "LShufExcludedLeaders", value: `|${l}|` });
  for (const l of MODDED_LEADER_TYPES) {
    expectGroup(model, `lshuf-moddedout-${l}`, { type: C, key: "LShufExcludedModdedLeaders", value: `|${l}|` });
    expectGroup(model, `lshuf-modok-${l}`, { type: M, key: KEY.modOK(l), value: "1" });
  }
});

test("generated groups: inputs at 20010, the deal at 20100 and up, always on", () => {
  const model = generated();
  const deal = model.groups.filter((g) => g.id.startsWith("lshuf-deal-"));
  assert.ok(deal.length > 0, "at least one lshuf-deal-* group");
  for (const g of deal) {
    assert.ok(g.loadOrder >= 20100, `${g.id} LoadOrder ${g.loadOrder}`);
    assert.ok(model.criteria.get(g.criteria)?.conditions.every((c) => c.type === "AlwaysMet") || g.criteria === "always", `${g.id} is always on`);
  }
  const orders = deal.map((g) => g.loadOrder);
  assert.equal(new Set(orders).size, orders.length, "each deal group has its own LoadOrder, so the order is fixed");
  for (const g of model.groups.filter((x) => !x.id.startsWith("lshuf-deal-"))) {
    assert.equal(g.loadOrder, 20010, `${g.id} LoadOrder`);
  }
});
