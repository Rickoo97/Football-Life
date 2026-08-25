import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

import { simulateMatch, type MatchReport } from "@/lib/engine/matchEngine";
import { MS_PER_WEEK, WEEKS_PER_SEASON } from "@/lib/game/constants";
import { createFixture } from "@/lib/game/fixtures";
import {
  acceptNegotiationSession,
  applyAcceptedNegotiation,
  createNegotiationSession,
  evaluateCounterOffer,
  getCurrentClubOffer,
  walkAwayFromNegotiation as walkAwayFromNegotiationSession,
} from "@/lib/game/negotiation";
import { mergePersistedGameState } from "@/lib/game/persistence";
import {
  createPlayerFromForm,
  type NewGameFormValues,
} from "@/lib/game/player-creation";
import {
  deleteSaveSlot,
  exportGameStateToJson,
  importGameStateFromJson,
  listSaveSlots,
  readSaveSlot,
  writeSaveSlot,
} from "@/lib/game/save-slots";
import {
  applySeasonTransitionChoice,
  createInitialSeasonStats,
  createSeasonTransition,
  recordMatchInSeasonStats,
} from "@/lib/game/season";
import { pickInterestedClub } from "@/lib/game/transfer-market";
import {
  getWeeklyAction,
  resolveWeeklyAction,
  type WeeklyActionId,
  type WeeklyActionResult,
} from "@/lib/game/weekly-actions";
import { createInitialGameState } from "@/lib/mock-data";
import type { Club, GameEvent, GameState, Player } from "@/types/game";
import type { ContractTerms, NegotiatingClub } from "@/types/negotiation";
import type { SaveSlotMetadata } from "@/types/save";
import type { SeasonTransitionChoice } from "@/types/season";

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

/** Strips the action functions off the store so only plain data gets saved/exported. */
function toPlainGameState(store: GameState): GameState {
  return {
    currentWeek: store.currentWeek,
    currentDate: store.currentDate,
    season: store.season,
    actionPoints: store.actionPoints,
    maxActionPointsPerWeek: store.maxActionPointsPerWeek,
    balance: store.balance,
    player: store.player,
    club: store.club,
    eventLog: store.eventLog,
    lastMatchReport: store.lastMatchReport,
    seasonStats: store.seasonStats,
    pendingSeasonTransition: store.pendingSeasonTransition,
    activeNegotiation: store.activeNegotiation,
    careerStarted: store.careerStarted,
  };
}

export interface GameActions {
  /**
   * Starts a brand new career from the onboarding form: wipes any existing
   * save state and seeds the player with position-based starting attributes.
   */
  createCareer: (values: NewGameFormValues) => void;
  /** Spends `amount` action points if enough are available. Returns whether it succeeded. */
  spendActionPoints: (amount: number) => boolean;
  /**
   * Performs one of the weekly activities. Returns the applied effects, or
   * `null` when the player lacks action points or money.
   */
  performWeeklyAction: (actionId: WeeklyActionId) => WeeklyActionResult | null;
  /**
   * Ends the current week: simulates this week's match, applies the outcome to
   * the player, pays the weekly salary and moves the calendar forward. After
   * week 38 this also populates `pendingSeasonTransition` with a contract
   * evaluation and any transfer offers.
   */
  playNextWeek: () => MatchReport;
  /** Applies the player's contract/transfer decision and clears the pending transition. */
  resolveSeasonTransition: (choice: SeasonTransitionChoice) => void;
  /** Opens a contract negotiation with the given club, replacing any active one. */
  startNegotiation: (club: NegotiatingClub) => void;
  /**
   * Scouts a plausible interested club from the leagues database and opens a
   * negotiation with it. Returns whether a suitable club was found.
   */
  startRandomNegotiation: () => boolean;
  /** Submits the player's counter-offer and applies the club's response. */
  submitCounterOffer: (terms: ContractTerms) => void;
  /** Accepts the club's current offer: the player transfers there immediately. */
  acceptNegotiation: () => void;
  /** Ends the negotiation without a deal. */
  walkAwayFromNegotiation: () => void;
  /** Clears a finished negotiation (accepted or walked away) after the player closes the modal. */
  dismissNegotiation: () => void;
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
  /** Writes the current state to a named save slot (creates a new one if `slotId` is omitted). */
  saveToSlot: (label: string, slotId?: string) => SaveSlotMetadata | null;
  /** Loads a save slot into the store. Returns whether it succeeded. */
  loadFromSlot: (slotId: string) => boolean;
  /** Permanently removes a save slot. */
  deleteSlot: (slotId: string) => void;
  /** Lists every save slot, most recently saved first. */
  listSlots: () => SaveSlotMetadata[];
  /** Serializes the current state to a JSON string for download. */
  exportSave: () => string;
  /** Parses and loads a previously exported JSON save. Returns whether it succeeded. */
  importSave: (json: string) => boolean;
}

export type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...createInitialGameState(),

        createCareer: (values) => {
          const initial = createInitialGameState();
          const player = createPlayerFromForm(values, initial.club.id);

          set({
            ...initial,
            player,
            careerStarted: true,
            seasonStats: createInitialSeasonStats(player.marketValue),
            eventLog: [
              {
                id: crypto.randomUUID(),
                season: initial.season,
                week: initial.currentWeek,
                date: initial.currentDate,
                type: "contract",
                title: "Carrière gestart",
                description: `${player.name} tekent zijn eerste contract bij ${initial.club.name}.`,
              },
            ],
          });
        },

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

          set((current) => {
            const updatedPlayer: Player = {
              ...current.player,
              energy: clamp(report.player.endingEnergy + WEEKLY_ENERGY_RECOVERY),
              morale: clamp(
                current.player.morale + ratingDelta * 3 + resultMoraleBonus
              ),
              marketValue: Math.round(
                current.player.marketValue * marketValueMultiplier
              ),
            };

            const updatedClub: Club = {
              ...current.club,
              trainerRelationship: clamp(
                current.club.trainerRelationship + ratingDelta * 2
              ),
            };

            const updatedSeasonStats = recordMatchInSeasonStats(current.seasonStats, {
              goals: report.player.goals,
              assists: report.player.assists,
              matchRating: report.player.matchRating,
            });

            const matchLogEntry = createEvent(current, {
              type: "match",
              title: `${report.homeTeam} ${report.score.home}-${report.score.away} ${report.awayTeam}`,
              description: `Tegen ${opponentName}: cijfer ${report.player.matchRating}, ${report.player.goals} goal(s) en ${report.player.assists} assist(s).`,
            });

            let pendingSeasonTransition = current.pendingSeasonTransition;
            let seasonStats = updatedSeasonStats;

            if (seasonRolledOver) {
              pendingSeasonTransition = createSeasonTransition({
                ...current,
                player: updatedPlayer,
                club: updatedClub,
                seasonStats: updatedSeasonStats,
              });
              seasonStats = createInitialSeasonStats(updatedPlayer.marketValue);
            }

            return {
              currentWeek: seasonRolledOver ? 1 : nextWeekNumber,
              season: seasonRolledOver ? current.season + 1 : current.season,
              currentDate: addWeeks(current.currentDate, 1),
              actionPoints: current.maxActionPointsPerWeek,
              balance: current.balance + current.player.weeklySalary,
              lastMatchReport: report,
              player: updatedPlayer,
              club: updatedClub,
              seasonStats,
              pendingSeasonTransition,
              eventLog: [...current.eventLog, matchLogEntry],
            };
          });

          return report;
        },

        resolveSeasonTransition: (choice) =>
          set((current) => {
            if (!current.pendingSeasonTransition) {
              return current;
            }

            const { player, club, logEntry } = applySeasonTransitionChoice(
              current.player,
              current.club,
              current.pendingSeasonTransition,
              choice
            );

            return {
              player,
              club,
              pendingSeasonTransition: null,
              eventLog: [...current.eventLog, createEvent(current, logEntry)],
            };
          }),

        startNegotiation: (club) =>
          set((current) => ({
            activeNegotiation: createNegotiationSession(club, current.player),
          })),

        startRandomNegotiation: () => {
          const state = get();
          const club = pickInterestedClub(state.player, state.club.id);
          if (!club) {
            return false;
          }
          set({ activeNegotiation: createNegotiationSession(club, state.player) });
          return true;
        },

        submitCounterOffer: (terms) =>
          set((current) => {
            if (!current.activeNegotiation) {
              return current;
            }
            return {
              activeNegotiation: evaluateCounterOffer(
                current.activeNegotiation,
                current.player,
                terms
              ),
            };
          }),

        acceptNegotiation: () =>
          set((current) => {
            if (!current.activeNegotiation) {
              return current;
            }

            const accepted = acceptNegotiationSession(current.activeNegotiation);
            const { player, club, logEntry } = applyAcceptedNegotiation(
              current.player,
              accepted
            );
            const terms = getCurrentClubOffer(accepted);

            return {
              player,
              club,
              balance: current.balance + terms.signingBonus,
              activeNegotiation: accepted,
              eventLog: [...current.eventLog, createEvent(current, logEntry)],
            };
          }),

        walkAwayFromNegotiation: () =>
          set((current) => {
            if (!current.activeNegotiation) {
              return current;
            }
            return {
              activeNegotiation: walkAwayFromNegotiationSession(
                current.activeNegotiation
              ),
            };
          }),

        dismissNegotiation: () => set({ activeNegotiation: null }),

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

        saveToSlot: (label, slotId) =>
          writeSaveSlot(toPlainGameState(get()), label, { id: slotId }),

        loadFromSlot: (slotId) => {
          const loaded = readSaveSlot(slotId);
          if (!loaded) {
            return false;
          }
          set(loaded);
          return true;
        },

        deleteSlot: (slotId) => deleteSaveSlot(slotId),

        listSlots: () => listSaveSlots(),

        exportSave: () => {
          const state = get();
          return exportGameStateToJson(
            toPlainGameState(state),
            `${state.player.name} - week ${state.currentWeek}, seizoen ${state.season}`
          );
        },

        importSave: (json) => {
          try {
            const imported = importGameStateFromJson(json);
            set(imported);
            return true;
          } catch {
            return false;
          }
        },
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
