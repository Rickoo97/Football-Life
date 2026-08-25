import { describe, expect, it } from "vitest";

import {
  generateChampionsCup,
  generateDomesticCup,
  generateEuroCup,
  generateRoundRobin,
  generateSeasonCalendar,
  type ParticipantSlot,
  type ScheduledFixture,
  type SchedulerLeague,
  type SchedulerTeam,
} from "./scheduler";

function createTeams(
  count: number,
  prefix = "team",
  reputationStart = 90
): SchedulerTeam[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    name: `${prefix.toUpperCase()} ${index + 1}`,
    reputation: Math.max(1, reputationStart - index),
    squadStrength: Math.max(1, reputationStart - index),
  }));
}

function createLeague(id: string, count: number): SchedulerLeague {
  return {
    id,
    name: `${id.toUpperCase()} League`,
    clubs: createTeams(count, id),
  };
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

function concreteTeam(slot: ParticipantSlot): SchedulerTeam {
  if (slot.type !== "team") {
    throw new Error("Expected a concrete team slot.");
  }
  return slot.team;
}

function allFixtureIds(fixtures: ScheduledFixture[]): string[] {
  return fixtures.map((fixture) => fixture.id);
}

describe("generateRoundRobin", () => {
  it("generates home and away fixtures for every pair", () => {
    const league = createLeague("test", 4);
    const schedule = generateRoundRobin(league);

    expect(schedule.rounds).toHaveLength(6);
    expect(schedule.rounds.flatMap((round) => round.fixtures)).toHaveLength(12);

    const pairings = new Map<string, Array<[string, string]>>();
    for (const fixture of schedule.rounds.flatMap((round) => round.fixtures)) {
      const home = concreteTeam(fixture.home).id;
      const away = concreteTeam(fixture.away).id;
      const pairKey = [home, away].sort().join(":");
      const matches = pairings.get(pairKey) ?? [];
      matches.push([home, away]);
      pairings.set(pairKey, matches);
    }

    expect(pairings.size).toBe(6);
    pairings.forEach((matches) => {
      expect(matches).toHaveLength(2);
      expect(matches[0][0]).toBe(matches[1][1]);
      expect(matches[0][1]).toBe(matches[1][0]);
    });
  });

  it("gives every team exactly one fixture per round for an even league", () => {
    const schedule = generateRoundRobin(createLeague("even", 20));

    expect(schedule.rounds).toHaveLength(38);
    schedule.rounds.forEach((round) => {
      expect(round.fixtures).toHaveLength(10);
      const participants = round.fixtures.flatMap((fixture) => [
        concreteTeam(fixture.home).id,
        concreteTeam(fixture.away).id,
      ]);
      expect(new Set(participants).size).toBe(20);
    });
  });

  it("supports odd league sizes by assigning one bye per round", () => {
    const schedule = generateRoundRobin(createLeague("odd", 5));

    expect(schedule.rounds).toHaveLength(10);
    schedule.rounds.forEach((round) => {
      expect(round.fixtures).toHaveLength(2);
    });
    expect(schedule.rounds.flatMap((round) => round.fixtures)).toHaveLength(20);
  });

  it("rejects duplicate team ids and leagues with fewer than two teams", () => {
    expect(() => generateRoundRobin(createLeague("tiny", 1))).toThrow(
      /at least two teams/
    );

    const duplicateLeague = createLeague("duplicate", 4);
    duplicateLeague.clubs[1].id = duplicateLeague.clubs[0].id;
    expect(() => generateRoundRobin(duplicateLeague)).toThrow(/duplicate team id/);
  });
});

describe("generateDomesticCup", () => {
  it("creates a pure knockout cup where N teams require N-1 fixtures", () => {
    for (const count of [18, 20, 32]) {
      const cup = generateDomesticCup(
        createLeague(`cup-${count}`, count),
        seededRandom(42)
      );
      const fixtures = cup.rounds.flatMap((round) => round.fixtures);
      expect(fixtures).toHaveLength(count - 1);
      expect(cup.rounds.at(-1)?.fixtures).toHaveLength(1);
      expect(cup.rounds.at(-1)?.name).toBe("Finale");
      fixtures.forEach((fixture) => {
        expect(fixture.leg).toBe(1);
        expect(fixture.competitionKind).toBe("domestic-cup");
      });
    }
  });

  it("uses a preliminary round and byes for an 18-team cup", () => {
    const cup = generateDomesticCup(
      createLeague("dutch", 18),
      seededRandom(7)
    );

    expect(cup.rounds).toHaveLength(5);
    expect(cup.rounds[0].name).toBe("Voorronde");
    expect(cup.rounds[0].fixtures).toHaveLength(2);
    expect(cup.rounds[1].name).toBe("Laatste 16");
    expect(cup.rounds[1].fixtures).toHaveLength(8);
  });

  it("draws reproducibly with an injected seeded random function", () => {
    const league = createLeague("repro", 20);
    const first = generateDomesticCup(league, seededRandom(123));
    const second = generateDomesticCup(league, seededRandom(123));

    expect(first).toEqual(second);
  });
});

describe("generateChampionsCup", () => {
  it("creates eight groups of four with six group matchdays", () => {
    const cup = generateChampionsCup(
      createTeams(32, "champions"),
      seededRandom(99)
    );

    expect(Object.keys(cup.groups)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
    ]);
    Object.values(cup.groups).forEach((group) => expect(group).toHaveLength(4));
    expect(cup.groupStageRounds).toHaveLength(6);
    cup.groupStageRounds.forEach((round) => {
      expect(round.fixtures).toHaveLength(16);
    });
    expect(cup.groupStageRounds.flatMap((round) => round.fixtures)).toHaveLength(
      96
    );
  });

  it("schedules every group pair home and away", () => {
    const cup = generateChampionsCup(
      createTeams(32, "groups"),
      seededRandom(3)
    );

    for (const groupName of Object.keys(cup.groups)) {
      const groupFixtures = cup.groupStageRounds
        .flatMap((round) => round.fixtures)
        .filter((fixture) => fixture.group === groupName);
      expect(groupFixtures).toHaveLength(12);

      const pairs = new Map<string, number>();
      groupFixtures.forEach((fixture) => {
        const pair = [
          concreteTeam(fixture.home).id,
          concreteTeam(fixture.away).id,
        ]
          .sort()
          .join(":");
        pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
      });
      expect(pairs.size).toBe(6);
      pairs.forEach((count) => expect(count).toBe(2));
    }
  });

  it("creates last 16, quarter-finals, semi-finals and a single final", () => {
    const cup = generateChampionsCup(
      createTeams(32, "knockout"),
      seededRandom(15)
    );

    expect(cup.knockoutRounds.map((round) => round.name)).toEqual([
      "Laatste 16 - heen",
      "Laatste 16 - terug",
      "Kwartfinales - heen",
      "Kwartfinales - terug",
      "Halve finales - heen",
      "Halve finales - terug",
      "Finale",
    ]);
    expect(cup.knockoutRounds.flatMap((round) => round.fixtures)).toHaveLength(29);
    expect(cup.knockoutRounds.at(-1)?.fixtures).toHaveLength(1);
  });

  it("creates globally unique fixture ids", () => {
    const cup = generateChampionsCup(
      createTeams(32, "ids"),
      seededRandom(21)
    );
    const fixtures = [
      ...cup.groupStageRounds,
      ...cup.knockoutRounds,
    ].flatMap((round) => round.fixtures);
    const ids = allFixtureIds(fixtures);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("requires exactly 32 unique teams", () => {
    expect(() => generateChampionsCup(createTeams(31))).toThrow(
      /exactly 32 teams/
    );

    const duplicated = createTeams(32);
    duplicated[1].id = duplicated[0].id;
    expect(() => generateChampionsCup(duplicated)).toThrow(/duplicate team id/);
  });
});

describe("generateEuroCup", () => {
  it("creates a 32-team two-legged knockout bracket with one final", () => {
    const cup = generateEuroCup(
      createTeams(32, "euro"),
      seededRandom(77)
    );

    expect(cup.rounds.map((round) => round.name)).toEqual([
      "Laatste 32 - heen",
      "Laatste 32 - terug",
      "Laatste 16 - heen",
      "Laatste 16 - terug",
      "Kwartfinales - heen",
      "Kwartfinales - terug",
      "Halve finales - heen",
      "Halve finales - terug",
      "Finale",
    ]);
    expect(cup.rounds.flatMap((round) => round.fixtures)).toHaveLength(61);
    expect(cup.rounds.at(-1)?.fixtures).toHaveLength(1);
    expect(cup.rounds.at(-1)?.fixtures[0].leg).toBe(1);
  });

  it("requires exactly 32 teams", () => {
    expect(() => generateEuroCup(createTeams(30))).toThrow(/exactly 32 teams/);
  });
});

describe("generateSeasonCalendar", () => {
  const leagues = [
    createLeague("netherlands", 18),
    createLeague("england", 20),
    createLeague("spain", 20),
    createLeague("germany", 18),
    createLeague("italy", 20),
    createLeague("france", 18),
  ];

  it("generates all competitions in a 45-week calendar", () => {
    const season = generateSeasonCalendar(leagues, {
      random: seededRandom(2026),
    });

    expect(season.weeks).toHaveLength(45);
    expect(season.weeks.map((week) => week.week)).toEqual(
      Array.from({ length: 45 }, (_, index) => index + 1)
    );
    expect(season.leagues).toHaveLength(6);
    expect(season.domesticCups).toHaveLength(6);
    expect(season.championsCup.name).toBe("Champions Cup");
    expect(season.euroCup.name).toBe("Euro Cup");
  });

  it("includes every generated fixture exactly once in the calendar", () => {
    const season = generateSeasonCalendar(leagues, {
      random: seededRandom(10),
    });

    const generatedFixtures = [
      ...season.leagues.flatMap((league) =>
        league.rounds.flatMap((round) => round.fixtures)
      ),
      ...season.domesticCups.flatMap((cup) =>
        cup.rounds.flatMap((round) => round.fixtures)
      ),
      ...season.championsCup.groupStageRounds.flatMap(
        (round) => round.fixtures
      ),
      ...season.championsCup.knockoutRounds.flatMap(
        (round) => round.fixtures
      ),
      ...season.euroCup.rounds.flatMap((round) => round.fixtures),
    ];
    const calendarFixtures = season.weeks.flatMap((week) => week.fixtures);

    expect(calendarFixtures).toHaveLength(generatedFixtures.length);
    expect(new Set(allFixtureIds(calendarFixtures)).size).toBe(
      calendarFixtures.length
    );
    expect(new Set(allFixtureIds(calendarFixtures))).toEqual(
      new Set(allFixtureIds(generatedFixtures))
    );
  });

  it("keeps domestic cup weeks free of league fixtures", () => {
    const season = generateSeasonCalendar(leagues, {
      random: seededRandom(12),
    });

    [4, 11, 18, 25, 32].forEach((weekNumber) => {
      const fixtures = season.weeks[weekNumber - 1].fixtures;
      expect(
        fixtures.some((fixture) => fixture.competitionKind === "domestic-cup")
      ).toBe(true);
      expect(
        fixtures.some((fixture) => fixture.competitionKind === "league")
      ).toBe(false);
    });
  });

  it("qualifies 32 distinct Champions Cup teams and 32 different Euro Cup teams", () => {
    const season = generateSeasonCalendar(leagues, {
      random: seededRandom(33),
    });

    const championsTeams = Object.values(season.championsCup.groups)
      .flat()
      .map((team) => team.id);
    const firstEuroRound = season.euroCup.rounds[0].fixtures;
    const euroTeams = firstEuroRound.flatMap((fixture) => [
      concreteTeam(fixture.home).id,
      concreteTeam(fixture.away).id,
    ]);

    expect(new Set(championsTeams).size).toBe(32);
    expect(new Set(euroTeams).size).toBe(32);
    championsTeams.forEach((id) => expect(euroTeams).not.toContain(id));
  });

  it("is fully reproducible when supplied the same random seed", () => {
    const first = generateSeasonCalendar(leagues, {
      random: seededRandom(5),
    });
    const second = generateSeasonCalendar(leagues, {
      random: seededRandom(5),
    });

    expect(first).toEqual(second);
  });

  it("rejects invalid inputs and calendars shorter than 45 weeks", () => {
    expect(() => generateSeasonCalendar([])).toThrow(/At least one league/);
    expect(() =>
      generateSeasonCalendar(leagues, { totalWeeks: 44 })
    ).toThrow(/at least 45/);
    expect(() =>
      generateSeasonCalendar([createLeague("small", 20)])
    ).toThrow(/At least 64 unique clubs/);
  });

  it("rejects a team id that appears in multiple leagues", () => {
    const duplicateLeagues = [
      createLeague("alpha", 40),
      createLeague("beta", 40),
    ];
    duplicateLeagues[1].clubs[0].id = duplicateLeagues[0].clubs[0].id;

    expect(() => generateSeasonCalendar(duplicateLeagues)).toThrow(
      /appears in more than one league/
    );
  });
});
