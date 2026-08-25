import { describe, expect, it } from "vitest";

import { NATIONALITIES } from "@/data/nationalities";
import {
  POSITION_GROUPS,
  POSITION_GROUP_IDS,
  createPlayerFromForm,
  generateStartingAttributes,
  getBaseAttributes,
  getPositionGroup,
  newGameFormSchema,
  rollStartingAttributes,
  type NewGameFormValues,
} from "./player-creation";
import { createSeededRandom } from "@/lib/random";
import type { PlayerAttributes } from "@/types/game";

const VALID_FORM: NewGameFormValues = {
  firstName: "Sem",
  lastName: "de Vries",
  nationality: "NL",
  position: "attacker",
};

describe("position groups", () => {
  it("offers the four roles the onboarding form asks for", () => {
    expect(POSITION_GROUPS.map((group) => group.label)).toEqual([
      "Keeper",
      "Verdediger",
      "Middenvelder",
      "Aanvaller",
    ]);
  });

  it("maps every group onto a concrete playing position", () => {
    expect(getPositionGroup("keeper").position).toBe("GK");
    expect(getPositionGroup("defender").position).toBe("CB");
    expect(getPositionGroup("midfielder").position).toBe("CM");
    expect(getPositionGroup("attacker").position).toBe("ST");
  });
});

describe("generateStartingAttributes", () => {
  it("mirrors shooting and defending for attackers and defenders", () => {
    const attacker = getBaseAttributes("attacker");
    const defender = getBaseAttributes("defender");

    expect(attacker.shooting).toBe(70);
    expect(attacker.defending).toBe(30);
    expect(defender.shooting).toBe(30);
    expect(defender.defending).toBe(70);
  });

  it("gives every role its own strongest attribute", () => {
    const strongest = (attributes: PlayerAttributes) =>
      (Object.keys(attributes) as (keyof PlayerAttributes)[]).reduce((best, key) =>
        attributes[key] > attributes[best] ? key : best
      );

    expect(strongest(getBaseAttributes("keeper"))).toBe("defending");
    expect(strongest(getBaseAttributes("defender"))).toBe("defending");
    expect(strongest(getBaseAttributes("midfielder"))).toBe("stamina");
    expect(strongest(getBaseAttributes("attacker"))).toBe("shooting");
  });

  it("stays within a few points of the baseline and inside 1-99", () => {
    for (const group of POSITION_GROUP_IDS) {
      const base = getBaseAttributes(group);
      const rolled = generateStartingAttributes(group, createSeededRandom(7));

      for (const key of Object.keys(base) as (keyof PlayerAttributes)[]) {
        expect(Math.abs(rolled[key] - base[key])).toBeLessThanOrEqual(3);
        expect(rolled[key]).toBeGreaterThanOrEqual(1);
        expect(rolled[key]).toBeLessThanOrEqual(99);
      }
    }
  });

  it("is reproducible for the same seed", () => {
    const first = generateStartingAttributes("midfielder", createSeededRandom(99));
    const second = generateStartingAttributes("midfielder", createSeededRandom(99));

    expect(first).toEqual(second);
  });
});

describe("rollStartingAttributes", () => {
  it("returns the same attributes for the same name and position", () => {
    expect(rollStartingAttributes("Sem de Vries", "attacker")).toEqual(
      rollStartingAttributes("Sem de Vries", "attacker")
    );
  });

  it("gives different players a different roll", () => {
    expect(rollStartingAttributes("Sem de Vries", "attacker")).not.toEqual(
      rollStartingAttributes("Luca Rossi", "attacker")
    );
  });

  it("falls back to the baseline without a name", () => {
    expect(rollStartingAttributes("  ", "defender")).toEqual(
      getBaseAttributes("defender")
    );
  });
});

describe("newGameFormSchema", () => {
  it("accepts a fully filled in form", () => {
    expect(newGameFormSchema.safeParse(VALID_FORM).success).toBe(true);
  });

  it("rejects names that are too short", () => {
    const result = newGameFormSchema.safeParse({ ...VALID_FORM, firstName: "S" });
    expect(result.success).toBe(false);
  });

  it("trims surrounding whitespace off the names", () => {
    const result = newGameFormSchema.safeParse({
      ...VALID_FORM,
      firstName: "  Sem  ",
      lastName: "  de Vries ",
    });

    expect(result.success).toBe(true);
    expect(result.data?.firstName).toBe("Sem");
    expect(result.data?.lastName).toBe("de Vries");
  });

  it("rejects a nationality that is not in the dropdown", () => {
    const result = newGameFormSchema.safeParse({ ...VALID_FORM, nationality: "XX" });
    expect(result.success).toBe(false);
  });

  it("accepts every nationality that is in the dropdown", () => {
    for (const nationality of NATIONALITIES) {
      const result = newGameFormSchema.safeParse({
        ...VALID_FORM,
        nationality: nationality.code,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects an unknown position", () => {
    const result = newGameFormSchema.safeParse({ ...VALID_FORM, position: "coach" });
    expect(result.success).toBe(false);
  });
});

describe("createPlayerFromForm", () => {
  it("combines the names and stores the chosen nationality", () => {
    const player = createPlayerFromForm(VALID_FORM, "club-fc-utopia");

    expect(player.name).toBe("Sem de Vries");
    expect(player.nationality).toBe("NL");
    expect(player.clubId).toBe("club-fc-utopia");
  });

  it("derives the attributes from the chosen position", () => {
    const striker = createPlayerFromForm(VALID_FORM, null);
    const defender = createPlayerFromForm(
      { ...VALID_FORM, position: "defender" },
      null
    );

    expect(striker.position).toBe("ST");
    expect(defender.position).toBe("CB");
    expect(striker.attributes.shooting).toBeGreaterThan(
      striker.attributes.defending
    );
    expect(defender.attributes.defending).toBeGreaterThan(
      defender.attributes.shooting
    );
  });

  it("starts every career from the same fresh baseline", () => {
    const player = createPlayerFromForm(VALID_FORM, "club-fc-utopia");

    expect(player.age).toBe(17);
    expect(player.energy).toBe(90);
    expect(player.morale).toBe(70);
    expect(player.marketValue).toBeGreaterThan(0);
    expect(player.weeklySalary).toBeGreaterThan(0);
  });
});
