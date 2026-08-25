import { describe, expect, it } from "vitest";

import {
  simulateMatch,
  type MatchTeam,
  type PlayerMatchContext,
} from "./matchEngine";

const HOME_TEAM: MatchTeam = {
  id: "home-01",
  name: "FC North",
  ratings: {
    attack: 72,
    midfield: 70,
    defense: 68,
    discipline: 74,
    chemistry: 71,
  },
};

const AWAY_TEAM: MatchTeam = {
  id: "away-01",
  name: "SV South",
  ratings: {
    attack: 69,
    midfield: 67,
    defense: 70,
    discipline: 69,
    chemistry: 66,
  },
};

const BASE_PLAYER: PlayerMatchContext = {
  name: "Sem de Vries",
  side: "home",
  position: "CAM",
  morale: 72,
  energy: 90,
  attributes: {
    shooting: 70,
    passing: 74,
    physical: 63,
    pace: 71,
  },
};

describe("simulateMatch", () => {
  it("produces deterministic output with the same seed", () => {
    const run1 = simulateMatch(HOME_TEAM, AWAY_TEAM, BASE_PLAYER, { seed: 1337 });
    const run2 = simulateMatch(HOME_TEAM, AWAY_TEAM, BASE_PLAYER, { seed: 1337 });

    expect(run1).toEqual(run2);
  });

  it("always returns a valid 90-minute report shape", () => {
    const report = simulateMatch(HOME_TEAM, AWAY_TEAM, BASE_PLAYER, { seed: 42 });

    expect(report.events.length).toBeGreaterThan(2);
    expect(report.events[0]).toMatchObject({ minute: 0, type: "kickoff" });
    expect(report.events.at(-1)).toMatchObject({ minute: 90, type: "full_time" });

    report.events.forEach((event) => {
      expect(event.minute).toBeGreaterThanOrEqual(0);
      expect(event.minute).toBeLessThanOrEqual(90);
      expect([
        "kickoff",
        "chance",
        "goal",
        "yellow_card",
        "substitution",
        "full_time",
      ]).toContain(event.type);
    });

    expect(report.player.matchRating).toBeGreaterThanOrEqual(1);
    expect(report.player.matchRating).toBeLessThanOrEqual(10);
    expect(report.player.fatigueIncrease).toBeGreaterThan(0);
    expect(report.player.endingEnergy).toBeLessThanOrEqual(
      report.player.startingEnergy
    );
    expect(report.score.home).toBeGreaterThanOrEqual(0);
    expect(report.score.away).toBeGreaterThanOrEqual(0);
  });

  it("gives stronger players more output over many seeded matches", () => {
    const elitePlayer: PlayerMatchContext = {
      ...BASE_PLAYER,
      attributes: {
        shooting: 92,
        passing: 90,
        physical: 84,
        pace: 90,
      },
      morale: 88,
      energy: 95,
    };

    const weakPlayer: PlayerMatchContext = {
      ...BASE_PLAYER,
      attributes: {
        shooting: 40,
        passing: 42,
        physical: 45,
        pace: 44,
      },
      morale: 45,
      energy: 50,
    };

    let eliteContribution = 0;
    let weakContribution = 0;

    for (let seed = 1; seed <= 60; seed += 1) {
      const elite = simulateMatch(HOME_TEAM, AWAY_TEAM, elitePlayer, { seed });
      const weak = simulateMatch(HOME_TEAM, AWAY_TEAM, weakPlayer, { seed });

      eliteContribution += elite.player.goals * 2 + elite.player.assists;
      weakContribution += weak.player.goals * 2 + weak.player.assists;
    }

    expect(eliteContribution).toBeGreaterThan(weakContribution);
  });

  it("increases fatigue more for low-energy players", () => {
    const fresh = simulateMatch(HOME_TEAM, AWAY_TEAM, BASE_PLAYER, { seed: 77 });
    const tired = simulateMatch(
      HOME_TEAM,
      AWAY_TEAM,
      {
        ...BASE_PLAYER,
        energy: 35,
      },
      { seed: 77 }
    );

    expect(tired.player.fatigueIncrease).toBeGreaterThan(fresh.player.fatigueIncrease);
    expect(tired.player.endingEnergy).toBeLessThan(fresh.player.endingEnergy);
  });
});
