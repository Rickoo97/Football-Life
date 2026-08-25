/**
 * Everything the "New Game" onboarding needs: the form contract, the
 * position-driven starting attributes and the resulting `Player`.
 *
 * Kept free of React so both the form and the store can share it and so the
 * attribute generation stays unit-testable.
 */

import { z } from "zod";

import { NATIONALITY_CODES } from "@/data/nationalities";
import { createSeededRandom } from "@/lib/random";
import type { Player, PlayerAttributes, PlayerPosition } from "@/types/game";

/**
 * The four roles a player picks during onboarding. The game itself works with
 * the finer-grained `PlayerPosition`, so each group maps onto one concrete
 * position.
 */
export const POSITION_GROUP_IDS = [
  "keeper",
  "defender",
  "midfielder",
  "attacker",
] as const;

export type PositionGroupId = (typeof POSITION_GROUP_IDS)[number];

export interface PositionGroup {
  id: PositionGroupId;
  label: string;
  /** Short Dutch explanation shown under the dropdown. */
  description: string;
  position: PlayerPosition;
}

export const POSITION_GROUPS: readonly PositionGroup[] = [
  {
    id: "keeper",
    label: "Keeper",
    description: "Laatste man. Sterk in positiespel en reflexen, zelden in de spits.",
    position: "GK",
  },
  {
    id: "defender",
    label: "Verdediger",
    description: "Duelkracht en verdedigend inzicht boven alles.",
    position: "CB",
  },
  {
    id: "midfielder",
    label: "Middenvelder",
    description: "Het hart van het elftal: passing, techniek en een motor.",
    position: "CM",
  },
  {
    id: "attacker",
    label: "Aanvaller",
    description: "Snelheid en een koelbloedige afronding. Verdedigen doen anderen.",
    position: "ST",
  },
] as const;

export function getPositionGroup(id: PositionGroupId): PositionGroup {
  const group = POSITION_GROUPS.find((option) => option.id === id);
  if (!group) {
    throw new Error(`Unknown position group: ${id}`);
  }
  return group;
}

/**
 * Baseline attributes per role. A striker starts at 70 shooting and 30
 * defending, a defender is the mirror image; the rest of the profile follows
 * the same logic so every role plays noticeably differently from week one.
 */
const BASE_ATTRIBUTES: Record<PositionGroupId, PlayerAttributes> = {
  keeper: {
    shooting: 20,
    passing: 45,
    defending: 68,
    physical: 62,
    pace: 42,
    technique: 46,
    stamina: 50,
  },
  defender: {
    shooting: 30,
    passing: 52,
    defending: 70,
    physical: 68,
    pace: 55,
    technique: 48,
    stamina: 62,
  },
  midfielder: {
    shooting: 52,
    passing: 68,
    defending: 55,
    physical: 55,
    pace: 58,
    technique: 66,
    stamina: 70,
  },
  attacker: {
    shooting: 70,
    passing: 52,
    defending: 30,
    physical: 58,
    pace: 68,
    technique: 66,
    stamina: 60,
  },
};

/** How far a generated attribute may drift from its baseline, in points. */
const ATTRIBUTE_VARIANCE = 3;

const ATTRIBUTE_KEYS = [
  "shooting",
  "passing",
  "defending",
  "physical",
  "pace",
  "technique",
  "stamina",
] as const satisfies readonly (keyof PlayerAttributes)[];

function clamp(value: number, min = 1, max = 99): number {
  return Math.min(max, Math.max(min, value));
}

/** Turns a name into a stable seed so the same career always rolls the same talent. */
export function hashSeed(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

/** Baseline attributes for a role, without any randomness. */
export function getBaseAttributes(group: PositionGroupId): PlayerAttributes {
  return { ...BASE_ATTRIBUTES[group] };
}

/**
 * Starting attributes for a role, with a small random drift so two strikers
 * are never quite identical. Pass a seeded `random` for reproducible results.
 */
export function generateStartingAttributes(
  group: PositionGroupId,
  random: () => number = Math.random
): PlayerAttributes {
  const base = getBaseAttributes(group);

  return ATTRIBUTE_KEYS.reduce((attributes, key) => {
    const drift = Math.round((random() * 2 - 1) * ATTRIBUTE_VARIANCE);
    attributes[key] = clamp(base[key] + drift);
    return attributes;
  }, {} as PlayerAttributes);
}

/**
 * The attributes a given name/position combination will actually start with.
 * Seeded by the name, so the onboarding preview matches the created player.
 */
export function rollStartingAttributes(
  name: string,
  group: PositionGroupId
): PlayerAttributes {
  const trimmed = name.trim();
  if (!trimmed) {
    return getBaseAttributes(group);
  }
  return generateStartingAttributes(
    group,
    createSeededRandom(hashSeed(`${trimmed}:${group}`))
  );
}

export const newGameFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "Vul een voornaam van minimaal 2 tekens in.")
    .max(24, "Dat is wel een erg lange voornaam."),
  lastName: z
    .string()
    .trim()
    .min(2, "Vul een achternaam van minimaal 2 tekens in.")
    .max(32, "Dat is wel een erg lange achternaam."),
  nationality: z
    .string()
    .refine((code) => NATIONALITY_CODES.includes(code), {
      message: "Kies je nationaliteit.",
    }),
  position: z.enum([...POSITION_GROUP_IDS] as [PositionGroupId, ...PositionGroupId[]], {
    errorMap: () => ({ message: "Kies je positie op het veld." }),
  }),
});

export type NewGameFormValues = z.infer<typeof newGameFormSchema>;

/** Age every career starts at: a debutant knocking on the first team's door. */
export const STARTING_AGE = 17;
const STARTING_MARKET_VALUE = 250_000;
const STARTING_WEEKLY_SALARY = 2_000;

/**
 * Builds the player character from the onboarding form. Attributes are derived
 * from the chosen position and seeded with the player's name, so the same
 * input always produces the same starting talent.
 */
export function createPlayerFromForm(
  values: NewGameFormValues,
  clubId: string | null
): Player {
  const firstName = values.firstName.trim();
  const lastName = values.lastName.trim();
  const name = `${firstName} ${lastName}`;
  const group = getPositionGroup(values.position);

  return {
    id: "player-you",
    name,
    age: STARTING_AGE,
    nationality: values.nationality,
    position: group.position,
    energy: 90,
    morale: 70,
    attributes: rollStartingAttributes(name, values.position),
    marketValue: STARTING_MARKET_VALUE,
    weeklySalary: STARTING_WEEKLY_SALARY,
    clubId,
  };
}
