/**
 * Types describing what happens between two seasons: a performance summary,
 * a contract offer from the current club and any interested outside clubs.
 */

import type { Division } from "@/types/game";

/** Accumulates a player's performance over the running season. */
export interface SeasonStats {
  matchesPlayed: number;
  goals: number;
  assists: number;
  /** Sum of every match rating this season; divide by matchesPlayed for the average. */
  ratingSum: number;
  /** Player's market value at the moment this season started. */
  startingMarketValue: number;
}

/** Human-readable recap of the season that just ended. */
export interface SeasonSummary {
  season: number;
  matchesPlayed: number;
  goals: number;
  assists: number;
  /** Average match rating (1-10) across the season, 0 if no matches were played. */
  averageRating: number;
  startingMarketValue: number;
  endingMarketValue: number;
  marketValueGrowth: number;
  trainerRelationship: number;
  clubName: string;
}

/** The current club's offer to extend the player's contract. */
export interface ContractOffer {
  clubId: string;
  clubName: string;
  weeklySalary: number;
  durationYears: number;
  /** Change versus the current salary, e.g. 12.5 for +12.5%. */
  raisePercentage: number;
}

/** An interested outside club's transfer proposal. */
export interface TransferOffer {
  clubId: string;
  clubName: string;
  division: Division;
  reputation: number;
  transferFee: number;
  weeklySalary: number;
}

/** Everything the player needs to review at the end of a season. */
export interface SeasonTransition {
  summary: SeasonSummary;
  contractOffer: ContractOffer;
  transferOffers: TransferOffer[];
}

/** The decision the player makes when resolving a season transition. */
export type SeasonTransitionChoice =
  | { type: "renew-contract" }
  | { type: "accept-transfer"; clubId: string }
  | { type: "reject-all" };
