import { describe, expect, it } from "vitest";
import leaguesData from "@/data/leagues.json";
import type { LeaguesData } from "@/types/league";

describe("leagues.json data structure", () => {
  const data = leaguesData as LeaguesData;

  it("contains exactly 6 leagues (Dutch + Top 5 European leagues)", () => {
    expect(data.leagues).toBeDefined();
    expect(data.leagues).toHaveLength(6);

    const leagueIds = data.leagues.map((l) => l.id);
    expect(leagueIds).toContain("eredivisie");
    expect(leagueIds).toContain("premier_league");
    expect(leagueIds).toContain("la_liga");
    expect(leagueIds).toContain("bundesliga");
    expect(leagueIds).toContain("serie_a");
    expect(leagueIds).toContain("ligue_1");
  });

  it("every league has 18 or 20 clubs", () => {
    data.leagues.forEach((league) => {
      expect([18, 20]).toContain(league.clubs.length);
    });
  });

  it("all clubs have valid properties and realistic rating ranges", () => {
    const clubIds = new Set<string>();

    data.leagues.forEach((league) => {
      expect(league.name).toBeTruthy();
      expect(league.country).toBeTruthy();
      expect(league.tier).toBe(1);

      league.clubs.forEach((club) => {
        // Unique ID check
        expect(clubIds.has(club.id)).toBe(false);
        clubIds.add(club.id);

        expect(club.id).toBeTruthy();
        expect(club.name).toBeTruthy();
        expect(club.country).toBeTruthy();

        // Numeric bounds check (1-100)
        expect(club.reputation).toBeGreaterThanOrEqual(1);
        expect(club.reputation).toBeLessThanOrEqual(100);

        expect(club.squadStrength).toBeGreaterThanOrEqual(1);
        expect(club.squadStrength).toBeLessThanOrEqual(100);

        expect(club.baseBudget).toBeGreaterThan(0);
      });
    });
  });

  it("has top clubs dominating with high reputation and squad strength", () => {
    const premierLeague = data.leagues.find((l) => l.id === "premier_league");
    const laLiga = data.leagues.find((l) => l.id === "la_liga");
    const bundesliga = data.leagues.find((l) => l.id === "bundesliga");
    const eredivisie = data.leagues.find((l) => l.id === "eredivisie");

    const manCity = premierLeague?.clubs.find((c) => c.id === "en-manchester-blue");
    const realMadrid = laLiga?.clubs.find((c) => c.id === "es-madrid-royals");
    const bayern = bundesliga?.clubs.find((c) => c.id === "de-bavaria-munich");
    const ajax = eredivisie?.clubs.find((c) => c.id === "nl-amsterdam-boys");

    expect(manCity?.reputation).toBeGreaterThanOrEqual(90);
    expect(manCity?.squadStrength).toBeGreaterThanOrEqual(90);

    expect(realMadrid?.reputation).toBeGreaterThanOrEqual(95);
    expect(realMadrid?.squadStrength).toBeGreaterThanOrEqual(94);

    expect(bayern?.reputation).toBeGreaterThanOrEqual(94);
    expect(bayern?.squadStrength).toBeGreaterThanOrEqual(93);

    expect(ajax?.reputation).toBeGreaterThanOrEqual(80);
    expect(ajax?.name).toBe("Amsterdam Boys");
  });
});
