import { createInitialSeasonStats } from "@/lib/game/season";
import type { Club, GameEvent, GameState, Player } from "@/types/game";

/**
 * Mock club used to seed a new save game.
 */
export function createMockClub(): Club {
  return {
    id: "club-fc-utopia",
    name: "FC Utopia",
    division: "eredivisie",
    reputation: 62,
    trainerRelationship: 55,
  };
}

/**
 * Mock player character used to seed a new save game.
 */
export function createMockPlayer(clubId: string): Player {
  return {
    id: "player-you",
    name: "Sem de Vries",
    age: 19,
    nationality: "NL",
    position: "CAM",
    energy: 92,
    morale: 70,
    attributes: {
      shooting: 58,
      passing: 63,
      defending: 44,
      physical: 52,
      pace: 67,
      technique: 66,
      stamina: 61,
    },
    marketValue: 750_000,
    weeklySalary: 4_500,
    clubId,
  };
}

/**
 * A handful of mock log entries so the timeline isn't empty on first load.
 */
export function createMockEventLog(season: number): GameEvent[] {
  return [
    {
      id: "event-1",
      season,
      week: 1,
      date: "2026-07-01",
      type: "contract",
      title: "Contract getekend",
      description: "Je hebt een nieuw contract getekend bij FC Utopia.",
    },
    {
      id: "event-2",
      season,
      week: 1,
      date: "2026-07-03",
      type: "system",
      title: "Voorbereiding gestart",
      description: "De voorbereiding op het nieuwe seizoen is begonnen.",
    },
  ];
}

/**
 * Builds a brand new, fully populated GameState used as the initial/mock
 * state for the Zustand store.
 */
export function createInitialGameState(): GameState {
  const club = createMockClub();
  const season = 2026;
  const player = createMockPlayer(club.id);

  return {
    currentWeek: 1,
    currentDate: "2026-07-01",
    season,
    actionPoints: 3,
    maxActionPointsPerWeek: 3,
    balance: 42_500,
    player,
    club,
    eventLog: createMockEventLog(season),
    lastMatchReport: null,
    seasonStats: createInitialSeasonStats(player.marketValue),
    pendingSeasonTransition: null,
    activeNegotiation: null,
    careerStarted: false,
  };
}
