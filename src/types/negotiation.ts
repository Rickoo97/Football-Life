/**
 * Types for the contract negotiation mini-game: an interested foreign club
 * makes an opening bid through the player's agent, the player counters, and
 * the club's patience determines whether the deal survives.
 */

import type { Division } from "@/types/game";

/** The concrete terms on the table at any point in a negotiation. */
export interface ContractTerms {
  weeklySalary: number;
  contractDurationYears: number;
  signingBonus: number;
  /** Bonus paid out per goal scored while under this contract. */
  goalBonus: number;
}

/**
 * The club side of a negotiation. Deliberately a subset of `LeagueClub` (see
 * `src/types/league.ts`) plus the `division` its parent league implies, so
 * every negotiation is grounded in the actual competitions dataset.
 */
export interface NegotiatingClub {
  id: string;
  name: string;
  division: Division;
  country: string;
  reputation: number;
  squadStrength: number;
  baseBudget: number;
}

export type NegotiationSpeaker = "club" | "player" | "agent";

/** One line of the negotiation transcript. */
export interface NegotiationMessage {
  id: string;
  speaker: NegotiationSpeaker;
  terms: ContractTerms;
  message: string;
  /** Club patience (0-100) right after this message. */
  patienceAfter: number;
}

export type NegotiationOutcome = "in_progress" | "accepted" | "walked_away";

/** The full, replayable state of one negotiation. */
export interface NegotiationSession {
  club: NegotiatingClub;
  /** Club patience, 0-100. Hits 0 and the deal collapses. */
  patience: number;
  round: number;
  /** Informational cap shown in the UI; patience can still end things sooner. */
  maxRounds: number;
  history: NegotiationMessage[];
  outcome: NegotiationOutcome;
}
