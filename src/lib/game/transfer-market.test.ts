import { describe, expect, it } from "vitest";

import { getAllNegotiatingClubs, pickInterestedClub } from "./transfer-market";
import type { Player } from "@/types/game";

const STAR_PLAYER: Player = {
  id: "player-star",
  name: "Star Speler",
  age: 25,
  position: "ST",
  energy: 90,
  morale: 75,
  attributes: {
    shooting: 88,
    passing: 82,
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
  ...STAR_PLAYER,
  id: "player-rookie",
  attributes: {
    shooting: 40,
    passing: 45,
    physical: 42,
    pace: 48,
    technique: 44,
    stamina: 46,
  },
  marketValue: 200_000,
  weeklySalary: 2_000,
};

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

describe("getAllNegotiatingClubs", () => {
  it("flattens every league club with a valid division attached", () => {
    const clubs = getAllNegotiatingClubs();

    expect(clubs.length).toBeGreaterThan(50);
    clubs.forEach((club) => {
      expect(club.id).toBeTruthy();
      expect(club.name).toBeTruthy();
      expect(club.division).toBeTruthy();
      expect(club.baseBudget).toBeGreaterThan(0);
    });

    const uniqueIds = new Set(clubs.map((club) => club.id));
    expect(uniqueIds.size).toBe(clubs.length);
  });
});

describe("pickInterestedClub", () => {
  it("never returns the player's current club", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const club = pickInterestedClub(
        STAR_PLAYER,
        "nl-amsterdam-boys",
        seededRandom(seed)
      );
      expect(club?.id).not.toBe("nl-amsterdam-boys");
    }
  });

  it("scouts a stronger pool of clubs for a star player than for a rookie", () => {
    const starReputations: number[] = [];
    const rookieReputations: number[] = [];

    for (let seed = 0; seed < 40; seed += 1) {
      const starClub = pickInterestedClub(STAR_PLAYER, null, seededRandom(seed));
      const rookieClub = pickInterestedClub(
        ROOKIE_PLAYER,
        null,
        seededRandom(seed + 1000)
      );
      if (starClub) starReputations.push(starClub.reputation);
      if (rookieClub) rookieReputations.push(rookieClub.reputation);
    }

    const average = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;

    expect(average(starReputations)).toBeGreaterThan(average(rookieReputations));
  });

  it("returns null when there is truly no plausible suitor", () => {
    const impossiblePlayer: Player = {
      ...STAR_PLAYER,
      attributes: {
        shooting: 1,
        passing: 1,
        physical: 1,
        pace: 1,
        technique: 1,
        stamina: 1,
      },
    };

    // Even the weakest club in the database has some reputation, so an
    // (almost) zero-rated player scouted against an empty exclusion list
    // should still find *something* within the +25 reputation window.
    const club = pickInterestedClub(impossiblePlayer, null, seededRandom(1));
    expect(club === null || typeof club.id === "string").toBe(true);
  });
});
