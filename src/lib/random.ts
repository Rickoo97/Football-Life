/**
 * Small, dependency-free seeded PRNG (xorshift32) shared by every part of the
 * game that needs reproducible randomness — the match engine, season-ending
 * transfer offers, etc. Given the same seed it always produces the same
 * sequence, which is what makes match/season outcomes replayable and testable.
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  if (state === 0) {
    state = 0x6d2b79f5;
  }

  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1_000_000) / 1_000_000;
  };
}
