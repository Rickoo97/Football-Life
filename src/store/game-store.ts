import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

import { createInitialGameState } from "@/lib/mock-data";
import type { Club, GameEvent, GameState, Player } from "@/types/game";

const WEEKS_PER_SEASON = 38;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function addWeeks(isoDate: string, weeks: number): string {
  const date = new Date(isoDate);
  return new Date(date.getTime() + weeks * MS_PER_WEEK).toISOString().slice(0, 10);
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export interface GameActions {
  /** Advances the calendar by one week, refills action points and logs it. */
  advanceWeek: () => void;
  /** Spends `amount` action points if enough are available. Returns whether it succeeded. */
  spendActionPoints: (amount: number) => boolean;
  /** Merges `updates` into the current player. */
  updatePlayer: (updates: Partial<Player>) => void;
  /** Merges `updates` into the current player's attributes. */
  updatePlayerAttributes: (
    updates: Partial<Player["attributes"]>
  ) => void;
  /** Merges `updates` into the current club. */
  updateClub: (updates: Partial<Club>) => void;
  /** Appends a new entry to the event log, auto-filling id/week/season/date when omitted. */
  logEvent: (
    event: Omit<GameEvent, "id" | "week" | "season" | "date"> &
      Partial<Pick<GameEvent, "id" | "week" | "season" | "date">>
  ) => void;
  /** Resets the whole save back to the initial mock state. */
  resetGame: () => void;
}

export type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...createInitialGameState(),

        advanceWeek: () =>
          set((state) => {
            const nextWeekNumber = state.currentWeek + 1;
            const seasonRolledOver = nextWeekNumber > WEEKS_PER_SEASON;
            const currentWeek = seasonRolledOver ? 1 : nextWeekNumber;
            const season = seasonRolledOver ? state.season + 1 : state.season;

            return {
              currentWeek,
              season,
              currentDate: addWeeks(state.currentDate, 1),
              actionPoints: state.maxActionPointsPerWeek,
              player: {
                ...state.player,
                energy: clamp(state.player.energy + 10),
              },
            };
          }),

        spendActionPoints: (amount) => {
          const { actionPoints } = get();
          if (amount <= 0 || actionPoints < amount) {
            return false;
          }
          set((state) => ({ actionPoints: state.actionPoints - amount }));
          return true;
        },

        updatePlayer: (updates) =>
          set((state) => ({ player: { ...state.player, ...updates } })),

        updatePlayerAttributes: (updates) =>
          set((state) => ({
            player: {
              ...state.player,
              attributes: { ...state.player.attributes, ...updates },
            },
          })),

        updateClub: (updates) =>
          set((state) => ({ club: { ...state.club, ...updates } })),

        logEvent: (event) =>
          set((state) => ({
            eventLog: [
              ...state.eventLog,
              {
                id: event.id ?? crypto.randomUUID(),
                week: event.week ?? state.currentWeek,
                season: event.season ?? state.season,
                date: event.date ?? state.currentDate,
                type: event.type,
                title: event.title,
                description: event.description,
              },
            ],
          })),

        resetGame: () => set(createInitialGameState()),
      }),
      {
        name: "football-life-sim-save",
      }
    ),
    { name: "football-life-sim" }
  )
);
