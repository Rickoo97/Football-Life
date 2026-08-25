import { describe, expect, it } from "vitest";

import {
  applyAcceptedNegotiation,
  computeFairTerms,
  computeOverreach,
  computePlayerRating,
  computeWageCeiling,
  createNegotiationSession,
  evaluateCounterOffer,
  generateOpeningOffer,
  getCurrentClubOffer,
  getNegotiationBounds,
  sanitizeNegotiationSession,
  walkAwayFromNegotiation,
} from "./negotiation";
import type { Player } from "@/types/game";
import type { ContractTerms, NegotiatingClub, NegotiationSession } from "@/types/negotiation";

const RICH_CLUB: NegotiatingClub = {
  id: "club-rich",
  name: "London Athletic",
  division: "premier_league",
  country: "England",
  reputation: 90,
  squadStrength: 88,
  baseBudget: 200_000_000,
};

const POOR_CLUB: NegotiatingClub = {
  id: "club-poor",
  name: "SC Veendam",
  division: "eerste_divisie",
  country: "Netherlands",
  reputation: 40,
  squadStrength: 42,
  baseBudget: 4_000_000,
};

const STAR_PLAYER: Player = {
  id: "player-star",
  name: "Star Speler",
  age: 25,
  nationality: "NL",
  position: "ST",
  energy: 90,
  morale: 75,
  attributes: {
    shooting: 88,
    passing: 82,
    defending: 45,
    physical: 80,
    pace: 85,
    technique: 86,
    stamina: 80,
  },
  marketValue: 20_000_000,
  weeklySalary: 60_000,
  clubId: "club-current",
};

const ROOKIE_PLAYER: Player = {
  id: "player-rookie",
  name: "Rookie Speler",
  age: 19,
  nationality: "NL",
  position: "CM",
  energy: 90,
  morale: 60,
  attributes: {
    shooting: 40,
    passing: 45,
    defending: 44,
    physical: 42,
    pace: 48,
    technique: 44,
    stamina: 46,
  },
  marketValue: 200_000,
  weeklySalary: 2_000,
  clubId: "club-current",
};

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

describe("computePlayerRating", () => {
  it("averages the six attributes into a 1-100 rating", () => {
    expect(computePlayerRating(STAR_PLAYER)).toBeGreaterThan(80);
    expect(computePlayerRating(ROOKIE_PLAYER)).toBeLessThan(50);
  });
});

describe("computeWageCeiling", () => {
  it("scales with both budget and reputation", () => {
    const richCeiling = computeWageCeiling(RICH_CLUB);
    const poorCeiling = computeWageCeiling(POOR_CLUB);
    expect(richCeiling).toBeGreaterThan(poorCeiling);
  });
});

describe("computeFairTerms", () => {
  it("offers a star player more than a rookie at the same club", () => {
    const starTerms = computeFairTerms(RICH_CLUB, STAR_PLAYER);
    const rookieTerms = computeFairTerms(RICH_CLUB, ROOKIE_PLAYER);

    expect(starTerms.weeklySalary).toBeGreaterThan(rookieTerms.weeklySalary);
    expect(starTerms.contractDurationYears).toBeGreaterThanOrEqual(
      rookieTerms.contractDurationYears
    );
  });

  it("never exceeds the club's wage ceiling", () => {
    const terms = computeFairTerms(POOR_CLUB, STAR_PLAYER);
    expect(terms.weeklySalary).toBeLessThanOrEqual(computeWageCeiling(POOR_CLUB));
  });
});

describe("generateOpeningOffer", () => {
  it("opens below the fair terms", () => {
    const fair = computeFairTerms(RICH_CLUB, STAR_PLAYER);
    const opening = generateOpeningOffer(RICH_CLUB, STAR_PLAYER, seededRandom(1));

    expect(opening.weeklySalary).toBeLessThan(fair.weeklySalary);
    expect(opening.weeklySalary).toBeGreaterThan(0);
  });

  it("is reproducible with the same seeded random function", () => {
    const first = generateOpeningOffer(RICH_CLUB, STAR_PLAYER, seededRandom(42));
    const second = generateOpeningOffer(RICH_CLUB, STAR_PLAYER, seededRandom(42));
    expect(first).toEqual(second);
  });
});

describe("createNegotiationSession", () => {
  it("starts at full patience with the club's opening bid in the history", () => {
    const session = createNegotiationSession(
      RICH_CLUB,
      STAR_PLAYER,
      seededRandom(7)
    );

    expect(session.patience).toBe(100);
    expect(session.round).toBe(1);
    expect(session.outcome).toBe("in_progress");
    expect(session.history).toHaveLength(1);
    expect(session.history[0].speaker).toBe("club");
  });
});

describe("computeOverreach", () => {
  it("is zero for an ask at or below fair value", () => {
    const fair = computeFairTerms(RICH_CLUB, STAR_PLAYER);
    expect(computeOverreach(RICH_CLUB, fair, fair)).toBe(0);
  });

  it("grows as the ask exceeds fair value and the wage ceiling", () => {
    const fair = computeFairTerms(POOR_CLUB, ROOKIE_PLAYER);
    const modestAsk: ContractTerms = { ...fair, weeklySalary: fair.weeklySalary * 1.1 };
    const wildAsk: ContractTerms = {
      weeklySalary: computeWageCeiling(POOR_CLUB) * 5,
      contractDurationYears: 5,
      signingBonus: fair.signingBonus * 10,
      goalBonus: fair.goalBonus * 10,
    };

    const modestOverreach = computeOverreach(POOR_CLUB, fair, modestAsk);
    const wildOverreach = computeOverreach(POOR_CLUB, fair, wildAsk);

    expect(modestOverreach).toBeGreaterThan(0);
    expect(wildOverreach).toBeGreaterThan(modestOverreach);
  });
});

describe("evaluateCounterOffer", () => {
  it("reduces patience less for a reasonable counter than for a wild one", () => {
    const session = createNegotiationSession(POOR_CLUB, ROOKIE_PLAYER, seededRandom(3));
    const fair = computeFairTerms(POOR_CLUB, ROOKIE_PLAYER);

    const reasonableResult = evaluateCounterOffer(session, ROOKIE_PLAYER, fair);
    const wildAsk: ContractTerms = {
      weeklySalary: computeWageCeiling(POOR_CLUB) * 10,
      contractDurationYears: 5,
      signingBonus: fair.signingBonus * 20,
      goalBonus: fair.goalBonus * 20,
    };
    const wildResult = evaluateCounterOffer(session, ROOKIE_PLAYER, wildAsk);

    expect(reasonableResult.patience).toBeGreaterThan(wildResult.patience);
  });

  it("collapses the deal once patience reaches zero", () => {
    let session = createNegotiationSession(POOR_CLUB, ROOKIE_PLAYER, seededRandom(9));
    const outrageousAsk: ContractTerms = {
      weeklySalary: computeWageCeiling(POOR_CLUB) * 20,
      contractDurationYears: 5,
      signingBonus: 10_000_000,
      goalBonus: 100_000,
    };

    for (let round = 0; round < 10 && session.outcome === "in_progress"; round += 1) {
      session = evaluateCounterOffer(session, ROOKIE_PLAYER, outrageousAsk);
    }

    expect(session.outcome).toBe("walked_away");
    expect(session.patience).toBe(0);
  });

  it("makes the club counter closer to a modest ask than to a wild one", () => {
    const session = createNegotiationSession(RICH_CLUB, STAR_PLAYER, seededRandom(5));
    const fair = computeFairTerms(RICH_CLUB, STAR_PLAYER);
    const opening = getCurrentClubOffer(session);

    const modestAsk: ContractTerms = {
      ...fair,
      weeklySalary: opening.weeklySalary + (fair.weeklySalary - opening.weeklySalary) * 0.5,
    };
    const wildAsk: ContractTerms = {
      ...fair,
      weeklySalary: computeWageCeiling(RICH_CLUB) * 3,
    };

    const modestResult = evaluateCounterOffer(session, STAR_PLAYER, modestAsk);
    const wildResult = evaluateCounterOffer(session, STAR_PLAYER, wildAsk);

    const modestClubOffer = getCurrentClubOffer(modestResult);
    const wildClubOffer = getCurrentClubOffer(wildResult);

    // The club should move further toward a reasonable ask than a wild one,
    // relative to how far each ask actually is from the opening offer.
    const modestProgress =
      (modestClubOffer.weeklySalary - opening.weeklySalary) /
      (modestAsk.weeklySalary - opening.weeklySalary);
    const wildProgress =
      (wildClubOffer.weeklySalary - opening.weeklySalary) /
      (wildAsk.weeklySalary - opening.weeklySalary);

    expect(modestProgress).toBeGreaterThan(wildProgress);
  });

  it("does nothing once the negotiation has already ended", () => {
    const session = createNegotiationSession(RICH_CLUB, STAR_PLAYER, seededRandom(4));
    const walkedAway = walkAwayFromNegotiation(session);
    const fair = computeFairTerms(RICH_CLUB, STAR_PLAYER);

    const result = evaluateCounterOffer(walkedAway, STAR_PLAYER, fair);
    expect(result).toBe(walkedAway);
  });
});

describe("getNegotiationBounds", () => {
  it("returns wider salary bounds for richer clubs", () => {
    const richBounds = getNegotiationBounds(RICH_CLUB);
    const poorBounds = getNegotiationBounds(POOR_CLUB);

    expect(richBounds.weeklySalary[1]).toBeGreaterThan(poorBounds.weeklySalary[1]);
    expect(richBounds.contractDurationYears).toEqual([1, 5]);
  });
});

describe("applyAcceptedNegotiation", () => {
  it("moves the player to the negotiating club with the current terms", () => {
    const session = createNegotiationSession(RICH_CLUB, STAR_PLAYER, seededRandom(11));
    const offer = getCurrentClubOffer(session);

    const result = applyAcceptedNegotiation(STAR_PLAYER, session);

    expect(result.player.clubId).toBe(RICH_CLUB.id);
    expect(result.player.weeklySalary).toBe(offer.weeklySalary);
    expect(result.club.id).toBe(RICH_CLUB.id);
    expect(result.club.division).toBe(RICH_CLUB.division);
    expect(result.logEntry.type).toBe("transfer");
  });
});

describe("sanitizeNegotiationSession", () => {
  it("passes through a well-formed session", () => {
    const session = createNegotiationSession(RICH_CLUB, STAR_PLAYER, seededRandom(2));
    expect(sanitizeNegotiationSession(session)).toEqual(session);
  });

  it("returns null for missing or malformed input", () => {
    expect(sanitizeNegotiationSession(null)).toBeNull();
    expect(sanitizeNegotiationSession({})).toBeNull();
    expect(
      sanitizeNegotiationSession({ club: { id: "x" }, history: [] })
    ).toBeNull();
  });

  it("clamps a corrupted patience value back into range", () => {
    const session = createNegotiationSession(RICH_CLUB, STAR_PLAYER, seededRandom(6));
    const corrupted: NegotiationSession = { ...session, patience: 250 };

    const sanitized = sanitizeNegotiationSession(corrupted);
    expect(sanitized?.patience).toBe(100);
  });
});
