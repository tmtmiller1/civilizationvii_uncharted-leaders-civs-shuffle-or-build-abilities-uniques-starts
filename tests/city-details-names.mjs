// Workstream D's nameStepsInTree(tree, ctx) (ui/game/lshuf-city-details-names.js): each named percentage step in the
// income's base steps replaces "Other" with a line of its own, "Other" keeps whatever is still unexplained, and a line
// gets a child row only when ctx.sourceRow finds one source. Fixture trees: tests/fixtures/yield-trees/trees.mjs.
//
// tree and ctx are the shapes the module's JSDoc gives (CONTRACTS section 7 names the function but not them):
// tree = { children, base }, ctx = { otherName, percentType, multiplyType, flatType, stylize, sourceRow }. The rule
// "no matching modifier, or two, gives no child row" lives in the module's sourceRowFor(), which isn't exported and
// reads GameInfo; here sourceRow stands in for its two outcomes (a row, or null).
import assert from "node:assert/strict";
import test from "node:test";

import { importShipped } from "./_harness.mjs";
import { DISPLAY, NO_OTHER, ONE_STEP, OTHER, REPEATED_STEP, STEP, TOO_LARGE, TWO_STEPS, UNDER_MODIFIER } from "./fixtures/yield-trees/trees.mjs";

const load = () => importShipped("ui/game/lshuf-city-details-names.js");

function ctx(sourceFor = () => null) {
  const asked = [];
  return {
    asked,
    otherName: OTHER,
    percentType: STEP.PERCENTAGE,
    multiplyType: STEP.MULTIPLY,
    flatType: DISPLAY.FLAT,
    stylize: (s) => s,
    sourceRow: (name, percent) => {
      asked.push([name, percent]);
      return sourceFor(name, percent);
    }
  };
}

const FOOD = { name: "Food", value: 10, valueType: DISPLAY.PERCENTAGE, children: [] };
const names = (t) => t.children.map((r) => [r.name, r.value]);

test("no matching source (none, or two): the line, with no child row", async () => {
  const { nameStepsInTree } = await load();
  const t = ONE_STEP();
  const c = ctx(() => null);
  const added = nameStepsInTree(t, c);
  assert.deepEqual(names(t), [["From Buildings", 5], ["Earth Shaker", 0.5]], "Other is replaced");
  assert.equal(added.length, 1);
  assert.deepEqual(added[0].children, []);
  assert.deepEqual(c.asked, [["Earth Shaker", 10]], "sourceRow gets the step's name and its percent");
});

test("one matching source: one child row", async () => {
  const { nameStepsInTree } = await load();
  const t = ONE_STEP();
  const added = nameStepsInTree(t, ctx((name) => (name === "Earth Shaker" ? FOOD : null)));
  assert.deepEqual(added[0].children, [FOOD]);
  assert.equal(added[0].valueType, DISPLAY.FLAT);
});

test("two named steps: two lines, and Other keeps the rest", async () => {
  const { nameStepsInTree } = await load();
  const t = TWO_STEPS();
  const c = ctx();
  nameStepsInTree(t, c);
  assert.deepEqual(names(t), [["From Buildings", 5], ["Earth Shaker", 0.5], ["Warrior-Queen of Zazzau", 0.25], [OTHER, 0.25]]);
  assert.deepEqual(c.asked, [["Earth Shaker", 10], ["Warrior-Queen of Zazzau", 5]]);
});

test("a step at two levels is named once", async () => {
  const { nameStepsInTree } = await load();
  const t = REPEATED_STEP();
  nameStepsInTree(t, ctx());
  assert.deepEqual(names(t), [["From Buildings", 5], ["Earth Shaker", 0.5]]);
});

test("left alone: a step bigger than Other, no Other row, a step under the income modifiers", async () => {
  const { nameStepsInTree } = await load();
  for (const [label, make] of [["too large", TOO_LARGE], ["no Other", NO_OTHER], ["under modifier", UNDER_MODIFIER]]) {
    const t = make();
    const before = JSON.stringify(t.children);
    assert.deepEqual(nameStepsInTree(t, ctx()), [], label);
    assert.equal(JSON.stringify(t.children), before, `${label}: rows unchanged`);
  }
});

// matchSourceModifier(stepName, yieldType, percent, modifierRows): the pure source match behind the child row.
const row = (from, percent = "10", extra = {}) => ({
  TooltipText: "Earth Shaker",
  FromYieldType: from,
  ToYieldType: "YIELD_PRODUCTION",
  Percent: percent,
  ...extra
});
const match = async (rowsIn, percent = 10) =>
  (await load()).matchSourceModifier("Earth Shaker", "YIELD_PRODUCTION", percent, rowsIn);

test("matchSourceModifier: one match gives its source yield and percent", async () => {
  assert.deepEqual(await match([row("YIELD_FOOD")]), { fromYieldType: "YIELD_FOOD", percent: 10 });
});

test("matchSourceModifier: no match (other name, other target yield, no rows) gives null", async () => {
  assert.equal(await match([]), null);
  assert.equal(await match([row("YIELD_FOOD", "10", { TooltipText: "Warrior-Queen of Zazzau" })]), null);
  assert.equal(await match([row("YIELD_FOOD", "10", { ToYieldType: "YIELD_GOLD" })]), null);
});

test("matchSourceModifier: two rows with different source yields give null", async () => {
  assert.equal(await match([row("YIELD_FOOD"), row("YIELD_GOLD")]), null);
});

test("matchSourceModifier: two rows with the same source yield still match", async () => {
  assert.deepEqual(await match([row("YIELD_FOOD"), row("YIELD_FOOD")]), { fromYieldType: "YIELD_FOOD", percent: 10 });
});

test("matchSourceModifier: a percent mismatch gives null; a null percent skips the percent check", async () => {
  assert.equal(await match([row("YIELD_FOOD", "15")]), null);
  assert.deepEqual(await match([row("YIELD_FOOD", "15")], null), { fromYieldType: "YIELD_FOOD", percent: 15 });
  assert.deepEqual(
    await match([row("YIELD_FOOD", "15"), row("YIELD_GOLD", "10")]),
    { fromYieldType: "YIELD_GOLD", percent: 10 },
    "the 15% row drops out, leaving one match"
  );
});
