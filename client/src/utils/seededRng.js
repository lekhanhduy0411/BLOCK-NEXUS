/**
 * Mulberry32 Deterministic 32-bit PRNG
 * Guarantees every player gets the exact same board & piece sequence for a given stage seed.
 */
export function createSeededRng(seed) {
  let state = (Number(seed) >>> 0) || 1;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
