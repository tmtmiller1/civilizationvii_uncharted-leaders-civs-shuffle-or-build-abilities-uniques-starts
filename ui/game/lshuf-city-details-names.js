// Names the percentage bonus lines that City Details' Yields Breakdown folds into "Other" (SPEC section 3, "Naming
// the bonus lines in City Details"; probe 11 and its follow-up). The wrap sits on the shared CityDetails model, not on
// the panel, so Cultural Diffusion's and Partisans' panel decorators keep working. The game's own code runs first.
//
// Each named line is the step's own description ("Earth Shaker +0.5") with one child row naming its source ("Food
// +10%"), so it has the expand arrow and lines up with the game's rows. Only the income's base steps are searched; the
// income modifiers (the game's "Bonus" line) are left alone.
import CityDetails from "/base-standard/ui/city-details/model-city-details.js";

const PATCHED = Symbol.for("uncharted-leaders-and-civs.city-details-names");
const VERSION = "1";
const EPSILON = 1e-6;

// Named percentage steps under a node, walking base and steps but never into a `modifier` branch. A percentage node
// counts as its outermost ancestor of the same name: on 1.5.1 the step worth 0.5 carries the name and the percentage
// nodes inside it carry the same name with values of 50 (lab run econ-21, 2026-11-12).
function ownersWith(named, node) {
  return node.description && !named.has(node.description) ? new Map(named).set(node.description, node) : named;
}

function addOwner(out, owner) {
  if (owner && owner.value && !out.includes(owner)) out.push(owner);
}

function percentSteps(node, percentType, out = [], seen = new Set(), named = new Map()) {
  if (!node || typeof node !== "object" || seen.has(node)) return out;
  seen.add(node);
  const owners = ownersWith(named, node);
  addOwner(out, node.type === percentType ? owners.get(node.description) : null);
  percentSteps(node.base, percentType, out, seen, owners);
  for (const step of node.steps || []) percentSteps(step, percentType, out, seen, owners);
  return out;
}

/** The multiplier inside a percentage step (its MULTIPLY step's modifier value), or null. */
export function stepPercent(node, multiplyType, seen = new Set()) {
  if (!node || typeof node !== "object" || seen.has(node)) return null;
  seen.add(node);
  if (node.type === multiplyType && node.modifier && node.modifier.value) return node.modifier.value;
  for (const child of [node.base, node.modifier, ...(node.steps || [])]) {
    const value = stepPercent(child, multiplyType, seen);
    if (value != null) return value;
  }
  return null;
}

/**
 * Puts named lines in place of the "Other" row of one yield's breakdown. Pure: everything it needs is in ctx.
 * @param {{ children: object[], base: object }} tree topYieldData.children and the income node's base
 * @param {{ otherName: string, percentType: *, multiplyType: *, flatType: *, stylize: (s: string) => string,
 *   sourceRow: (name: string, percent: number | null) => (object | null) }} ctx
 * @returns {object[]} the rows added
 */
export function nameStepsInTree(tree, ctx) {
  const kids = tree && tree.children;
  if (!kids || !tree.base) return [];
  const at = kids.findIndex((row) => row.name === ctx.otherName);
  if (at < 0) return [];
  const other = kids[at];
  // A step shows once per level it appears at; the first of each name is the one to show.
  const found = new Map();
  for (const step of percentSteps(tree.base, ctx.percentType)) {
    if (!found.has(step.description)) found.set(step.description, step);
  }
  let left = other.value;
  const named = [];
  for (const [name, step] of found) {
    if (step.value > left + EPSILON) continue;
    const source = ctx.sourceRow(name, stepPercent(step, ctx.multiplyType));
    named.push({ name: ctx.stylize(name), value: step.value, valueType: ctx.flatType, tooltip: undefined,
      children: source ? [source] : [] });
    left -= step.value;
  }
  if (!named.length) return [];
  kids.splice(at, 1, ...named);
  if (left > EPSILON) kids.splice(at + named.length, 0, { ...other, value: left });
  return named;
}

// Conversion modifiers by the text their Tooltip composes to: { FromYieldType, ToYieldType, Percent }. Read from
// GameInfo once, so other mods' modifiers count. The step's id doesn't lead to its modifier (probe 11 follow-up).
let byTooltip = null;
function tooltipIndex() {
  if (byTooltip) return byTooltip;
  const args = new Map();
  for (const arg of GameInfo.ModifierArguments) {
    let entry = args.get(arg.ModifierId);
    if (!entry) args.set(arg.ModifierId, (entry = {}));
    entry[arg.Name] = arg.Value;
  }
  byTooltip = new Map();
  for (const [id, entry] of args) {
    if (!entry.Tooltip || !entry.FromYieldType || entry.Percent == null) continue;
    const text = Locale.compose(entry.Tooltip);
    if (!byTooltip.has(text)) byTooltip.set(text, []);
    byTooltip.get(text).push({ id, ...entry });
  }
  return byTooltip;
}

/**
 * The source of a named percentage step, matched on plain rows. Pure.
 * @param {string} stepName the step's description
 * @param {string|null} yieldType the yield the breakdown is for (YIELD_PRODUCTION)
 * @param {number|null} percent the multiplier inside the step; null matches any Percent
 * @param {{ TooltipText: string, FromYieldType: string, ToYieldType: string, Percent: * }[]} modifierRows conversion
 *   modifiers, each with its Tooltip already composed to text
 * @returns {{ fromYieldType: string, percent: number } | null} null unless exactly one source yield matches
 */
export function matchSourceModifier(stepName, yieldType, percent, modifierRows) {
  const hits = (modifierRows || []).filter((m) => m.TooltipText === stepName && m.ToYieldType === yieldType
    && (percent == null || Number(m.Percent) === percent));
  const froms = [...new Set(hits.map((m) => m.FromYieldType))];
  if (froms.length !== 1) return null;
  return { fromYieldType: froms[0], percent: Number(hits[0].Percent) };
}

function sourceRowFor(yieldIndex) {
  const toYield = GameInfo.Yields[yieldIndex] ? GameInfo.Yields[yieldIndex].YieldType : null;
  return (name, percent) => {
    const rows = (tooltipIndex().get(name) || []).map((m) => ({ ...m, TooltipText: name }));
    const match = matchSourceModifier(name, toYield, percent, rows);
    if (!match) return null;
    const from = GameInfo.Yields.lookup(match.fromYieldType);
    if (!from) return null;
    return { name: Locale.stylize(Locale.compose(from.Name)), value: match.percent,
      valueType: GameValueDisplayTypes.PERCENTAGE, children: [] };
  };
}

const hasSteps = (node) => !!(node && Array.isArray(node.steps) && node.steps.length);
const call = (target, name, ...args) => (target && typeof target[name] === "function" ? target[name](...args) : null);

/**
 * The income node's base step with its steps, from whichever of the city's yield reads carries them. City Details reads
 * only the value of the summary node (getYieldSummaryForNode) and takes steps from getYieldsForNode; in lab run
 * rel-citydetails (2026-11-12) the summary path named nothing although the full tree (getYields) held the step. So the
 * steps come from getYieldsForNode, then from the full tree at the step whose value is the income's, and the summary
 * last. Pure apart from the calls on cityYields.
 * @returns {object|null}
 */
export function incomeBase(cityYields, yieldIndex, incomeNode) {
  if (!cityYields || incomeNode == null) return null;
  const summary = call(cityYields, "getYieldSummaryForNode", yieldIndex, [incomeNode]);
  const node = call(cityYields, "getYieldsForNode", yieldIndex, [incomeNode], true);
  if (node && hasSteps(node.base)) return node.base;
  const income = incomeStepOfTree(call(cityYields, "getYields"), yieldIndex, summary);
  if (income) return income.base;
  return summary && hasSteps(summary.base) ? summary.base : null;
}

// The income step in the full tree: the root's base step whose value is the summary's, else the first with steps.
function incomeStepOfTree(all, yieldIndex, summary) {
  const root = all ? all[yieldIndex] : null;
  const steps = (root && root.base && root.base.steps) || [];
  const same = (step) => summary && Math.abs(step.value - summary.value) < EPSILON;
  return steps.find((step) => same(step) && hasSteps(step.base)) || steps.find((step) => hasSteps(step.base)) || null;
}

function nameLines(cityYields, yieldIndex, topYieldData) {
  const nodes = globalThis.CityYieldNodes;
  const base = incomeBase(cityYields, yieldIndex, nodes && nodes.INCOME);
  nameStepsInTree({ children: topYieldData.children, base }, {
    otherName: Locale.compose("LOC_GLOBAL_YIELDS_OTHER"),
    percentType: GameValueStepTypes.PERCENTAGE,
    multiplyType: GameValueStepTypes.MULTIPLY,
    flatType: GameValueDisplayTypes.FLAT,
    stylize: (text) => Locale.stylize(text),
    sourceRow: sourceRowFor(yieldIndex)
  });
}

/** Wraps CityDetails.addIncomeHierarchy once. Returns false when the model isn't there to wrap. */
export function installCityDetailsNames() {
  const model = CityDetails;
  if (!model || typeof model.addIncomeHierarchy !== "function") return false;
  if (model[PATCHED] === VERSION) return true;
  const original = model.addIncomeHierarchy;
  model.addIncomeHierarchy = function (cityYields, yieldIndex, topYieldData, yieldInfo) {
    const result = original.call(this, cityYields, yieldIndex, topYieldData, yieldInfo);
    try {
      nameLines(cityYields, yieldIndex, topYieldData);
    } catch (error) {
      console.error(`[lshuf-city-details] ${error}`);
    }
    return result;
  };
  Object.defineProperty(model, PATCHED, { value: VERSION, configurable: true });
  return true;
}
