import type { MatchTeam, TeamRatings } from "@/lib/engine/matchEngine";
import type { Club } from "@/types/game";

export interface Fixture {
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  /** Which side the player's club plays on. */
  playerSide: "home" | "away";
  /** Deterministic seed so replaying the same fixture gives the same result. */
  seed: number;
}

interface OpponentBlueprint {
  id: string;
  name: string;
  /** Base strength (0-100) the ratings are derived from. */
  strength: number;
}

const OPPONENTS: readonly OpponentBlueprint[] = [
  { id: "club-amsterdam-united", name: "Amsterdam United", strength: 82 },
  { id: "club-rotterdam-fc", name: "Rotterdam FC", strength: 79 },
  { id: "club-sc-eindhoven", name: "SC Eindhoven", strength: 77 },
  { id: "club-fc-groningen-noord", name: "FC Groningen Noord", strength: 64 },
  { id: "club-vv-maasdal", name: "VV Maasdal", strength: 58 },
  { id: "club-sparta-delft", name: "Sparta Delft", strength: 61 },
  { id: "club-de-kust-boys", name: "De Kust Boys", strength: 55 },
  { id: "club-fc-veenland", name: "FC Veenland", strength: 52 },
] as const;

function clamp(value: number, min = 1, max = 99): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Derives concrete match ratings from a club's reputation so the engine can
 * work with any club in the save without storing a full squad.
 */
export function deriveTeamRatings(reputation: number): TeamRatings {
  return {
    attack: clamp(reputation + 3),
    midfield: clamp(reputation + 1),
    defense: clamp(reputation - 1),
    discipline: clamp(reputation - 4),
    chemistry: clamp(reputation - 2),
  };
}

export function clubToMatchTeam(club: Club): MatchTeam {
  return {
    id: club.id,
    name: club.name,
    ratings: deriveTeamRatings(club.reputation),
  };
}

export function getOpponentForWeek(season: number, week: number): MatchTeam {
  const blueprint = OPPONENTS[(season + week) % OPPONENTS.length];

  return {
    id: blueprint.id,
    name: blueprint.name,
    ratings: deriveTeamRatings(blueprint.strength),
  };
}

/**
 * Builds the fixture for a given week. The player's club alternates between
 * home and away so the schedule feels like a real competition.
 */
export function createFixture(
  club: Club,
  season: number,
  week: number
): Fixture {
  const playerTeam = clubToMatchTeam(club);
  const opponent = getOpponentForWeek(season, week);
  const playerSide = week % 2 === 1 ? "home" : "away";

  return {
    homeTeam: playerSide === "home" ? playerTeam : opponent,
    awayTeam: playerSide === "home" ? opponent : playerTeam,
    playerSide,
    seed: season * 1_000 + week,
  };
}
