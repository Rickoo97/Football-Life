import {
  GREEDY_OVERREACH_THRESHOLD,
  pickAgentDialogue,
} from "@/data/agentDialogues";
import { getPositionAttackWeight } from "@/lib/engine/matchEngine";
import { formatCurrency } from "@/lib/game/formatters";
import type { Club, GameEventType, Player } from "@/types/game";
import type {
  ContractTerms,
  NegotiatingClub,
  NegotiationMessage,
  NegotiationSession,
} from "@/types/negotiation";

/** Informational round cap shown in the UI; patience can end things sooner. */
export const NEGOTIATION_MAX_ROUNDS = 6;

/** Flat "negotiation fatigue" the club's patience loses every round. */
const BASE_ROUND_FATIGUE = 4;
/** Extra fatigue per round once the informational round cap is exceeded. */
const OVERTIME_ROUND_FATIGUE = 6;

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Overall rating (1-100) derived from a player's attributes, used as a value proxy. */
export function computePlayerRating(player: Player): number {
  const { shooting, passing, defending, physical, pace, technique, stamina } =
    player.attributes;

  // Defenders are valued on their defending, strikers barely at all, so a
  // centre-back isn't punished for being a poor finisher.
  const defensiveShare = (1 - getPositionAttackWeight(player.position)) * 0.35;
  const outfieldSkill =
    (shooting + passing + physical + pace + technique + stamina) / 6;
  const average =
    outfieldSkill * (1 - defensiveShare) + defending * defensiveShare;

  return Math.round(clampNumber(average, 1, 100));
}

/** The hard weekly-wage ceiling a club can ever offer, from its transfer budget. */
export function computeWageCeiling(club: NegotiatingClub): number {
  const reputationFactor = 0.55 + club.reputation / 200; // 0.55 - 1.05
  return Math.max(500, Math.round((club.baseBudget / 1500) * reputationFactor));
}

/**
 * The "fair" midpoint terms both sides could reasonably settle on, derived
 * from the player's rating/market value and the club's wage ceiling.
 */
export function computeFairTerms(
  club: NegotiatingClub,
  player: Player
): ContractTerms {
  const rating = computePlayerRating(player);
  const ceiling = computeWageCeiling(club);
  const valueFactor = clampNumber(rating / 100, 0.1, 1);
  const marketValueWeeklyHint = player.marketValue / 150;

  const weeklySalary = Math.max(
    500,
    roundToStep(
      clampNumber(
        Math.max(marketValueWeeklyHint, ceiling * (0.35 + valueFactor * 0.5)),
        500,
        ceiling
      ),
      250
    )
  );

  const contractDurationYears = rating >= 80 ? 4 : rating >= 60 ? 3 : 2;
  const signingBonus = roundToStep(weeklySalary * 8, 1000);
  const goalBonus = roundToStep(weeklySalary * 0.06, 50);

  return { weeklySalary, contractDurationYears, signingBonus, goalBonus };
}

/** Realistic slider bounds for the counter-offer UI, based on the club at hand. */
export function getNegotiationBounds(club: NegotiatingClub): {
  weeklySalary: [number, number];
  signingBonus: [number, number];
  goalBonus: [number, number];
  contractDurationYears: [number, number];
} {
  const ceiling = computeWageCeiling(club);
  return {
    weeklySalary: [500, Math.round(ceiling * 1.6)],
    signingBonus: [0, Math.round(ceiling * 12)],
    goalBonus: [0, Math.round(ceiling * 0.25)],
    contractDurationYears: [1, 5],
  };
}

function createMessageId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `negotiation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** The club's opening bid: a lowball fraction of the fair terms. */
export function generateOpeningOffer(
  club: NegotiatingClub,
  player: Player,
  random: () => number = Math.random
): ContractTerms {
  const fair = computeFairTerms(club, player);
  // Clubs open somewhere between 65% and 85% of what they'd consider fair.
  const openingFactor = 0.65 + random() * 0.2;

  return {
    weeklySalary: Math.max(500, roundToStep(fair.weeklySalary * openingFactor, 250)),
    contractDurationYears: Math.max(1, fair.contractDurationYears - 1),
    signingBonus: Math.max(0, roundToStep(fair.signingBonus * openingFactor, 1000)),
    goalBonus: Math.max(0, roundToStep(fair.goalBonus * openingFactor, 50)),
  };
}

/** Starts a brand new negotiation with the club's opening bid already on the table. */
export function createNegotiationSession(
  club: NegotiatingClub,
  player: Player,
  random: () => number = Math.random
): NegotiationSession {
  const openingOffer = generateOpeningOffer(club, player, random);

  const openingMessage: NegotiationMessage = {
    id: createMessageId(),
    speaker: "agent",
    terms: openingOffer,
    message: pickAgentDialogue("lowball", random, { club: club.name }),
    patienceAfter: 100,
  };

  return {
    club,
    patience: 100,
    round: 1,
    maxRounds: NEGOTIATION_MAX_ROUNDS,
    history: [openingMessage],
    outcome: "in_progress",
  };
}

/** The most recent offer the club has put on the table. */
export function getCurrentClubOffer(session: NegotiationSession): ContractTerms {
  const lastOfferMessage = [...session.history]
    .reverse()
    .find((message) => message.speaker !== "player");
  return lastOfferMessage?.terms ?? session.history[0].terms;
}

/**
 * How unrealistic a player's ask is relative to the fair terms and the
 * club's hard wage ceiling. `0` means perfectly reasonable (or below fair);
 * larger numbers mean a bigger overreach.
 */
export function computeOverreach(
  club: NegotiatingClub,
  fairTerms: ContractTerms,
  ask: ContractTerms
): number {
  const ceiling = computeWageCeiling(club);

  const salaryOverFair = Math.max(
    0,
    (ask.weeklySalary - fairTerms.weeklySalary) / fairTerms.weeklySalary
  );
  const salaryOverCeiling = Math.max(0, (ask.weeklySalary - ceiling) / ceiling);
  const bonusOverFair = Math.max(
    0,
    (ask.signingBonus - fairTerms.signingBonus) /
      Math.max(1, fairTerms.signingBonus)
  );
  const goalBonusOverFair = Math.max(
    0,
    (ask.goalBonus - fairTerms.goalBonus) / Math.max(1, fairTerms.goalBonus)
  );
  const durationOverFair = Math.max(
    0,
    (ask.contractDurationYears - fairTerms.contractDurationYears) /
      fairTerms.contractDurationYears
  );

  return (
    salaryOverFair * 0.5 +
    salaryOverCeiling * 1.2 +
    bonusOverFair * 0.15 +
    goalBonusOverFair * 0.1 +
    durationOverFair * 0.15
  );
}

function describeOverreach(overreach: number, clubName: string): string {
  if (overreach >= GREEDY_OVERREACH_THRESHOLD) {
    return `Dat is compleet onrealistisch. ${clubName} is duidelijk geïrriteerd, maar doet nog een klein tegenbod.`;
  }
  if (overreach >= 0.25) {
    return `Dat is ambitieus. ${clubName} is bereid om een stap te zetten, maar niet zo groot als jij wilt.`;
  }
  if (overreach > 0) {
    return `Een redelijk verzoek. ${clubName} komt je graag een stuk tegemoet.`;
  }
  return `${clubName} waardeert je bescheiden inzet en verbetert het aanbod graag.`;
}

function moveTowards(
  current: number,
  target: number,
  ratio: number,
  ceiling: number
): number {
  const next = current + (target - current) * ratio;
  return clampNumber(next, Math.min(current, target), ceiling);
}

/**
 * Applies the player's counter-offer: updates the club's patience and
 * produces its response. Pure — returns a brand new session.
 */
export function evaluateCounterOffer(
  session: NegotiationSession,
  player: Player,
  playerAsk: ContractTerms,
  random: () => number = Math.random
): NegotiationSession {
  if (session.outcome !== "in_progress") {
    return session;
  }

  const fairTerms = computeFairTerms(session.club, player);
  const overreach = computeOverreach(session.club, fairTerms, playerAsk);
  const isGenerous = overreach === 0 && playerAsk.weeklySalary <= fairTerms.weeklySalary * 0.95;

  const roundFatigue =
    session.round > session.maxRounds
      ? BASE_ROUND_FATIGUE + OVERTIME_ROUND_FATIGUE
      : BASE_ROUND_FATIGUE;
  const overreachPenalty = clampNumber(overreach * 55, 0, 60);
  const goodwillBonus = isGenerous ? 3 : 0;

  const patienceDelta = clampNumber(
    goodwillBonus - overreachPenalty - roundFatigue,
    -70,
    5
  );
  const nextPatience = clampNumber(session.patience + patienceDelta, 0, 100);

  const playerMessage: NegotiationMessage = {
    id: createMessageId(),
    speaker: "player",
    terms: playerAsk,
    message: "Je dient een tegenbod in via je zaakwaarnemer.",
    patienceAfter: nextPatience,
  };

  if (nextPatience <= 0) {
    const collapseMessage: NegotiationMessage = {
      id: createMessageId(),
      speaker: "agent",
      terms: getCurrentClubOffer(session),
      message: pickAgentDialogue("collapsed", random, { club: session.club.name }),
      patienceAfter: 0,
    };

    return {
      ...session,
      patience: 0,
      round: session.round + 1,
      history: [...session.history, playerMessage, collapseMessage],
      outcome: "walked_away",
    };
  }

  const previousOffer = getCurrentClubOffer(session);
  const ceiling = computeWageCeiling(session.club);
  const concessionRatio = clampNumber(0.55 - overreach * 0.3, 0.12, 0.55);

  const clubCounter: ContractTerms = {
    weeklySalary: roundToStep(
      moveTowards(
        previousOffer.weeklySalary,
        playerAsk.weeklySalary,
        concessionRatio,
        ceiling
      ),
      250
    ),
    signingBonus: roundToStep(
      moveTowards(
        previousOffer.signingBonus,
        playerAsk.signingBonus,
        concessionRatio,
        ceiling * 12
      ),
      1000
    ),
    goalBonus: roundToStep(
      moveTowards(
        previousOffer.goalBonus,
        playerAsk.goalBonus,
        concessionRatio,
        ceiling * 0.25
      ),
      50
    ),
    contractDurationYears: clampNumber(
      Math.round(
        moveTowards(
          previousOffer.contractDurationYears,
          playerAsk.contractDurationYears,
          concessionRatio,
          5
        )
      ),
      1,
      5
    ),
  };

  const isGreedyAsk = overreach >= GREEDY_OVERREACH_THRESHOLD;
  const clubMessage: NegotiationMessage = {
    id: createMessageId(),
    speaker: isGreedyAsk ? "agent" : "club",
    terms: clubCounter,
    message: isGreedyAsk
      ? pickAgentDialogue("greedy", random, { club: session.club.name })
      : describeOverreach(overreach, session.club.name),
    patienceAfter: nextPatience,
  };

  return {
    ...session,
    patience: nextPatience,
    round: session.round + 1,
    history: [...session.history, playerMessage, clubMessage],
    outcome: "in_progress",
  };
}

/** The player walks away without a deal. Pure. */
export function walkAwayFromNegotiation(
  session: NegotiationSession,
  random: () => number = Math.random
): NegotiationSession {
  if (session.outcome !== "in_progress") {
    return session;
  }

  const collapseMessage: NegotiationMessage = {
    id: createMessageId(),
    speaker: "agent",
    terms: getCurrentClubOffer(session),
    message: pickAgentDialogue("collapsed", random, { club: session.club.name }),
    patienceAfter: session.patience,
  };

  return {
    ...session,
    outcome: "walked_away",
    history: [...session.history, collapseMessage],
  };
}

/** Marks the session as accepted and adds the agent's closing line. Pure. */
export function acceptNegotiationSession(
  session: NegotiationSession,
  random: () => number = Math.random
): NegotiationSession {
  if (session.outcome !== "in_progress") {
    return session;
  }

  const successMessage: NegotiationMessage = {
    id: createMessageId(),
    speaker: "agent",
    terms: getCurrentClubOffer(session),
    message: pickAgentDialogue("success", random, { club: session.club.name }),
    patienceAfter: session.patience,
  };

  return {
    ...session,
    outcome: "accepted",
    history: [...session.history, successMessage],
  };
}

export interface NegotiationResolution {
  player: Player;
  club: Club;
  logEntry: { type: GameEventType; title: string; description: string };
}

/**
 * Converts an accepted negotiation into the resulting player/club, mirroring
 * the shape `applySeasonTransitionChoice` uses so the store can apply either
 * consistently.
 */
export function applyAcceptedNegotiation(
  player: Player,
  session: NegotiationSession
): NegotiationResolution {
  const terms = getCurrentClubOffer(session);
  const { club } = session;

  const newClub: Club = {
    id: club.id,
    name: club.name,
    division: club.division,
    reputation: club.reputation,
    trainerRelationship: 55,
  };

  return {
    player: {
      ...player,
      clubId: club.id,
      weeklySalary: terms.weeklySalary,
    },
    club: newClub,
    logEntry: {
      type: "transfer",
      title: `Transfer naar ${club.name}`,
      description: `Je hebt getekend bij ${club.name}: ${formatCurrency(
        terms.weeklySalary
      )} per week, ${terms.contractDurationYears} jaar, ${formatCurrency(
        terms.signingBonus
      )} tekengeld en ${formatCurrency(terms.goalBonus)} doelpuntbonus.`,
    },
  };
}

/**
 * Validates and repairs a persisted `NegotiationSession`. Returns `null` when
 * the essentials are missing/corrupted — the modal simply won't reappear,
 * which is safe since nothing else in the game depends on it being present.
 */
export function sanitizeNegotiationSession(
  value: unknown
): NegotiationSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<NegotiationSession>;
  const club = candidate.club as Partial<NegotiatingClub> | undefined;

  if (
    !club ||
    typeof club !== "object" ||
    typeof club.id !== "string" ||
    typeof club.name !== "string" ||
    !isFiniteNumber(club.baseBudget) ||
    !isFiniteNumber(club.reputation)
  ) {
    return null;
  }

  if (
    !isFiniteNumber(candidate.patience) ||
    !isFiniteNumber(candidate.round) ||
    !Array.isArray(candidate.history) ||
    candidate.history.length === 0
  ) {
    return null;
  }

  const validHistory = candidate.history.every((message) => {
    if (!message || typeof message !== "object") {
      return false;
    }
    const candidateMessage = message as Partial<NegotiationMessage>;
    return (
      (candidateMessage.speaker === "club" ||
        candidateMessage.speaker === "player" ||
        candidateMessage.speaker === "agent") &&
      typeof candidateMessage.terms === "object" &&
      candidateMessage.terms !== null &&
      isFiniteNumber((candidateMessage.terms as ContractTerms).weeklySalary)
    );
  });

  if (!validHistory) {
    return null;
  }

  return {
    club: club as NegotiatingClub,
    patience: clampNumber(candidate.patience, 0, 100),
    round: Math.max(1, Math.round(candidate.round)),
    maxRounds: isFiniteNumber(candidate.maxRounds)
      ? candidate.maxRounds
      : NEGOTIATION_MAX_ROUNDS,
    history: candidate.history as NegotiationMessage[],
    outcome:
      candidate.outcome === "accepted" || candidate.outcome === "walked_away"
        ? candidate.outcome
        : "in_progress",
  };
}
