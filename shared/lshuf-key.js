// The one source of pseudo-random order for the deal. The gameplay SQL and the frontend preview both order things
// by this key, so it has to give the same number in SQLite's 64-bit integers and in JavaScript doubles: every
// intermediate value stays below 2^53. Owned by the lead; the formula is fixed in CONTRACTS.md.
//
//   x0 = (seed * 7919 + salt * 104729 + rank * 1299709 + 1) % P
//   x1 = (x0 * x0 + 1013904223) % P
//   key = (x1 * x1 + 1664525) % P
//
// seed is the deal number (1..256), salt names the draw (SALT below), rank is the 0-based position of the item in
// its list sorted by id (BINARY order). Ties in key are broken by id, ascending.

export const KEY_PRIME = 67108859;

export const SALT = {
  Leaders: 1,
  Pieces: 2,
  Attributes: 3,
  AttributeRedraw: 4,
  Biases: 5,
  BiasKind: 6,
  BiasTarget: 7,
  BiasScore: 8,
  CivBiases: 9,
  Personality: 10,
  Pools: 11,
  Unlocks: 12,
  CivAbilities: 13,
  CivUniques: 14,
  CivCivics: 15,
  CivPieces: 16,
  CivNodes: 17,
  CivUniquePieces: 18,
  CivTags: 19
};

export function lshufKey(seed, salt, rank) {
  const P = KEY_PRIME;
  const x0 = (seed * 7919 + salt * 104729 + rank * 1299709 + 1) % P;
  const x1 = (x0 * x0 + 1013904223) % P;
  return (x1 * x1 + 1664525) % P;
}

// The same formula as an SQLite expression over column or literal expressions.
export function lshufKeySql(seedExpr, saltExpr, rankExpr) {
  const P = KEY_PRIME;
  const x0 = `((${seedExpr}) * 7919 + (${saltExpr}) * 104729 + (${rankExpr}) * 1299709 + 1) % ${P}`;
  const x1 = `(((${x0}) * (${x0})) + 1013904223) % ${P}`;
  return `((((${x1}) * (${x1})) + 1664525) % ${P})`;
}
