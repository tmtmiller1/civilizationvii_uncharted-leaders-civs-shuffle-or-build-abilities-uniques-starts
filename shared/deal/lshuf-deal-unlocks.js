// Legend nodes and other ability-gated unlocks (SPEC section 3 table), and whose personality each leader plays.
import { TRAIT } from "../lshuf-constants.js";
import { SALT } from "../lshuf-key.js";
import { cyclicDonors } from "./lshuf-deal-util.js";
import { isOffFor } from "./lshuf-deal-axes.js";
import { cardId } from "./lshuf-deal-attributes.js";

export function dealPersona(ctx, axes) {
  const A = axes.A;
  const ownPool = A.off && ctx.f.active && A.eligible.length >= 2 ? A.eligible : [];
  const pool = A.dealt.length ? A.dealt : ownPool;
  const donors = ctx.f.redealtPersona && pool.length >= 2 ? cyclicDonors(ctx.seed, SALT.Personality, pool) : {};
  return { donors };
}

export function personaFrom(ctx, axes, ability, persona, leader) {
  const A = axes.A;
  if (A.dealtSet.has(leader)) {
    if (ctx.f.redealtPersona) return persona.donors[leader];
    return ctx.f.follows ? ability.abilityFrom[leader] : leader;
  }
  if (isOffFor(A, leader) && persona.donors[leader]) return persona.donors[leader];
  return leader;
}

// The leader whose attribute card carries an unlock in tree `tree`, or undefined to fall back.
function attributeHolder(ctx, axes, attrs, owner, tree) {
  const trait = ctx.input.attrTrees.find((a) => a.tree === tree && ctx.byType.get(owner).attrs.includes(a.trait));
  if (!trait) return undefined;
  if (isOffFor(axes.T, owner)) return undefined;
  return attrs.cardHolder[cardId(owner, trait.trait)];
}

function splitHolder(ctx, deal, u, owner) {
  const { axes, ability, attrs } = deal;
  const override = ctx.input.unlockPiece[`${u.node}|${u.target}`];
  if (override && ability.receiverOf[override]) return ability.receiverOf[override];
  const viaAttr = u.tree == null ? undefined : attributeHolder(ctx, axes, attrs, owner, u.tree);
  return viaAttr || ability.largestReceiver[owner] || owner;
}

function holderTrait(ctx, axes, ability, holder) {
  if (axes.A.dealtSet.has(holder)) return ability.path[holder] === "trait" ? null : TRAIT.dealt(holder);
  return ctx.byType.get(holder).ability;
}

export function dealUnlocks(ctx, axes, ability, attrs) {
  const owners = {};
  for (const l of ctx.input.leaders) if (l.ability && !(l.ability in owners)) owners[l.ability] = l.type;
  const rows = [];
  for (const u of ctx.input.unlocks) {
    const owner = owners[u.trait];
    const row = { ProgressionTreeNodeType: u.node, TargetType: u.target, FromTraitType: u.trait };
    if (axes.A.dealtSet.has(owner)) {
      const holder = ctx.f.isWhole ? ability.wholeHolder[owner] : splitHolder(ctx, { axes, ability, attrs }, u, owner);
      row.ToLeaderType = holder;
      row.ToTraitType = holderTrait(ctx, axes, ability, holder) || u.trait;
    } else if (isOffFor(axes.A, owner)) {
      row.ToLeaderType = null;
      row.ToTraitType = null;
    } else {
      row.ToLeaderType = owner;
      row.ToTraitType = u.trait;
    }
    rows.push(row);
  }
  return rows;
}
