import { describe, expect, it } from "vitest";

import {
  applySeasonTransitionChoice,
  createContractOffer,
  createInitialSeasonStats,
  createSeasonSummary,
  createSeasonTransition,
  generateTransferOffers,
  recordMatchInSeasonStats,
  sanitizeSeasonTransition,
} from "./season";
import type { Club, GameState, Player } from "@/types/game";
import type { SeasonTransition } from "@/types/season";

const CLUB: Club = {
  id: "club-test",
  name: "FC Test",
  division: "eredivisie",
  reputation: 60,
  trainerRelationship: 55,
};

const PLAYER: Player = {
  id: "player-test",
  name: "Test Speler",
  age: 24,
  position: "ST",
  energy: 80,
  morale: 65,
  attributes: {
    shooting: 70,
    passing: 60,
    physical: 65,
    pace: 72,
    technique: 68,
    stamina: 64,
  },
  marketValue: 1_000_000,
  weeklySalary: 5_000,
  clubId: CLUB.id,
};

function createState(overrides: Partial<GameState> = {}): GameState {
  return {
    currentWeek: 38,
    currentDate: "2027-04-01",
    season: 2026,
    actionPoints: 3,
    maxActionPointsPerWeek: 3,
    balance: 10_000,
    player: PLAYER,
    club: CLUB,
    eventLog: [],
    lastMatchReport: null,
    seasonStats: createInitialSeasonStats(PLAYER.marketValue),
    pendingSeasonTransition: null,
    activeNegotiation: null,
    ...overrides,
  };
}

describe("season stats", () => {
  it("starts at zero with the given baseline market value", () => {
    const stats = createInitialSeasonStats(500_000);

    expect(stats).toEqual({
      matchesPlayed: 0,
      goals: 0,
      assists: 0,
      ratingSum: 0,
      startingMarketValue: 500_000,
    });
  });

  it("accumulates goals, assists and rating across matches", () => {
    let stats = createInitialSeasonStats(500_000);
    stats = recordMatchInSeasonStats(stats, { goals: 1, assists: 0, matchRating: 7 });
    stats = recordMatchInSeasonStats(stats, { goals: 0, assists: 2, matchRating: 6.5 });

    expect(stats.matchesPlayed).toBe(2);
    expect(stats.goals).toBe(1);
    expect(stats.assists).toBe(2);
    expect(stats.ratingSum).toBeCloseTo(13.5);
  });
});

describe("createSeasonSummary", () => {
  it("computes the average rating and market value growth", () => {
    let seasonStats = createInitialSeasonStats(800_000);
    seasonStats = recordMatchInSeasonStats(seasonStats, {
      goals: 2,
      assists: 1,
      matchRating: 8,
    });
    seasonStats = recordMatchInSeasonStats(seasonStats, {
      goals: 1,
      assists: 0,
      matchRating: 6,
    });

    const state = createState({
      seasonStats,
      player: { ...PLAYER, marketValue: 1_200_000 },
    });

    const summary = createSeasonSummary(state);

    expect(summary.matchesPlayed).toBe(2);
    expect(summary.goals).toBe(3);
    expect(summary.assists).toBe(1);
    expect(summary.averageRating).toBe(7);
    expect(summary.startingMarketValue).toBe(800_000);
    expect(summary.endingMarketValue).toBe(1_200_000);
    expect(summary.marketValueGrowth).toBe(400_000);
  });

  it("reports a zero average rating when no matches were played", () => {
    const summary = createSeasonSummary(createState());
    expect(summary.averageRating).toBe(0);
  });
});

describe("createContractOffer", () => {
  it("offers a bigger raise for better form and a good relationship with the trainer", () => {
    const strongSummary = createSeasonSummary(
      createState({
        club: { ...CLUB, trainerRelationship: 80 },
        seasonStats: (() => {
          let stats = createInitialSeasonStats(PLAYER.marketValue);
          for (let i = 0; i < 20; i += 1) {
            stats = recordMatchInSeasonStats(stats, {
              goals: 1,
              assists: 0,
              matchRating: 8.5,
            });
          }
          return stats;
        })(),
      })
    );

    const weakSummary = createSeasonSummary(
      createState({
        club: { ...CLUB, trainerRelationship: 20 },
        seasonStats: (() => {
          let stats = createInitialSeasonStats(PLAYER.marketValue);
          for (let i = 0; i < 20; i += 1) {
            stats = recordMatchInSeasonStats(stats, {
              goals: 0,
              assists: 0,
              matchRating: 4.5,
            });
          }
          return stats;
        })(),
      })
    );

    const strongOffer = createContractOffer(
      createState({ club: { ...CLUB, trainerRelationship: 80 } }),
      strongSummary
    );
    const weakOffer = createContractOffer(
      createState({ club: { ...CLUB, trainerRelationship: 20 } }),
      weakSummary
    );

    expect(strongOffer.weeklySalary).toBeGreaterThan(PLAYER.weeklySalary);
    expect(weakOffer.weeklySalary).toBeLessThan(PLAYER.weeklySalary);
    expect(strongOffer.weeklySalary).toBeGreaterThan(weakOffer.weeklySalary);
  });

  it("gives a young player a boost and an older player a discount, all else equal", () => {
    let neutralStats = createInitialSeasonStats(PLAYER.marketValue);
    for (let i = 0; i < 20; i += 1) {
      neutralStats = recordMatchInSeasonStats(neutralStats, {
        goals: 0,
        assists: 0,
        matchRating: 6,
      });
    }
    const summary = createSeasonSummary(createState({ seasonStats: neutralStats }));

    const youngOffer = createContractOffer(
      createState({ player: { ...PLAYER, age: 20 } }),
      summary
    );
    const oldOffer = createContractOffer(
      createState({ player: { ...PLAYER, age: 34 } }),
      summary
    );

    expect(youngOffer.weeklySalary).toBeGreaterThan(oldOffer.weeklySalary);
  });

  it("never exceeds a -25%/+35% raise", () => {
    const extremeGoodSummary = createSeasonSummary(
      createState({
        club: { ...CLUB, trainerRelationship: 100 },
        player: { ...PLAYER, age: 18 },
        seasonStats: (() => {
          let stats = createInitialSeasonStats(PLAYER.marketValue);
          for (let i = 0; i < 40; i += 1) {
            stats = recordMatchInSeasonStats(stats, {
              goals: 2,
              assists: 2,
              matchRating: 10,
            });
          }
          return stats;
        })(),
      })
    );

    const offer = createContractOffer(
      createState({ club: { ...CLUB, trainerRelationship: 100 }, player: { ...PLAYER, age: 18 } }),
      extremeGoodSummary
    );

    expect(offer.raisePercentage).toBeLessThanOrEqual(35);
    expect(offer.raisePercentage).toBeGreaterThanOrEqual(-25);
  });
});

describe("generateTransferOffers", () => {
  it("returns no offers when every roll misses", () => {
    const summary = createSeasonSummary(createState());
    const offers = generateTransferOffers(createState(), summary, () => 0.999);
    expect(offers).toEqual([]);
  });

  it("returns offers, capped at three, when every roll hits", () => {
    const summary = createSeasonSummary(createState());
    const offers = generateTransferOffers(createState(), summary, () => 0);

    expect(offers.length).toBeGreaterThan(0);
    expect(offers.length).toBeLessThanOrEqual(3);
  });

  it("never includes the player's current club", () => {
    const summary = createSeasonSummary(createState());
    const offers = generateTransferOffers(createState(), summary, () => 0);

    offers.forEach((offer) => {
      expect(offer.clubId).not.toBe(CLUB.id);
    });
  });
});

describe("createSeasonTransition", () => {
  it("bundles a summary, contract offer and transfer offers", () => {
    const transition = createSeasonTransition(createState(), () => 0);

    expect(transition.summary.season).toBe(2026);
    expect(transition.contractOffer.clubId).toBe(CLUB.id);
    expect(Array.isArray(transition.transferOffers)).toBe(true);
  });
});

describe("sanitizeSeasonTransition", () => {
  it("passes through a well-formed transition", () => {
    const transition = createSeasonTransition(createState(), () => 0);
    expect(sanitizeSeasonTransition(transition)).toEqual(transition);
  });

  it("returns null for missing or malformed input", () => {
    expect(sanitizeSeasonTransition(null)).toBeNull();
    expect(sanitizeSeasonTransition({})).toBeNull();
    expect(sanitizeSeasonTransition({ summary: {} })).toBeNull();
  });

  it("drops invalid transfer offers but keeps the rest intact", () => {
    const transition = createSeasonTransition(createState(), () => 0);
    const corrupted = {
      ...transition,
      transferOffers: [
        ...transition.transferOffers,
        { clubId: "broken", weeklySalary: Number.NaN },
      ],
    };

    const sanitized = sanitizeSeasonTransition(corrupted);
    expect(sanitized).not.toBeNull();
    expect(sanitized?.transferOffers).toEqual(transition.transferOffers);
  });
});

describe("applySeasonTransitionChoice", () => {
  const transition: SeasonTransition = {
    summary: createSeasonSummary(createState()),
    contractOffer: {
      clubId: CLUB.id,
      clubName: CLUB.name,
      weeklySalary: 6_000,
      durationYears: 2,
      raisePercentage: 20,
    },
    transferOffers: [
      {
        clubId: "club-other",
        clubName: "FC Other",
        division: "premier_league",
        reputation: 85,
        transferFee: 5_000_000,
        weeklySalary: 12_000,
      },
    ],
  };

  it("renews the contract with the offered salary", () => {
    const result = applySeasonTransitionChoice(PLAYER, CLUB, transition, {
      type: "renew-contract",
    });

    expect(result.player.weeklySalary).toBe(6_000);
    expect(result.club).toEqual(CLUB);
    expect(result.logEntry.type).toBe("contract");
  });

  it("moves the player to the accepted club", () => {
    const result = applySeasonTransitionChoice(PLAYER, CLUB, transition, {
      type: "accept-transfer",
      clubId: "club-other",
    });

    expect(result.club.id).toBe("club-other");
    expect(result.club.name).toBe("FC Other");
    expect(result.player.clubId).toBe("club-other");
    expect(result.player.weeklySalary).toBe(12_000);
    expect(result.logEntry.type).toBe("transfer");
  });

  it("leaves everything untouched for an unknown transfer offer", () => {
    const result = applySeasonTransitionChoice(PLAYER, CLUB, transition, {
      type: "accept-transfer",
      clubId: "does-not-exist",
    });

    expect(result.player).toEqual(PLAYER);
    expect(result.club).toEqual(CLUB);
    expect(result.logEntry.type).toBe("system");
  });

  it("keeps the status quo when rejecting every offer", () => {
    const result = applySeasonTransitionChoice(PLAYER, CLUB, transition, {
      type: "reject-all",
    });

    expect(result.player).toEqual(PLAYER);
    expect(result.club).toEqual(CLUB);
    expect(result.logEntry.type).toBe("system");
  });
});
