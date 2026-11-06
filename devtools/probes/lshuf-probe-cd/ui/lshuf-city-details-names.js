// Probe 11: name the percentage bonus lines that City Details folds into "Other".
// Wraps the model's addIncomeHierarchy on the shared instance; the game's own code runs first.
import CityDetails from '/base-standard/ui/city-details/model-city-details.js';

const PERCENT = GameValueStepTypes.PERCENTAGE;
const OTHER = () => Locale.compose("LOC_GLOBAL_YIELDS_OTHER");

// Named percentage steps under the yield's income, found anywhere in its breakdown tree.
function percentSteps(node, out = [], seen = new Set()) {
  if (!node || typeof node !== "object" || seen.has(node)) return out;
  seen.add(node);
  if (node.type === PERCENT && node.description && node.value) out.push({ name: node.description, value: node.value, id: node.id, step: node });
  for (const k of ["base", "modifier"]) percentSteps(node[k], out, seen);
  for (const s of node.steps ?? []) percentSteps(s, out, seen);
  return out;
}

// A child row naming what the bonus is made from ("Food +10%"). The step's name is its modifier's Tooltip text, so the
// match is: a modifier whose Tooltip composes to that name, converting from some yield into this one, at the percent
// the step itself used. Read from GameInfo, so other mods' modifiers count. No single match, no child row.
let byTooltip = null;
function tooltipIndex() {
  if (byTooltip) return byTooltip;
  byTooltip = new Map();
  const args = new Map();
  for (const a of GameInfo.ModifierArguments) {
    let m = args.get(a.ModifierId);
    if (!m) args.set(a.ModifierId, (m = {}));
    m[a.Name] = a.Value;
  }
  for (const [id, m] of args) {
    if (!m.Tooltip || !m.FromYieldType || m.Percent == null) continue;
    const text = Locale.compose(m.Tooltip);
    if (!byTooltip.has(text)) byTooltip.set(text, []);
    byTooltip.get(text).push({ id, ...m });
  }
  return byTooltip;
}
function stepPercent(node, seen = new Set()) {
  if (!node || typeof node !== "object" || seen.has(node)) return null;
  seen.add(node);
  if (node.type === GameValueStepTypes.MULTIPLY && node.modifier && node.modifier.value) return node.modifier.value;
  for (const k of ["base", "modifier"]) { const v = stepPercent(node[k], seen); if (v != null) return v; }
  for (const c of node.steps ?? []) { const v = stepPercent(c, seen); if (v != null) return v; }
  return null;
}
function sourceRows(s, yieldIndex) {
  const rec = { name: s.name, match: null };
  log.ids.push(rec);
  const toYield = GameInfo.Yields[yieldIndex]?.YieldType;
  const pct = stepPercent(s.step);
  const hits = (tooltipIndex().get(s.name) ?? [])
    .filter((m) => m.ToYieldType === toYield && (pct == null || Number(m.Percent) === pct));
  const froms = [...new Set(hits.map((m) => m.FromYieldType))];
  rec.match = { toYield, pct, hits: hits.map((m) => m.id), froms };
  if (froms.length !== 1) return [];
  const from = GameInfo.Yields.lookup(froms[0]);
  return [{ name: Locale.stylize(Locale.compose(from.Name)), value: Number(hits[0].Percent),
    valueType: GameValueDisplayTypes.PERCENTAGE, children: [] }];
}

const original = CityDetails.addIncomeHierarchy;
const log = (globalThis.__lshufCd = { calls: 0, named: [], errors: [], ids: [] });
CityDetails.addIncomeHierarchy = function (cityYields, yieldIndex, topYieldData, yieldInfo) {
  original.call(this, cityYields, yieldIndex, topYieldData, yieldInfo);
  log.calls++;
  try {
    const kids = topYieldData.children;
    const i = kids.findIndex((c) => c.name === OTHER());
    if (i < 0) return;
    const other = kids[i];
    // The top steps hold the percentage step once per level it appears; keep the first of each name.
    const found = new Map();
    for (const s of percentSteps(cityYields.getYields()?.[yieldIndex])) if (!found.has(s.name)) found.set(s.name, s);
    let left = other.value;
    const named = [];
    for (const [name, s] of found) {
      if (s.value > left + 1e-6) continue;
      named.push({ name: Locale.stylize(name), value: s.value, valueType: GameValueDisplayTypes.FLAT,
        tooltip: undefined, children: sourceRows(s, yieldIndex) });
      left -= s.value;
    }
    if (!named.length) return;
    kids.splice(i, 1, ...named);
    if (left > 1e-6) kids.splice(i + named.length, 0, { ...other, value: left });
    log.named.push(named.map((n) => n.name + " " + n.value));
  } catch (e) {
    log.errors.push(String(e));
  }
};
console.warn("[lshuf-probe-cd] City Details wrap installed");
