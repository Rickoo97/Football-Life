import { describe, expect, it } from "vitest";

import { createSeededRandom } from "./random";

describe("createSeededRandom", () => {
  it("produces the same sequence for the same seed", () => {
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);

    const sequenceA = Array.from({ length: 20 }, () => a());
    const sequenceB = Array.from({ length: 20 }, () => b());

    expect(sequenceA).toEqual(sequenceB);
  });

  it("always returns values within [0, 1)", () => {
    const random = createSeededRandom(1337);

    for (let i = 0; i < 200; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("handles a seed of zero without getting stuck", () => {
    const random = createSeededRandom(0);
    const values = Array.from({ length: 10 }, () => random());

    expect(new Set(values).size).toBeGreaterThan(1);
  });
});
