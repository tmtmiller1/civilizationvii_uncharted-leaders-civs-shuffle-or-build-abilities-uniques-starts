// The deal: one algorithm, run here for the setup screen and the game's scripts, and as generated SQL in the
// gameplay database (scripts/generate/). Both give the same LShufResult* rows for the same tables and config
// (CONTRACTS.md section 5). Pure: no game globals, imports only from shared/.
import { REASON, STATUS } from "../lshuf-constants.js";
import { DEAL_VERSION, sortIds } from "./lshuf-deal-util.js";
import { AXES, AXIS_NAME, axisReasonFor, computeAxes, isOffFor, makeContext } from "./lshuf-deal-axes.js";
import { dealAbility } from "./lshuf-deal-ability.js";
import { dealAttributes } from "./lshuf-deal-attributes.js";
import { dealBiases } from "./lshuf-deal-biases.js";
import { dealPersona, dealUnlocks, personaFrom } from "./lshuf-deal-unlocks.js";
import { buildDealInput } from "./lshuf-deal-input.js";
import { buildStates, isBuilder } from "./lshuf-deal-build.js";
import { dealCivBuilds } from "./lshuf-deal-civ.js";

export { DEAL_VERSION, buildDealInput };

function leaderReason(ctx, axes, ability, leader) {
  for (const axis of AXES) {
    const r = axisReasonFor(axes[axis], leader);
    if (r != null) return r;
  }
  if (isBuilder(ctx, leader)) return REASON.Built;
  return ability.changed[leader] ? REASON.ModdedChanged : null;
}

function biasFromOf(axes, biases, leader) {
  if (axes.B.dealtSet.has(leader)) return biases.biasFrom[leader];
  return isOffFor(axes.B, leader) ? null : leader;
}

function leaderRows(ctx, axes, ability, persona, biases) {
  return ctx.majors.map((leader) => {
    const dealtAxes = AXES.filter((a) => axes[a].dealtSet.has(leader)).map((a) => AXIS_NAME[a]);
    return {
      LeaderType: leader,
      Status: dealtAxes.length ? STATUS.Dealt : STATUS.AsShipped,
      Axes: dealtAxes.length ? `|${dealtAxes.join("|")}|` : null,
      Reason: leaderReason(ctx, axes, ability, leader),
      AbilityFrom: ability.abilityFrom[leader],
      PersonaFrom: personaFrom(ctx, axes, ability, persona, leader),
      BiasFrom: biasFromOf(axes, biases, leader)
    };
  });
}

function metaRows(ctx, axes) {
  const rows = [
    { Name: "Seed", Value: String(ctx.seed) },
    { Name: "Mode", Value: String(ctx.f.mode) },
    { Name: "DealVersion", Value: String(DEAL_VERSION) }
  ];
  for (const axis of AXES) if (axes[axis].fallback) rows.push({ Name: `Fallback_${AXIS_NAME[axis]}`, Value: REASON.TooFew });
  for (const b of ctx.builds) rows.push({ Name: b.slot === 1 ? "Builder" : `Builder${b.slot}`, Value: b.ok ? "ok" : b.why });
  return rows;
}

export function computeDeal(input) {
  const ctx = makeContext(input);
  ctx.builds = buildStates(ctx);
  const axes = computeAxes(ctx);
  const ability = dealAbility(ctx, axes);
  const persona = dealPersona(ctx, axes);
  const attributes = dealAttributes(ctx, axes, ability);
  const biases = dealBiases(ctx, axes, ability);
  const pieces = [];
  for (const leader of sortIds(ctx.majors)) pieces.push(...(ability.pieces[leader] || []));
  const civ = dealCivBuilds(ctx);
  return {
    leaders: leaderRows(ctx, axes, ability, persona, biases),
    pieces,
    attributes: attributes.rows,
    biases: biases.rows,
    unlocks: dealUnlocks(ctx, axes, ability, attributes),
    civPieces: civ.rows,
    meta: [...metaRows(ctx, axes), ...civ.meta]
  };
}
