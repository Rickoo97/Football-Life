import { createInitialGameState } from "@/lib/mock-data";
import type { GameState } from "@/types/game";

/**
 * Merges a persisted save with the current defaults.
 *
 * Saves written by older builds can miss fields that were added later (for
 * example new attributes). A shallow merge would leave those `undefined` and
 * every calculation touching them would produce `NaN`, so nested objects are
 * merged against a fresh state instead.
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
    currentWeek: saved.currentWeek ?? defaults.currentWeek,
    currentDate: saved.currentDate ?? defaults.currentDate,
    season: saved.season ?? defaults.season,
    actionPoints: saved.actionPoints ?? defaults.actionPoints,
    maxActionPointsPerWeek:
      saved.maxActionPointsPerWeek ?? defaults.maxActionPointsPerWeek,
    balance: saved.balance ?? defaults.balance,
    lastMatchReport: saved.lastMatchReport ?? null,
    eventLog: saved.eventLog ?? defaults.eventLog,
    player: {
      ...defaults.player,
      ...saved.player,
      attributes: {
        ...defaults.player.attributes,
        ...saved.player?.attributes,
      },
    },
    club: {
      ...defaults.club,
      ...saved.club,
    },
  };
}
