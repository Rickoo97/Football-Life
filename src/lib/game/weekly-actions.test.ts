import { describe, expect, it } from "vitest";

import {
  WEEKLY_ACTIONS,
  getWeeklyAction,
  resolveWeeklyAction,
  type WeeklyActionId,
} from "./weekly-actions";
import type { Player } from "@/types/game";

const PLAYER: Player = {
  id: "player-test",
  name: "Test Speler",
  age: 21,
  position: "ST",
  energy: 80,
  morale: 60,
  attributes: {
    shooting: 70,
    passing: 60,
    physical: 65,
    pace: 72,
    technique: 68,
    stamina: 64,
  },
  marketValue: 1_000_000,
  weeklySalary: 5_000,
  clubId: "club-test",
};

describe("weekly actions", () => {
  it("exposes the five weekly activities the dashboard offers", () => {
    expect(WEEKLY_ACTIONS.map((action) => action.id)).toEqual([
      "training",
      "rest",
      "gym",
      "nightclub",
      "agent",
    ]);
  });

  it("resolves every action into a valid effect set", () => {
    WEEKLY_ACTIONS.forEach((action) => {
      const result = resolveWeeklyAction(action.id, PLAYER);

      expect(result.moneyCost).toBe(action.moneyCost);
      expect(result.summary.length).toBeGreaterThan(0);
      expect(Number.isFinite(result.energyDelta)).toBe(true);
      expect(Number.isFinite(result.moraleDelta)).toBe(true);
    });
  });

  it("makes resting restore energy and training cost energy", () => {
    const rest = resolveWeeklyAction("rest", PLAYER);
    const training = resolveWeeklyAction("training", PLAYER);

    expect(rest.energyDelta).toBeGreaterThan(0);
    expect(training.energyDelta).toBeLessThan(0);
  });

  it("trades morale for energy and coach goodwill at the nightclub", () => {
    const result = resolveWeeklyAction("nightclub", PLAYER);

    expect(result.moraleDelta).toBeGreaterThan(0);
    expect(result.energyDelta).toBeLessThan(0);
    expect(result.trainerRelationshipDelta).toBeLessThan(0);
  });

  it("raises market value when talking to the agent", () => {
    const result = resolveWeeklyAction("agent", PLAYER);

    expect(result.marketValueDelta).toBeGreaterThan(0);
    expect(result.moneyCost).toBeGreaterThan(0);
  });

  it("improves physical attributes in the gym", () => {
    const result = resolveWeeklyAction("gym", PLAYER);

    expect(result.attributeDeltas.physical).toBeGreaterThan(0);
    expect(result.attributeDeltas.stamina).toBeGreaterThan(0);
  });

  it("focuses training on position specific attributes", () => {
    const striker = resolveWeeklyAction("training", PLAYER);
    const defender = resolveWeeklyAction("training", {
      ...PLAYER,
      position: "CB",
    });

    expect(striker.attributeDeltas.shooting).toBeGreaterThan(0);
    expect(defender.attributeDeltas.shooting).toBeUndefined();
    expect(defender.attributeDeltas.physical).toBeGreaterThan(0);
  });

  it("throws on an unknown action id", () => {
    expect(() => getWeeklyAction("dancing" as WeeklyActionId)).toThrow();
  });
});
