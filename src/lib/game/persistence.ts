import { sanitizeNegotiationSession } from "@/lib/game/negotiation";
import { sanitizeSeasonTransition } from "@/lib/game/season";
import { createInitialGameState } from "@/lib/mock-data";
import type { GameState, Player, PlayerAttributes } from "@/types/game";
import type { SeasonStats } from "@/types/season";

/**
 * Saves written by older builds can miss fields that were added later, and a
 * save that once stored a `NaN` comes back as `null` because that is what JSON
 * turns it into. Both cases would poison every later calculation, so persisted
 * numbers are only trusted when they are actually finite.
 */
function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function mergeAttributes(
  saved: Partial<PlayerAttributes> | undefined,
  defaults: PlayerAttributes
): PlayerAttributes {
  return {
    shooting: numberOr(saved?.shooting, defaults.shooting),
    passing: numberOr(saved?.passing, defaults.passing),
    defending: numberOr(saved?.defending, defaults.defending),
    physical: numberOr(saved?.physical, defaults.physical),
    pace: numberOr(saved?.pace, defaults.pace),
    technique: numberOr(saved?.technique, defaults.technique),
    stamina: numberOr(saved?.stamina, defaults.stamina),
  };
}

function mergeSeasonStats(
  saved: Partial<SeasonStats> | undefined,
  defaults: SeasonStats
): SeasonStats {
  return {
    matchesPlayed: numberOr(saved?.matchesPlayed, defaults.matchesPlayed),
    goals: numberOr(saved?.goals, defaults.goals),
    assists: numberOr(saved?.assists, defaults.assists),
    ratingSum: numberOr(saved?.ratingSum, defaults.ratingSum),
    startingMarketValue: numberOr(
      saved?.startingMarketValue,
      defaults.startingMarketValue
    ),
  };
}

function mergePlayer(saved: Partial<Player> | undefined, defaults: Player): Player {
  return {
    ...defaults,
    ...saved,
    age: numberOr(saved?.age, defaults.age),
    energy: numberOr(saved?.energy, defaults.energy),
    morale: numberOr(saved?.morale, defaults.morale),
    marketValue: numberOr(saved?.marketValue, defaults.marketValue),
    weeklySalary: numberOr(saved?.weeklySalary, defaults.weeklySalary),
    attributes: mergeAttributes(saved?.attributes, defaults.attributes),
  };
}

/**
 * Merges a persisted save with the current defaults so an outdated or
 * corrupted save still loads into a fully valid game state.
 */
export function mergePersistedGameState<T extends GameState>(
  persistedState: unknown,
  currentState: T
): T {
  if (!persistedState || typeof persistedState !== "object") {
    return currentState;
  }

  const saved = persistedState as Partial<GameState>;
  const defaults = createInitialGameState();

  return {
    ...currentState,
    ...saved,
    currentWeek: numberOr(saved.currentWeek, defaults.currentWeek),
    currentDate: saved.currentDate ?? defaults.currentDate,
    season: numberOr(saved.season, defaults.season),
    actionPoints: numberOr(saved.actionPoints, defaults.actionPoints),
    maxActionPointsPerWeek: numberOr(
      saved.maxActionPointsPerWeek,
      defaults.maxActionPointsPerWeek
    ),
    balance: numberOr(saved.balance, defaults.balance),
    lastMatchReport: saved.lastMatchReport ?? null,
    careerStarted: saved.careerStarted === true,
    eventLog: Array.isArray(saved.eventLog) ? saved.eventLog : defaults.eventLog,
    seasonStats: mergeSeasonStats(saved.seasonStats, defaults.seasonStats),
    pendingSeasonTransition: saved.pendingSeasonTransition
      ? sanitizeSeasonTransition(saved.pendingSeasonTransition)
      : null,
    activeNegotiation: saved.activeNegotiation
      ? sanitizeNegotiationSession(saved.activeNegotiation)
      : null,
    player: mergePlayer(saved.player, defaults.player),
    club: {
      ...defaults.club,
      ...saved.club,
      reputation: numberOr(saved.club?.reputation, defaults.club.reputation),
      trainerRelationship: numberOr(
        saved.club?.trainerRelationship,
        defaults.club.trainerRelationship
      ),
    },
  };
}
