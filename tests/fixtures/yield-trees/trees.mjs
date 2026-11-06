// Fixture yield breakdowns for workstream D's nameStepsInTree (SPEC "Naming the bonus lines in City Details").
// A tree is { children, base } as ui/game/lshuf-city-details-names.js documents it: `children` the rows City Details
// built for one yield (topYieldData.children, with its "Other" row), `base` the income node's base step from
// city.Yields, whose nodes are shaped as probe 11 read them: { id, type, description, value, base, modifier, steps }.
// A percentage step's percent sits in a MULTIPLY step's modifier.value below it.

export const STEP = { ADDITION: 0, MULTIPLY: 1, PERCENTAGE: 2 };
export const DISPLAY = { FLAT: 0, PERCENTAGE: 1 };
export const OTHER = "Other";

const percentStep = (id, description, value, percent) => ({
  id,
  type: STEP.PERCENTAGE,
  description,
  value,
  steps: [{ id: id + 1000, type: STEP.MULTIPLY, value, modifier: { value: percent }, steps: [] }]
});

const base = (steps) => ({
  id: 2,
  type: STEP.ADDITION,
  description: "",
  value: 5 + steps.reduce((s, c) => s + c.value, 0),
  steps: [{ id: 3, type: STEP.ADDITION, description: "From Buildings", value: 5, steps: [] }, ...steps]
});

const rows = (other) => [
  { name: "From Buildings", value: 5, valueType: DISPLAY.FLAT, children: [{ name: "Palace", value: 5, children: [] }] },
  ...(other == null ? [] : [{ name: OTHER, value: other, valueType: DISPLAY.FLAT, children: [] }])
];

export const tree = (steps, other) => ({ children: rows(other), base: base(steps) });

// Pachacuti's bullet on someone else: one named step, nothing else unexplained.
export const ONE_STEP = () => tree([percentStep(10, "Earth Shaker", 0.5, 10)], 0.5);

// Two named steps and a little left over: both get lines, "Other" keeps the rest.
export const TWO_STEPS = () =>
  tree([percentStep(20, "Earth Shaker", 0.5, 10), percentStep(30, "Warrior-Queen of Zazzau", 0.25, 5)], 1);

// The same step appearing at two levels: one line.
export const REPEATED_STEP = () => {
  const t = tree([percentStep(40, "Earth Shaker", 0.5, 10)], 0.5);
  t.base.steps[1].steps.push(percentStep(41, "Earth Shaker", 0.5, 10));
  return t;
};

// A step worth more than "Other" holds: left alone.
export const TOO_LARGE = () => tree([percentStep(50, "Earth Shaker", 2, 10)], 0.5);

// No "Other" row: nothing to do.
export const NO_OTHER = () => tree([percentStep(60, "Earth Shaker", 0.5, 10)], null);

// A percentage step under a `modifier` branch (the game's "Bonus" line): not searched.
export const UNDER_MODIFIER = () => {
  const t = tree([], 0.5);
  t.base.modifier = percentStep(70, "Earth Shaker", 0.5, 10);
  return t;
};
