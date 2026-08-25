/**
 * Core data structures for the Football Life Sim.
 *
 * These types describe the player character, the club they play for,
 * and the overall game state (calendar, action points, event log).
 */

import type { MatchReport } from "@/lib/engine/matchEngine";
import type { SeasonStats, SeasonTransition } from "@/types/season";

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

/** Playing positions a player can be assigned to. */
export type PlayerPosition =
  | "GK"
  | "CB"
  | "LB"
  | "RB"
  | "CDM"
  | "CM"
  | "CAM"
  | "LM"
  | "RM"
  | "LW"
  | "RW"
  | "CF"
  | "ST";

/**
 * Core skill attributes for a player, each on a 0-100 scale.
 */
export interface PlayerAttributes {
  /** Shooting/finishing ability. */
  shooting: number;
  /** Passing and vision. */
  passing: number;
  /** Strength and physical duels. */
  physical: number;
  /** Sprint speed / acceleration ("tempo"). */
  pace: number;
  /** Ball control, dribbling and first touch ("techniek"). */
  technique: number;
  /** Endurance, determines how well energy holds up over 90 minutes. */
  stamina: number;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  position: PlayerPosition;
  /** Current energy/stamina level (0-100). Depletes with matches & training. */
  energy: number;
  /** Current morale/mental state (0-100). Affected by results, playtime, media. */
  morale: number;
  attributes: PlayerAttributes;
  /** Estimated market value in euros. */
  marketValue: number;
  /** Weekly salary in euros. */
  weeklySalary: number;
  /** Id of the club the player currently plays for, if any. */
  clubId: string | null;
}

// ---------------------------------------------------------------------------
// Club
// ---------------------------------------------------------------------------

/** League tier / division the club currently competes in. */
export type Division =
  | "eredivisie"
  | "eerste_divisie"
  | "premier_league"
  | "championship"
  | "la_liga"
  | "serie_a"
  | "bundesliga"
  | "ligue_1";

export interface Club {
  id: string;
  name: string;
  division: Division;
  /** Club prestige/reputation (0-100). Impacts transfer offers & expectations. */
  reputation: number;
  /**
   * Quality of the relationship between the player and the head coach
   * (0-100). Influences playing time, squad role and contract talks.
   */
  trainerRelationship: number;
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

/** Category of a logged game event, used for icons/styling in the UI. */
export type GameEventType =
  | "match"
  | "training"
  | "injury"
  | "transfer"
  | "media"
  | "contract"
  | "system";

/** A single entry in the chronological game log. */
export interface GameEvent {
  id: string;
  /** Season the event occurred in, e.g. 2026 for the 2026/2027 season. */
  season: number;
  /** In-game week number the event occurred in. */
  week: number;
  /** ISO-8601 date string of the event. */
  date: string;
  type: GameEventType;
  title: string;
  description: string;
}

/**
 * Global state of the current save game.
 */
export interface GameState {
  /** Current in-game week number, starting at 1 for each season. */
  currentWeek: number;
  /** ISO-8601 date string representing the current in-game date. */
  currentDate: string;
  /** Current season, represented by its starting year (e.g. 2026 => 2026/2027). */
  season: number;
  /** Action points remaining for the current week. */
  actionPoints: number;
  /** Action points the player is granted at the start of every week. */
  maxActionPointsPerWeek: number;
  /** Personal bank balance in euros. */
  balance: number;
  /** The player character controlled by the user. */
  player: Player;
  /** The club the player currently belongs to. */
  club: Club;
  /** Chronological log of everything that has happened in the save. */
  eventLog: GameEvent[];
  /** Report of the most recently played match, if any. */
  lastMatchReport: MatchReport | null;
  /** Accumulated performance for the season currently in progress. */
  seasonStats: SeasonStats;
  /**
   * Set once a season ends, until the player resolves the contract/transfer
   * decision. `null` outside of that offseason window.
   */
  pendingSeasonTransition: SeasonTransition | null;
}
