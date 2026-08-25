import { describe, expect, it } from "vitest";

import { mergePersistedGameState } from "./persistence";
import { createInitialGameState } from "@/lib/mock-data";
import type { GameState } from "@/types/game";

function isFiniteNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

describe("mergePersistedGameState", () => {
  it("returns the current state when there is nothing persisted", () => {
    const current = createInitialGameState();

    expect(mergePersistedGameState(null, current)).toBe(current);
    expect(mergePersistedGameState(undefined, current)).toBe(current);
  });

  it("keeps the values from the persisted save", () => {
    const current = createInitialGameState();
    const saved: GameState = {
      ...createInitialGameState(),
      currentWeek: 12,
      balance: 99_000,
    };

    const merged = mergePersistedGameState(saved, current);

    expect(merged.currentWeek).toBe(12);
    expect(merged.balance).toBe(99_000);
  });

  it("fills in attributes that older saves did not have", () => {
    const current = createInitialGameState();
    const legacySave = {
      currentWeek: 4,
      currentDate: "2026-07-22",
      season: 2026,
      actionPoints: 2,
      maxActionPointsPerWeek: 3,
      player: {
        id: "player-you",
        name: "Sem de Vries",
        age: 19,
        position: "CAM",
        energy: 80,
        morale: 65,
        attributes: {
          shooting: 58,
          passing: 63,
          physical: 52,
          pace: 67,
        },
        marketValue: 750_000,
        weeklySalary: 4_500,
        clubId: "club-fc-utopia",
      },
      club: {
        id: "club-fc-utopia",
        name: "FC Utopia",
        division: "eredivisie",
        reputation: 62,
        trainerRelationship: 55,
      },
      eventLog: [],
    };

    const merged = mergePersistedGameState(legacySave, current);

    expect(merged.currentWeek).toBe(4);
    expect(merged.player.energy).toBe(80);
    expect(isFiniteNumber(merged.player.attributes.technique)).toBe(true);
    expect(isFiniteNumber(merged.player.attributes.stamina)).toBe(true);
    expect(isFiniteNumber(merged.balance)).toBe(true);
    expect(merged.lastMatchReport).toBeNull();

    Object.values(merged.player.attributes).forEach((value) => {
      expect(isFiniteNumber(value)).toBe(true);
    });
  });

  it("repairs a save that is missing whole sections", () => {
    const current = createInitialGameState();
    const merged = mergePersistedGameState({ currentWeek: 7 }, current);

    expect(merged.currentWeek).toBe(7);
    expect(merged.player.name).toBe(current.player.name);
    expect(merged.club.name).toBe(current.club.name);
    expect(Array.isArray(merged.eventLog)).toBe(true);
    expect(isFiniteNumber(merged.player.morale)).toBe(true);
  });
});
