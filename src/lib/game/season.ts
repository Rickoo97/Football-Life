import { formatCurrency } from "@/lib/game/formatters";
import type { Club, Division, GameEventType, GameState, Player } from "@/types/game";
import type {
  ContractOffer,
  SeasonStats,
  SeasonSummary,
  SeasonTransition,
  SeasonTransitionChoice,
  TransferOffer,
} from "@/types/season";

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function createInitialSeasonStats(startingMarketValue: number): SeasonStats {
  return {
    matchesPlayed: 0,
    goals: 0,
    assists: 0,
    ratingSum: 0,
    startingMarketValue,
  };
}

/** Adds one match's contribution to the running season totals. Pure. */
export function recordMatchInSeasonStats(
  stats: SeasonStats,
  result: { goals: number; assists: number; matchRating: number }
): SeasonStats {
  return {
    ...stats,
    matchesPlayed: stats.matchesPlayed + 1,
    goals: stats.goals + result.goals,
    assists: stats.assists + result.assists,
    ratingSum: stats.ratingSum + result.matchRating,
  };
}

function averageRating(stats: SeasonStats): number {
  if (stats.matchesPlayed === 0) {
    return 0;
  }
  return roundToOneDecimal(stats.ratingSum / stats.matchesPlayed);
}

export function createSeasonSummary(state: GameState): SeasonSummary {
  const { seasonStats, player, club, season } = state;

  return {
    season,
    matchesPlayed: seasonStats.matchesPlayed,
    goals: seasonStats.goals,
    assists: seasonStats.assists,
    averageRating: averageRating(seasonStats),
    startingMarketValue: seasonStats.startingMarketValue,
    endingMarketValue: player.marketValue,
    marketValueGrowth: player.marketValue - seasonStats.startingMarketValue,
    trainerRelationship: club.trainerRelationship,
    clubName: club.name,
  };
}

/**
 * The current club's contract offer. Deterministic: a better average rating,
 * a warmer relationship with the trainer and youth all push the raise up,
 * while poor form or an aging player push it down.
 */
export function createContractOffer(
  state: GameState,
  summary: SeasonSummary
): ContractOffer {
  const ratingFactor = (summary.averageRating - 6) * 0.06;
  const relationshipFactor = ((state.club.trainerRelationship - 50) / 100) * 0.15;
  const ageFactor = state.player.age <= 23 ? 0.05 : state.player.age >= 31 ? -0.08 : 0;

  const raise = clampNumber(ratingFactor + relationshipFactor + ageFactor, -0.25, 0.35);
  const weeklySalary = Math.max(500, Math.round(state.player.weeklySalary * (1 + raise)));
  const durationYears = raise >= 0.12 ? 3 : raise >= 0 ? 2 : 1;

  return {
    clubId: state.club.id,
    clubName: state.club.name,
    weeklySalary,
    durationYears,
    raisePercentage: roundToOneDecimal(raise * 100),
  };
}

interface TransferClubBlueprint {
  id: string;
  name: string;
  division: Division;
  reputation: number;
}

const TRANSFER_CLUB_POOL: readonly TransferClubBlueprint[] = [
  { id: "club-fc-noordkust", name: "FC Noordkust", division: "eredivisie", reputation: 58 },
  { id: "club-continental-ajax", name: "Continental Ajax", division: "eredivisie", reputation: 88 },
  { id: "club-rotterdam-united", name: "Rotterdam United", division: "eredivisie", reputation: 74 },
  { id: "club-brighton-rovers", name: "Brighton Rovers", division: "premier_league", reputation: 70 },
  { id: "club-london-athletic", name: "London Athletic", division: "premier_league", reputation: 91 },
  { id: "club-real-alcazar", name: "Real Alcázar", division: "la_liga", reputation: 85 },
  { id: "club-milano-calcio", name: "Milano Calcio", division: "serie_a", reputation: 82 },
  { id: "club-borussia-westpark", name: "Borussia Westpark", division: "bundesliga", reputation: 79 },
  { id: "club-leeds-forge", name: "Leeds Forge", division: "championship", reputation: 60 },
  { id: "club-sc-veendam", name: "SC Veendam", division: "eerste_divisie", reputation: 40 },
] as const;

/**
 * Rolls for interested outside clubs. Better form and market value growth
 * raise the odds; the seeded `random` keeps this reproducible in tests while
 * the store uses `Math.random` for real variety each season.
 */
export function generateTransferOffers(
  state: GameState,
  summary: SeasonSummary,
  random: () => number = Math.random
): TransferOffer[] {
  const performanceScore = clampNumber(summary.averageRating / 10, 0, 1);
  const growthBonus = summary.marketValueGrowth > 0 ? 0.12 : 0;
  const interestScore = clampNumber(performanceScore + growthBonus, 0, 1);

  const candidates = TRANSFER_CLUB_POOL.filter(
    (candidate) =>
      candidate.id !== state.club.id && candidate.reputation >= state.club.reputation - 10
  );

  const offers: TransferOffer[] = [];

  for (const candidate of candidates) {
    if (offers.length >= 3) {
      break;
    }

    const reputationGap = (candidate.reputation - state.club.reputation) / 100;
    const interestChance = clampNumber(
      interestScore - Math.max(0, reputationGap) * 0.6,
      0.05,
      0.85
    );

    if (random() < interestChance) {
      const salaryMultiplier =
        1 + clampNumber(0.05 + reputationGap * 0.6 + interestScore * 0.2, 0.02, 0.6);
      const feeMultiplier = 1 + clampNumber(reputationGap, -0.3, 0.8);

      offers.push({
        clubId: candidate.id,
        clubName: candidate.name,
        division: candidate.division,
        reputation: candidate.reputation,
        transferFee: Math.max(50_000, Math.round(state.player.marketValue * feeMultiplier)),
        weeklySalary: Math.max(500, Math.round(state.player.weeklySalary * salaryMultiplier)),
      });
    }
  }

  return offers;
}

/** Builds the full season-ending package: summary, contract offer and transfer offers. */
export function createSeasonTransition(
  state: GameState,
  random: () => number = Math.random
): SeasonTransition {
  const summary = createSeasonSummary(state);
  const contractOffer = createContractOffer(state, summary);
  const transferOffers = generateTransferOffers(state, summary, random);

  return { summary, contractOffer, transferOffers };
}

/**
 * Validates and repairs a persisted `SeasonTransition`. Returns `null` when
 * the essentials (summary, contract offer) are missing or corrupted, since a
 * half-broken transition is worse than none — the season has already rolled
 * over by the time this is read back, so losing it just skips one decision
 * rather than soft-locking the save.
 */
export function sanitizeSeasonTransition(value: unknown): SeasonTransition | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<SeasonTransition>;
  const summary = candidate.summary as Partial<SeasonSummary> | undefined;
  const contractOffer = candidate.contractOffer as Partial<ContractOffer> | undefined;

  if (
    !summary ||
    typeof summary !== "object" ||
    !isFiniteNumber(summary.season) ||
    !isFiniteNumber(summary.averageRating) ||
    typeof summary.clubName !== "string"
  ) {
    return null;
  }

  if (
    !contractOffer ||
    typeof contractOffer !== "object" ||
    !isFiniteNumber(contractOffer.weeklySalary) ||
    typeof contractOffer.clubName !== "string"
  ) {
    return null;
  }

  const transferOffers = Array.isArray(candidate.transferOffers)
    ? candidate.transferOffers.filter((offer): offer is TransferOffer => {
        if (!offer || typeof offer !== "object") {
          return false;
        }
        const candidateOffer = offer as Partial<TransferOffer>;
        return (
          typeof candidateOffer.clubId === "string" &&
          typeof candidateOffer.clubName === "string" &&
          isFiniteNumber(candidateOffer.transferFee) &&
          isFiniteNumber(candidateOffer.weeklySalary)
        );
      })
    : [];

  return {
    summary: summary as SeasonSummary,
    contractOffer: contractOffer as ContractOffer,
    transferOffers,
  };
}

export interface SeasonTransitionResolution {
  player: Player;
  club: Club;
  logEntry: { type: GameEventType; title: string; description: string };
}

/**
 * Pure resolver for a season transition choice: computes the resulting
 * player/club and a log entry describing what happened. The store is
 * responsible for actually applying these via `set()`.
 */
export function applySeasonTransitionChoice(
  player: Player,
  club: Club,
  transition: SeasonTransition,
  choice: SeasonTransitionChoice
): SeasonTransitionResolution {
  switch (choice.type) {
    case "renew-contract": {
      const { contractOffer } = transition;
      return {
        player: { ...player, weeklySalary: contractOffer.weeklySalary },
        club,
        logEntry: {
          type: "contract",
          title: "Nieuw contract getekend",
          description: `Je hebt getekend voor ${contractOffer.durationYears} jaar op ${formatCurrency(
            contractOffer.weeklySalary
          )} per week (${contractOffer.raisePercentage >= 0 ? "+" : ""}${contractOffer.raisePercentage}%).`,
        },
      };
    }

    case "accept-transfer": {
      const offer = transition.transferOffers.find(
        (candidate) => candidate.clubId === choice.clubId
      );

      if (!offer) {
        return {
          player,
          club,
          logEntry: {
            type: "system",
            title: "Transfer mislukt",
            description: "Dat aanbod was niet langer geldig.",
          },
        };
      }

      const newClub: Club = {
        id: offer.clubId,
        name: offer.clubName,
        division: offer.division,
        reputation: offer.reputation,
        trainerRelationship: 55,
      };

      return {
        player: {
          ...player,
          weeklySalary: offer.weeklySalary,
          clubId: offer.clubId,
        },
        club: newClub,
        logEntry: {
          type: "transfer",
          title: `Transfer naar ${offer.clubName}`,
          description: `Je bent overgestapt naar ${offer.clubName} voor ${formatCurrency(
            offer.transferFee
          )}, op een nieuw salaris van ${formatCurrency(offer.weeklySalary)} per week.`,
        },
      };
    }

    case "reject-all":
    default:
      return {
        player,
        club,
        logEntry: {
          type: "system",
          title: "Geen wijzigingen",
          description: "Je blijft op je huidige contract bij de club.",
        },
      };
  }
}
