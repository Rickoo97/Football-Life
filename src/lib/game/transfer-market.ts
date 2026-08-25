import leaguesData from "@/data/leagues.json";
import { computePlayerRating } from "@/lib/game/negotiation";
import type { Division, Player } from "@/types/game";
import type { LeaguesData } from "@/types/league";
import type { NegotiatingClub } from "@/types/negotiation";

const typedLeaguesData = leaguesData as LeaguesData;

/**
 * Every league id in `leagues.json` must be a valid `Division`, otherwise a
 * scouted club couldn't ever be turned into a real `Club` on transfer. This
 * throws at import time (instead of silently producing bad data) so a future
 * edit to either file is caught immediately.
 */
function assertLeagueIdsAreDivisions(leagues: LeaguesData["leagues"]): void {
  const validDivisions: readonly Division[] = [
    "eredivisie",
    "eerste_divisie",
    "premier_league",
    "championship",
    "la_liga",
    "serie_a",
    "bundesliga",
    "ligue_1",
  ];

  for (const league of leagues) {
    if (!validDivisions.includes(league.id as Division)) {
      throw new Error(
        `leagues.json league id "${league.id}" is not a known Division.`
      );
    }
  }
}

assertLeagueIdsAreDivisions(typedLeaguesData.leagues);

/** Flattens every league's clubs into negotiation-ready clubs, division attached. */
export function getAllNegotiatingClubs(): NegotiatingClub[] {
  return typedLeaguesData.leagues.flatMap((league) =>
    league.clubs.map((club) => ({
      id: club.id,
      name: club.name,
      division: league.id as Division,
      country: club.country,
      reputation: club.reputation,
      squadStrength: club.squadStrength,
      baseBudget: club.baseBudget,
    }))
  );
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Picks a plausible interested club for the player: excludes their current
 * club and anything wildly out of reach (a reserve-league side won't chase a
 * star, and a super-club won't chase a squad player), then weights the
 * remaining candidates towards a closer reputation match.
 */
export function pickInterestedClub(
  player: Player,
  currentClubId: string | null,
  random: () => number = Math.random
): NegotiatingClub | null {
  const rating = computePlayerRating(player);
  const candidates = getAllNegotiatingClubs().filter(
    (club) =>
      club.id !== currentClubId &&
      club.reputation >= clampNumber(rating - 30, 1, 100) &&
      club.reputation <= clampNumber(rating + 25, 1, 100)
  );

  if (candidates.length === 0) {
    return null;
  }

  const weighted = candidates.map((club) => ({
    club,
    weight: 1 / (1 + Math.abs(club.reputation - rating)),
  }));
  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);

  let roll = random() * totalWeight;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.club;
    }
  }

  return weighted[weighted.length - 1].club;
}
