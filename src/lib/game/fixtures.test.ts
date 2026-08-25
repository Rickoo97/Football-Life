import { describe, expect, it } from "vitest";

import {
  clubToMatchTeam,
  createFixture,
  deriveTeamRatings,
  getOpponentForWeek,
} from "./fixtures";
import type { Club } from "@/types/game";

const CLUB: Club = {
  id: "club-test",
  name: "FC Test",
  division: "eredivisie",
  reputation: 62,
  trainerRelationship: 55,
};

describe("fixtures", () => {
  it("derives ratings that stay inside the engine's 1-99 range", () => {
    [0, 50, 100].forEach((reputation) => {
      const ratings = deriveTeamRatings(reputation);

      Object.values(ratings).forEach((rating) => {
        expect(rating).toBeGreaterThanOrEqual(1);
        expect(rating).toBeLessThanOrEqual(99);
      });
    });
  });

  it("scales ratings with club reputation", () => {
    const weak = deriveTeamRatings(40);
    const strong = deriveTeamRatings(80);

    expect(strong.attack).toBeGreaterThan(weak.attack);
    expect(strong.defense).toBeGreaterThan(weak.defense);
  });

  it("maps a club onto a match team", () => {
    const team = clubToMatchTeam(CLUB);

    expect(team.id).toBe(CLUB.id);
    expect(team.name).toBe(CLUB.name);
    expect(team.ratings.attack).toBeGreaterThan(0);
  });

  it("alternates between home and away weeks", () => {
    expect(createFixture(CLUB, 2026, 1).playerSide).toBe("home");
    expect(createFixture(CLUB, 2026, 2).playerSide).toBe("away");
    expect(createFixture(CLUB, 2026, 3).playerSide).toBe("home");
  });

  it("always includes the player's club in the fixture", () => {
    for (let week = 1; week <= 10; week += 1) {
      const fixture = createFixture(CLUB, 2026, week);
      const teamNames = [fixture.homeTeam.name, fixture.awayTeam.name];

      expect(teamNames).toContain(CLUB.name);
      expect(fixture.homeTeam.name).not.toBe(fixture.awayTeam.name);
    }
  });

  it("returns a stable opponent and seed for the same week", () => {
    expect(getOpponentForWeek(2026, 5)).toEqual(getOpponentForWeek(2026, 5));
    expect(createFixture(CLUB, 2026, 5).seed).toBe(
      createFixture(CLUB, 2026, 5).seed
    );
  });

  it("varies the opponent across consecutive weeks", () => {
    const opponents = new Set(
      Array.from({ length: 8 }, (_, index) =>
        getOpponentForWeek(2026, index + 1).id
      )
    );

    expect(opponents.size).toBeGreaterThan(1);
  });
});
