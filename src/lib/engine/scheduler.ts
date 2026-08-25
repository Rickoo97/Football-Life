/**
 * Pure football-season scheduling logic.
 *
 * The scheduler has no browser, UI or store dependencies. All randomness is
 * injectable, making cup draws and European qualification deterministic in
 * tests or replayable from a seeded random number generator.
 */

export interface SchedulerTeam {
  id: string;
  name: string;
  reputation?: number;
  squadStrength?: number;
}

export interface SchedulerLeague {
  id: string;
  name: string;
  clubs: readonly SchedulerTeam[];
}

export type CompetitionKind =
  | "league"
  | "domestic-cup"
  | "champions-cup"
  | "euro-cup";

export type ParticipantSlot =
  | { type: "team"; team: SchedulerTeam }
  | { type: "winner"; fixtureId: string }
  | { type: "group-position"; group: string; position: 1 | 2 };

export interface ScheduledFixture {
  id: string;
  competitionId: string;
  competitionName: string;
  competitionKind: CompetitionKind;
  stage: string;
  round: number;
  leg: 1 | 2;
  home: ParticipantSlot;
  away: ParticipantSlot;
  group?: string;
}

export interface CompetitionRound {
  name: string;
  round: number;
  fixtures: ScheduledFixture[];
}

export interface RoundRobinSchedule {
  competitionId: string;
  competitionName: string;
  rounds: CompetitionRound[];
}

export interface KnockoutTournament {
  id: string;
  name: string;
  kind: "domestic-cup" | "euro-cup";
  rounds: CompetitionRound[];
}

export interface ChampionsCupTournament {
  id: "champions-cup";
  name: "Champions Cup";
  groups: Record<string, SchedulerTeam[]>;
  groupStageRounds: CompetitionRound[];
  knockoutRounds: CompetitionRound[];
}

export interface SeasonCalendarWeek {
  week: number;
  fixtures: ScheduledFixture[];
}

export interface SeasonCalendar {
  weeks: SeasonCalendarWeek[];
  leagues: RoundRobinSchedule[];
  domesticCups: KnockoutTournament[];
  championsCup: ChampionsCupTournament;
  euroCup: KnockoutTournament;
}

export interface GenerateSeasonCalendarOptions {
  random?: () => number;
  totalWeeks?: number;
}

const DEFAULT_SEASON_WEEKS = 45;
const GROUP_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

function assertUniqueTeams(teams: readonly SchedulerTeam[], context: string): void {
  const ids = new Set<string>();
  for (const team of teams) {
    if (!team.id || !team.name) {
      throw new Error(`${context}: every team requires a non-empty id and name.`);
    }
    if (ids.has(team.id)) {
      throw new Error(`${context}: duplicate team id "${team.id}".`);
    }
    ids.add(team.id);
  }
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function teamSlot(team: SchedulerTeam): ParticipantSlot {
  return { type: "team", team };
}

function winnerSlot(fixtureId: string): ParticipantSlot {
  return { type: "winner", fixtureId };
}

function fixtureId(
  competitionId: string,
  stage: string,
  round: number,
  match: number,
  leg: number
): string {
  const normalizedStage = stage.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${competitionId}-${normalizedStage}-r${round}-m${match}-l${leg}`;
}

function createFixture(
  details: Omit<ScheduledFixture, "id">,
  match: number
): ScheduledFixture {
  return {
    ...details,
    id: fixtureId(
      details.competitionId,
      details.stage,
      details.round,
      match,
      details.leg
    ),
  };
}

/**
 * Circle-method round robin.
 *
 * Supports even and odd team counts (an internal bye is inserted for odd
 * counts). The return contains two legs: the second half mirrors every first
 * half fixture with home and away reversed.
 */
export function generateRoundRobin(
  league: SchedulerLeague
): RoundRobinSchedule {
  const teams = [...league.clubs];
  if (teams.length < 2) {
    throw new Error(`${league.name}: at least two teams are required.`);
  }
  assertUniqueTeams(teams, league.name);

  type RotationEntry = SchedulerTeam | null;
  const rotation: RotationEntry[] =
    teams.length % 2 === 0 ? [...teams] : [...teams, null];
  const firstLegRoundCount = rotation.length - 1;
  const firstLeg: CompetitionRound[] = [];

  for (let roundIndex = 0; roundIndex < firstLegRoundCount; roundIndex += 1) {
    const fixtures: ScheduledFixture[] = [];

    for (let pairIndex = 0; pairIndex < rotation.length / 2; pairIndex += 1) {
      const left = rotation[pairIndex];
      const right = rotation[rotation.length - 1 - pairIndex];
      if (!left || !right) {
        continue;
      }

      // Alternating the first pairing avoids a permanent home advantage for
      // the fixed team in the circle algorithm.
      const reverse = pairIndex === 0 && roundIndex % 2 === 1;
      const home = reverse ? right : left;
      const away = reverse ? left : right;

      fixtures.push(
        createFixture(
          {
            competitionId: league.id,
            competitionName: league.name,
            competitionKind: "league",
            stage: "League",
            round: roundIndex + 1,
            leg: 1,
            home: teamSlot(home),
            away: teamSlot(away),
          },
          fixtures.length + 1
        )
      );
    }

    firstLeg.push({
      name: `Speelronde ${roundIndex + 1}`,
      round: roundIndex + 1,
      fixtures,
    });

    const fixed = rotation[0];
    const moving = rotation.slice(1);
    moving.unshift(moving.pop()!);
    rotation.splice(0, rotation.length, fixed, ...moving);
  }

  const secondLeg = firstLeg.map((sourceRound, index) => {
    const round = firstLegRoundCount + index + 1;
    return {
      name: `Speelronde ${round}`,
      round,
      fixtures: sourceRound.fixtures.map((source, matchIndex) =>
        createFixture(
          {
            competitionId: source.competitionId,
            competitionName: source.competitionName,
            competitionKind: "league",
            stage: "League",
            round,
            leg: 2,
            home: source.away,
            away: source.home,
          },
          matchIndex + 1
        )
      ),
    };
  });

  return {
    competitionId: league.id,
    competitionName: league.name,
    rounds: [...firstLeg, ...secondLeg],
  };
}

function nextPowerOfTwo(value: number): number {
  let power = 1;
  while (power < value) {
    power *= 2;
  }
  return power;
}

function knockoutRoundName(remainingTeams: number): string {
  switch (remainingTeams) {
    case 32:
      return "Laatste 32";
    case 16:
      return "Laatste 16";
    case 8:
      return "Kwartfinales";
    case 4:
      return "Halve finales";
    case 2:
      return "Finale";
    default:
      return `Laatste ${remainingTeams}`;
  }
}

/**
 * Builds a single-elimination bracket. Non-power-of-two fields use a
 * preliminary round: enough teams play to reduce the field to the previous
 * power of two, while the other teams receive byes.
 */
export function generateDomesticCup(
  league: SchedulerLeague,
  random: () => number = Math.random
): KnockoutTournament {
  if (league.clubs.length < 2) {
    throw new Error(`${league.name} Cup: at least two teams are required.`);
  }
  assertUniqueTeams(league.clubs, `${league.name} Cup`);

  const competitionId = `${league.id}-cup`;
  const competitionName = `${league.name} Cup`;
  const teams = shuffled(league.clubs, random);
  const bracketSize = nextPowerOfTwo(teams.length);
  const targetAfterPreliminary = bracketSize / 2;
  const preliminaryMatchCount = teams.length - targetAfterPreliminary;
  const byeCount = teams.length - preliminaryMatchCount * 2;
  const rounds: CompetitionRound[] = [];
  let entrants: ParticipantSlot[];
  let roundNumber = 1;

  if (preliminaryMatchCount > 0) {
    const byeTeams = teams.slice(0, byeCount);
    const preliminaryTeams = teams.slice(byeCount);
    const fixtures: ScheduledFixture[] = [];

    for (let index = 0; index < preliminaryTeams.length; index += 2) {
      fixtures.push(
        createFixture(
          {
            competitionId,
            competitionName,
            competitionKind: "domestic-cup",
            stage: "Voorronde",
            round: roundNumber,
            leg: 1,
            home: teamSlot(preliminaryTeams[index]),
            away: teamSlot(preliminaryTeams[index + 1]),
          },
          fixtures.length + 1
        )
      );
    }

    rounds.push({ name: "Voorronde", round: roundNumber, fixtures });
    entrants = [
      ...byeTeams.map(teamSlot),
      ...fixtures.map((fixture) => winnerSlot(fixture.id)),
    ];
    roundNumber += 1;
  } else {
    entrants = teams.map(teamSlot);
  }

  while (entrants.length > 1) {
    const name = knockoutRoundName(entrants.length);
    const fixtures: ScheduledFixture[] = [];

    for (let index = 0; index < entrants.length; index += 2) {
      fixtures.push(
        createFixture(
          {
            competitionId,
            competitionName,
            competitionKind: "domestic-cup",
            stage: name,
            round: roundNumber,
            leg: 1,
            home: entrants[index],
            away: entrants[index + 1],
          },
          fixtures.length + 1
        )
      );
    }

    rounds.push({ name, round: roundNumber, fixtures });
    entrants = fixtures.map((fixture) => winnerSlot(fixture.id));
    roundNumber += 1;
  }

  return {
    id: competitionId,
    name: competitionName,
    kind: "domestic-cup",
    rounds,
  };
}

function createGroupMatchdays(
  competitionId: string,
  competitionName: string,
  groups: Record<string, SchedulerTeam[]>
): CompetitionRound[] {
  const matchdays: CompetitionRound[] = Array.from({ length: 6 }, (_, index) => ({
    name: `Groepsfase speeldag ${index + 1}`,
    round: index + 1,
    fixtures: [],
  }));

  for (const [group, teams] of Object.entries(groups)) {
    const groupLeague: SchedulerLeague = {
      id: `${competitionId}-group-${group.toLowerCase()}`,
      name: `${competitionName} Groep ${group}`,
      clubs: teams,
    };
    const schedule = generateRoundRobin(groupLeague);

    schedule.rounds.forEach((sourceRound, roundIndex) => {
      sourceRound.fixtures.forEach((source) => {
        matchdays[roundIndex].fixtures.push(
          createFixture(
            {
              competitionId,
              competitionName,
              competitionKind: "champions-cup",
              stage: "Groepsfase",
              round: roundIndex + 1,
              leg: source.leg,
              home: source.home,
              away: source.away,
              group,
            },
            // Across eight groups, every matchday has 16 globally unique
            // match numbers.
            matchdays[roundIndex].fixtures.length + 1
          )
        );
      });
    });
  }

  return matchdays;
}

function createTwoLegRound(
  competitionId: string,
  competitionName: string,
  competitionKind: "champions-cup" | "euro-cup",
  name: string,
  round: number,
  pairings: Array<[ParticipantSlot, ParticipantSlot]>
): CompetitionRound[] {
  const firstLeg: ScheduledFixture[] = [];
  const secondLeg: ScheduledFixture[] = [];

  pairings.forEach(([first, second], index) => {
    firstLeg.push(
      createFixture(
        {
          competitionId,
          competitionName,
          competitionKind,
          stage: name,
          round,
          leg: 1,
          home: second,
          away: first,
        },
        index + 1
      )
    );
    secondLeg.push(
      createFixture(
        {
          competitionId,
          competitionName,
          competitionKind,
          stage: name,
          round,
          leg: 2,
          home: first,
          away: second,
        },
        index + 1
      )
    );
  });

  return [
    { name: `${name} - heen`, round, fixtures: firstLeg },
    { name: `${name} - terug`, round, fixtures: secondLeg },
  ];
}

function tieWinnerSlot(firstLegId: string, secondLegId: string): ParticipantSlot {
  return { type: "winner", fixtureId: `${firstLegId}+${secondLegId}` };
}

/**
 * Generates the Champions Cup: 32 teams, eight groups of four, six group
 * matchdays, then two-legged rounds from the last 16 through the semi-finals
 * and a single neutral-site final.
 */
export function generateChampionsCup(
  teams: readonly SchedulerTeam[],
  random: () => number = Math.random
): ChampionsCupTournament {
  if (teams.length !== 32) {
    throw new Error(`Champions Cup requires exactly 32 teams; received ${teams.length}.`);
  }
  assertUniqueTeams(teams, "Champions Cup");

  const drawnTeams = shuffled(teams, random);
  const groups: Record<string, SchedulerTeam[]> = {};
  GROUP_NAMES.forEach((name, index) => {
    groups[name] = drawnTeams.slice(index * 4, index * 4 + 4);
  });

  const groupStageRounds = createGroupMatchdays(
    "champions-cup",
    "Champions Cup",
    groups
  );

  // Group winners face a runner-up from the adjacent group. This guarantees
  // no same-group tie while keeping the complete bracket knowable up front.
  const last16Pairings: Array<[ParticipantSlot, ParticipantSlot]> =
    GROUP_NAMES.map((group, index) => [
      { type: "group-position", group, position: 1 },
      {
        type: "group-position",
        group: GROUP_NAMES[(index + 1) % GROUP_NAMES.length],
        position: 2,
      },
    ]);

  const last16 = createTwoLegRound(
    "champions-cup",
    "Champions Cup",
    "champions-cup",
    "Laatste 16",
    7,
    last16Pairings
  );
  let advancing = last16[0].fixtures.map((fixture, index) =>
    tieWinnerSlot(fixture.id, last16[1].fixtures[index].id)
  );

  const knockoutRounds: CompetitionRound[] = [...last16];
  const knockoutDefinitions = [
    { name: "Kwartfinales", round: 8 },
    { name: "Halve finales", round: 9 },
  ];

  for (const definition of knockoutDefinitions) {
    const pairings: Array<[ParticipantSlot, ParticipantSlot]> = [];
    for (let index = 0; index < advancing.length; index += 2) {
      pairings.push([advancing[index], advancing[index + 1]]);
    }
    const legs = createTwoLegRound(
      "champions-cup",
      "Champions Cup",
      "champions-cup",
      definition.name,
      definition.round,
      pairings
    );
    knockoutRounds.push(...legs);
    advancing = legs[0].fixtures.map((fixture, index) =>
      tieWinnerSlot(fixture.id, legs[1].fixtures[index].id)
    );
  }

  const finalFixture = createFixture(
    {
      competitionId: "champions-cup",
      competitionName: "Champions Cup",
      competitionKind: "champions-cup",
      stage: "Finale",
      round: 10,
      leg: 1,
      home: advancing[0],
      away: advancing[1],
    },
    1
  );
  knockoutRounds.push({ name: "Finale", round: 10, fixtures: [finalFixture] });

  return {
    id: "champions-cup",
    name: "Champions Cup",
    groups,
    groupStageRounds,
    knockoutRounds,
  };
}

/**
 * Generates the Euro Cup as a 32-team, pure knockout tournament. Rounds up to
 * and including the semi-finals are played over two legs; the final is a
 * single match.
 */
export function generateEuroCup(
  teams: readonly SchedulerTeam[],
  random: () => number = Math.random
): KnockoutTournament {
  if (teams.length !== 32) {
    throw new Error(`Euro Cup requires exactly 32 teams; received ${teams.length}.`);
  }
  assertUniqueTeams(teams, "Euro Cup");

  const competitionId = "euro-cup";
  const competitionName = "Euro Cup";
  let entrants = shuffled(teams, random).map(teamSlot);
  const rounds: CompetitionRound[] = [];
  let roundNumber = 1;

  while (entrants.length > 2) {
    const name = knockoutRoundName(entrants.length);
    const pairings: Array<[ParticipantSlot, ParticipantSlot]> = [];
    for (let index = 0; index < entrants.length; index += 2) {
      pairings.push([entrants[index], entrants[index + 1]]);
    }

    const legs = createTwoLegRound(
      competitionId,
      competitionName,
      "euro-cup",
      name,
      roundNumber,
      pairings
    );
    rounds.push(...legs);
    entrants = legs[0].fixtures.map((fixture, index) =>
      tieWinnerSlot(fixture.id, legs[1].fixtures[index].id)
    );
    roundNumber += 1;
  }

  rounds.push({
    name: "Finale",
    round: roundNumber,
    fixtures: [
      createFixture(
        {
          competitionId,
          competitionName,
          competitionKind: "euro-cup",
          stage: "Finale",
          round: roundNumber,
          leg: 1,
          home: entrants[0],
          away: entrants[1],
        },
        1
      ),
    ],
  });

  return {
    id: competitionId,
    name: competitionName,
    kind: "euro-cup",
    rounds,
  };
}

function teamScore(team: SchedulerTeam): number {
  return (team.reputation ?? team.squadStrength ?? 50) * 1000 +
    (team.squadStrength ?? team.reputation ?? 50);
}

/**
 * Interleaves league qualification places so every league contributes before
 * a second/third team from a stronger league is selected.
 */
function qualifyEuropeanTeams(
  leagues: readonly SchedulerLeague[],
  requiredTeams: number
): SchedulerTeam[] {
  const ranked = leagues.map((league) =>
    [...league.clubs].sort((a, b) => teamScore(b) - teamScore(a))
  );
  const qualified: SchedulerTeam[] = [];
  let position = 0;

  while (qualified.length < requiredTeams) {
    let addedThisPass = false;
    for (const leagueTeams of ranked) {
      const team = leagueTeams[position];
      if (team && qualified.length < requiredTeams) {
        qualified.push(team);
        addedThisPass = true;
      }
    }
    if (!addedThisPass) {
      break;
    }
    position += 1;
  }

  return qualified;
}

function addRoundToWeek(
  weeks: SeasonCalendarWeek[],
  weekNumber: number,
  round: CompetitionRound
): void {
  const week = weeks[weekNumber - 1];
  if (!week) {
    throw new Error(
      `Cannot schedule "${round.name}" in week ${weekNumber}: calendar is too short.`
    );
  }
  week.fixtures.push(...round.fixtures);
}

/**
 * Generates every competition and distributes the resulting fixtures over a
 * 45-week season. Domestic cup weeks are kept free of league fixtures;
 * European matches share selected league weeks (representing midweek games).
 */
export function generateSeasonCalendar(
  leagues: readonly SchedulerLeague[],
  options: GenerateSeasonCalendarOptions = {}
): SeasonCalendar {
  if (leagues.length === 0) {
    throw new Error("At least one league is required.");
  }

  const random = options.random ?? Math.random;
  const totalWeeks = options.totalWeeks ?? DEFAULT_SEASON_WEEKS;
  if (totalWeeks < DEFAULT_SEASON_WEEKS) {
    throw new Error(
      `A complete season requires at least ${DEFAULT_SEASON_WEEKS} calendar weeks.`
    );
  }

  const globalTeamIds = new Set<string>();
  for (const league of leagues) {
    assertUniqueTeams(league.clubs, league.name);
    for (const team of league.clubs) {
      if (globalTeamIds.has(team.id)) {
        throw new Error(`Team id "${team.id}" appears in more than one league.`);
      }
      globalTeamIds.add(team.id);
    }
  }

  if (globalTeamIds.size < 64) {
    throw new Error(
      `At least 64 unique clubs are required for both European tournaments; received ${globalTeamIds.size}.`
    );
  }

  const leagueSchedules = leagues.map(generateRoundRobin);
  const domesticCups = leagues.map((league) => generateDomesticCup(league, random));
  const qualified = qualifyEuropeanTeams(leagues, 64);
  const championsCup = generateChampionsCup(qualified.slice(0, 32), random);
  const euroCup = generateEuroCup(qualified.slice(32, 64), random);

  const weeks: SeasonCalendarWeek[] = Array.from(
    { length: totalWeeks },
    (_, index) => ({ week: index + 1, fixtures: [] })
  );

  // A 20-team cup needs five rounds (preliminary, R16, QF, SF, final).
  const domesticCupWeeks = [4, 11, 18, 25, 32];
  const leagueWeeks = Array.from({ length: totalWeeks }, (_, index) => index + 1)
    .filter((week) => !domesticCupWeeks.includes(week));

  leagueSchedules.forEach((schedule) => {
    schedule.rounds.forEach((round, index) => {
      addRoundToWeek(weeks, leagueWeeks[index], round);
    });
  });

  domesticCups.forEach((cup) => {
    cup.rounds.forEach((round, index) => {
      addRoundToWeek(weeks, domesticCupWeeks[index], round);
    });
  });

  const championsWeeks = [2, 5, 8, 14, 17, 20, 23, 27, 30, 34, 37, 40, 44];
  const championsRounds = [
    ...championsCup.groupStageRounds,
    ...championsCup.knockoutRounds,
  ];
  championsRounds.forEach((round, index) => {
    addRoundToWeek(weeks, championsWeeks[index], round);
  });

  const euroWeeks = [2, 5, 8, 14, 17, 20, 23, 27, 30];
  euroCup.rounds.forEach((round, index) => {
    addRoundToWeek(weeks, euroWeeks[index], round);
  });

  return {
    weeks,
    leagues: leagueSchedules,
    domesticCups,
    championsCup,
    euroCup,
  };
}
