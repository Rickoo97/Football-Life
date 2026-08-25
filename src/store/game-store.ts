import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

import { simulateMatch, type MatchReport } from "@/lib/engine/matchEngine";
import { createFixture } from "@/lib/game/fixtures";
import { mergePersistedGameState } from "@/lib/game/persistence";
import {
  getWeeklyAction,
  resolveWeeklyAction,
  type WeeklyActionId,
  type WeeklyActionResult,
} from "@/lib/game/weekly-actions";
import { createInitialGameState } from "@/lib/mock-data";
import type { Club, GameEvent, GameState, Player } from "@/types/game";

const WEEKS_PER_SEASON = 38;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const WEEKLY_ENERGY_RECOVERY = 12;

function addWeeks(isoDate: string, weeks: number): string {
  const date = new Date(isoDate);
  return new Date(date.getTime() + weeks * MS_PER_WEEK).toISOString().slice(0, 10);
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function createEvent(
  state: GameState,
  event: Omit<GameEvent, "id" | "week" | "season" | "date"> &
    Partial<Pick<GameEvent, "id" | "week" | "season" | "date">>
): GameEvent {
  return {
    id: event.id ?? crypto.randomUUID(),
    week: event.week ?? state.currentWeek,
    season: event.season ?? state.season,
    date: event.date ?? state.currentDate,
    type: event.type,
    title: event.title,
    description: event.description,
  };
}

export interface GameActions {
  /** Spends `amount` action points if enough are available. Returns whether it succeeded. */
  spendActionPoints: (amount: number) => boolean;
  /**
   * Performs one of the weekly activities. Returns the applied effects, or
   * `null` when the player lacks action points or money.
   */
  performWeeklyAction: (actionId: WeeklyActionId) => WeeklyActionResult | null;
  /**
   * Ends the current week: simulates this week's match, applies the outcome to
   * the player, pays the weekly salary and moves the calendar forward.
   */
  playNextWeek: () => MatchReport;
  /** Merges `updates` into the current player. */
  updatePlayer: (updates: Partial<Player>) => void;
  /** Merges `updates` into the current player's attributes. */
  updatePlayerAttributes: (updates: Partial<Player["attributes"]>) => void;
  /** Merges `updates` into the current club. */
  updateClub: (updates: Partial<Club>) => void;
  /** Appends a new entry to the event log, auto-filling id/week/season/date when omitted. */
  logEvent: (
    event: Omit<GameEvent, "id" | "week" | "season" | "date"> &
      Partial<Pick<GameEvent, "id" | "week" | "season" | "date">>
  ) => void;
  /** Clears the stored match report, e.g. after closing the result dialog. */
  dismissMatchReport: () => void;
  /** Resets the whole save back to the initial mock state. */
  resetGame: () => void;
}

export type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...createInitialGameState(),

        spendActionPoints: (amount) => {
          const { actionPoints } = get();
          if (amount <= 0 || actionPoints < amount) {
            return false;
          }
          set((state) => ({ actionPoints: state.actionPoints - amount }));
          return true;
        },

        performWeeklyAction: (actionId) => {
          const state = get();
          const action = getWeeklyAction(actionId);

          if (
            state.actionPoints < action.actionPointCost ||
            state.balance < action.moneyCost
          ) {
            return null;
          }

          const result = resolveWeeklyAction(actionId, state.player);
          const attributes = { ...state.player.attributes };

          for (const [key, delta] of Object.entries(result.attributeDeltas)) {
            const attributeKey = key as keyof typeof attributes;
            attributes[attributeKey] = clamp(
              attributes[attributeKey] + (delta ?? 0)
            );
          }

          set((current) => ({
            actionPoints: current.actionPoints - action.actionPointCost,
            balance: current.balance - result.moneyCost,
            player: {
              ...current.player,
              attributes,
              energy: clamp(current.player.energy + result.energyDelta),
              morale: clamp(current.player.morale + result.moraleDelta),
              marketValue: Math.max(
                0,
                current.player.marketValue + result.marketValueDelta
              ),
            },
            club: {
              ...current.club,
              trainerRelationship: clamp(
                current.club.trainerRelationship + result.trainerRelationshipDelta
              ),
            },
            eventLog: [
              ...current.eventLog,
              createEvent(current, {
                type: action.eventType,
                title: action.label,
                description: result.summary,
              }),
            ],
          }));

          return result;
        },

        playNextWeek: () => {
          const state = get();
          const fixture = createFixture(state.club, state.season, state.currentWeek);

          const report = simulateMatch(
            fixture.homeTeam,
            fixture.awayTeam,
            {
              name: state.player.name,
              side: fixture.playerSide,
              position: state.player.position,
              attributes: state.player.attributes,
              morale: state.player.morale,
              energy: state.player.energy,
            },
            { seed: fixture.seed }
          );

          const playerGoals =
            fixture.playerSide === "home" ? report.score.home : report.score.away;
          const opponentGoals =
            fixture.playerSide === "home" ? report.score.away : report.score.home;
          const resultMoraleBonus =
            playerGoals > opponentGoals ? 5 : playerGoals < opponentGoals ? -4 : 0;

          const ratingDelta = report.player.matchRating - 6.5;
          const marketValueMultiplier =
            report.player.matchRating >= 7.5
              ? 1.03
              : report.player.matchRating <= 5.5
                ? 0.98
                : 1;

          const nextWeekNumber = state.currentWeek + 1;
          const seasonRolledOver = nextWeekNumber > WEEKS_PER_SEASON;
          const opponentName =
            fixture.playerSide === "home" ? report.awayTeam : report.homeTeam;

          set((current) => ({
            currentWeek: seasonRolledOver ? 1 : nextWeekNumber,
            season: seasonRolledOver ? current.season + 1 : current.season,
            currentDate: addWeeks(current.currentDate, 1),
            actionPoints: current.maxActionPointsPerWeek,
            balance: current.balance + current.player.weeklySalary,
            lastMatchReport: report,
            player: {
              ...current.player,
              energy: clamp(
                report.player.endingEnergy + WEEKLY_ENERGY_RECOVERY
              ),
              morale: clamp(
                current.player.morale + ratingDelta * 3 + resultMoraleBonus
              ),
              marketValue: Math.round(
                current.player.marketValue * marketValueMultiplier
              ),
            },
            club: {
              ...current.club,
              trainerRelationship: clamp(
                current.club.trainerRelationship + ratingDelta * 2
              ),
            },
            eventLog: [
              ...current.eventLog,
              createEvent(current, {
                type: "match",
                title: `${report.homeTeam} ${report.score.home}-${report.score.away} ${report.awayTeam}`,
                description: `Tegen ${opponentName}: cijfer ${report.player.matchRating}, ${report.player.goals} goal(s) en ${report.player.assists} assist(s).`,
              }),
            ],
          }));

          return report;
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
            eventLog: [...state.eventLog, createEvent(state, event)],
          })),

        dismissMatchReport: () => set({ lastMatchReport: null }),

        resetGame: () => set(createInitialGameState()),
      }),
      {
        name: "football-life-sim-save",
        // The dashboard rehydrates manually after mount so the server-rendered
        // markup and the first client render always match.
        skipHydration: true,
        merge: mergePersistedGameState,
      }
    ),
    { name: "football-life-sim" }
  )
);
