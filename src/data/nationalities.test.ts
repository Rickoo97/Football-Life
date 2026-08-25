import { describe, expect, it } from "vitest";

import {
  NATIONALITIES,
  NATIONALITY_CODES,
  findNationality,
  getNationalityLabel,
} from "./nationalities";

describe("nationalities", () => {
  it("offers a shortlist of well-known football countries", () => {
    expect(NATIONALITIES.length).toBeGreaterThanOrEqual(10);
    expect(NATIONALITIES.length).toBeLessThanOrEqual(15);
    expect(NATIONALITY_CODES).toContain("NL");
  });

  it("has unique codes and a label plus flag for every entry", () => {
    expect(new Set(NATIONALITY_CODES).size).toBe(NATIONALITIES.length);

    for (const nationality of NATIONALITIES) {
      expect(nationality.code).toMatch(/^[A-Z]{2}$/);
      expect(nationality.label.length).toBeGreaterThan(2);
      expect(nationality.flag.length).toBeGreaterThan(0);
    }
  });

  it("looks up a country by code", () => {
    expect(findNationality("BR")?.label).toBe("Brazilië");
    expect(findNationality("XX")).toBeUndefined();
  });

  it("falls back to the raw code for unknown countries in old saves", () => {
    expect(getNationalityLabel("NL")).toBe("Nederland");
    expect(getNationalityLabel("XX")).toBe("XX");
  });
});
