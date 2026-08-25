import { createSeededRandom } from "@/lib/random";
import type { PlayerAttributes, PlayerPosition } from "@/types/game";

export type MatchSide = "home" | "away";

export type MatchEventType =
  | "kickoff"
  | "chance"
  | "goal"
  | "yellow_card"
  | "substitution"
  | "full_time";

export interface TeamRatings {
  attack: number;
  midfield: number;
  defense: number;
  discipline: number;
  chemistry: number;
}

export interface MatchTeam {
  id: string;
  name: string;
  ratings: TeamRatings;
}

export interface PlayerMatchContext {
  name: string;
  side: MatchSide;
  position: PlayerPosition;
  attributes: PlayerAttributes;
  morale: number;
  energy: number;
}

export interface MatchSimulationOptions {
  seed?: number;
}

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  side: MatchSide | "neutral";
  description: string;
  isPlayerInvolved?: boolean;
}

export interface MatchScore {
  home: number;
  away: number;
}

export interface PlayerMatchSummary {
  matchRating: number;
  goals: number;
  assists: number;
  yellowCards: number;
  fatigueIncrease: number;
  startingEnergy: number;
  endingEnergy: number;
  impactScore: number;
}

export interface MatchReport {
  homeTeam: string;
  awayTeam: string;
  score: MatchScore;
  events: MatchEvent[];
  player: PlayerMatchSummary;
}

const MAX_SUBSTITUTIONS = 3;
const MATCH_MINUTES = 90;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizeRating(value: number): number {
  return clamp(value, 0, 100) / 100;
}

/**
 * How much of a position's contribution comes from attacking play (1) versus
 * defensive work (0). Shared with the contract valuation so both judge a
 * centre-back on the same terms.
 */
export function getPositionAttackWeight(position: PlayerPosition): number {
  switch (position) {
    case "GK":
      return 0.1;
    case "CB":
      return 0.28;
    case "LB":
    case "RB":
      return 0.42;
    case "CDM":
      return 0.48;
    case "CM":
      return 0.56;
    case "CAM":
      return 0.68;
    case "LM":
    case "RM":
      return 0.66;
    case "LW":
    case "RW":
      return 0.75;
    case "CF":
      return 0.78;
    case "ST":
      return 0.82;
    default:
      return 0.5;
  }
}

function getPositionFatigueWeight(position: PlayerPosition): number {
  switch (position) {
    case "GK":
      return 0.15;
    case "CB":
      return 0.2;
    case "LB":
    case "RB":
      return 0.3;
    case "CDM":
    case "CM":
      return 0.34;
    case "CAM":
      return 0.36;
    case "LM":
    case "RM":
    case "LW":
    case "RW":
      return 0.4;
    case "CF":
    case "ST":
      return 0.38;
    default:
      return 0.3;
  }
}

function computeImpactScore(player: PlayerMatchContext): number {
  const shooting = normalizeRating(player.attributes.shooting);
  const passing = normalizeRating(player.attributes.passing);
  const defending = normalizeRating(player.attributes.defending);
  const physical = normalizeRating(player.attributes.physical);
  const pace = normalizeRating(player.attributes.pace);
  const technique = normalizeRating(player.attributes.technique);
  const morale = normalizeRating(player.morale);
  const energy = normalizeRating(player.energy);

  const positionWeight = getPositionAttackWeight(player.position);
  // The further back a player lines up, the more of their contribution comes
  // from defensive work rather than from goals and assists.
  const defensiveShare = (1 - positionWeight) * 0.35;

  const attackingSkill =
    shooting * 0.28 +
    passing * 0.22 +
    technique * 0.2 +
    physical * 0.15 +
    pace * 0.15;
  const technical =
    attackingSkill * (1 - defensiveShare) + defending * defensiveShare;
  const condition = morale * 0.46 + energy * 0.54;

  return clamp(technical * 0.64 + condition * 0.36, 0, 1) * positionWeight;
}

function pickSideFromStrength(
  homeStrength: number,
  awayStrength: number,
  random: () => number
): MatchSide {
  const total = homeStrength + awayStrength;
  const homeEdge = total <= 0 ? 0.5 : homeStrength / total;
  return random() < homeEdge ? "home" : "away";
}

function createPlannedSubstitutions(random: () => number): number[] {
  const totalSubs = 1 + Math.floor(random() * MAX_SUBSTITUTIONS);
  const used = new Set<number>();

  while (used.size < totalSubs) {
    const minute = 58 + Math.floor(random() * 28);
    used.add(minute);
  }

  return [...used].sort((a, b) => a - b);
}

function ensureTeamRatings(team: MatchTeam): TeamRatings {
  return {
    attack: clamp(team.ratings.attack, 0, 100),
    midfield: clamp(team.ratings.midfield, 0, 100),
    defense: clamp(team.ratings.defense, 0, 100),
    discipline: clamp(team.ratings.discipline, 0, 100),
    chemistry: clamp(team.ratings.chemistry, 0, 100),
  };
}

function teamStrengthForAttack(team: TeamRatings): number {
  return (
    normalizeRating(team.attack) * 0.5 +
    normalizeRating(team.midfield) * 0.35 +
    normalizeRating(team.chemistry) * 0.15
  );
}

function teamResistance(team: TeamRatings): number {
  return (
    normalizeRating(team.defense) * 0.65 +
    normalizeRating(team.midfield) * 0.25 +
    normalizeRating(team.discipline) * 0.1
  );
}

export function simulateMatch(
  homeTeamInput: MatchTeam,
  awayTeamInput: MatchTeam,
  player: PlayerMatchContext,
  options: MatchSimulationOptions = {}
): MatchReport {
  const seed = options.seed ?? Date.now();
  const random = createSeededRandom(seed);

  const homeTeam = { ...homeTeamInput, ratings: ensureTeamRatings(homeTeamInput) };
  const awayTeam = { ...awayTeamInput, ratings: ensureTeamRatings(awayTeamInput) };

  const events: MatchEvent[] = [
    {
      minute: 0,
      type: "kickoff",
      side: "neutral",
      description: `Aftrap: ${homeTeam.name} tegen ${awayTeam.name}.`,
    },
  ];

  const score: MatchScore = { home: 0, away: 0 };
  const playerImpactScore = computeImpactScore(player);
  const shooting = normalizeRating(player.attributes.shooting);
  const passing = normalizeRating(player.attributes.passing);
  const physical = normalizeRating(player.attributes.physical);
  const stamina = normalizeRating(player.attributes.stamina);
  const attackPositionWeight = getPositionAttackWeight(player.position);

  const playerStats = {
    goals: 0,
    assists: 0,
    yellowCards: 0,
    chanceInvolvements: 0,
  };

  const homeSubMinutes = createPlannedSubstitutions(random);
  const awaySubMinutes = createPlannedSubstitutions(random);

  const homeAttack = teamStrengthForAttack(homeTeam.ratings) + 0.025;
  const awayAttack = teamStrengthForAttack(awayTeam.ratings);

  for (let minute = 1; minute <= MATCH_MINUTES; minute += 1) {
    if (homeSubMinutes.includes(minute)) {
      events.push({
        minute,
        type: "substitution",
        side: "home",
        description: `${homeTeam.name} voert een wissel door.`,
      });
    }

    if (awaySubMinutes.includes(minute)) {
      events.push({
        minute,
        type: "substitution",
        side: "away",
        description: `${awayTeam.name} voert een wissel door.`,
      });
    }

    const baseChanceProbability = 0.1 + Math.abs(homeAttack - awayAttack) * 0.06;
    if (random() < baseChanceProbability) {
      const attackingSide = pickSideFromStrength(homeAttack, awayAttack, random);
      const attackRatings =
        attackingSide === "home" ? homeTeam.ratings : awayTeam.ratings;
      const defenseRatings =
        attackingSide === "home" ? awayTeam.ratings : homeTeam.ratings;

      const attackScore = teamStrengthForAttack(attackRatings);
      const defenseScore = teamResistance(defenseRatings);
      let conversionProbability =
        0.07 + (attackScore - defenseScore) * 0.3 + random() * 0.06;

      let playerInvolved = false;
      if (attackingSide === player.side) {
        const involvementChance =
          0.18 + playerImpactScore * 0.5 + attackPositionWeight * 0.2;
        playerInvolved = random() < involvementChance;
        if (playerInvolved) {
          playerStats.chanceInvolvements += 1;
          conversionProbability += playerImpactScore * 0.08;
        }
      }

      conversionProbability = clamp(conversionProbability, 0.03, 0.52);

      if (random() < conversionProbability) {
        const defendingTeamName =
          attackingSide === "home" ? awayTeam.name : homeTeam.name;
        const scoringTeamName =
          attackingSide === "home" ? homeTeam.name : awayTeam.name;

        if (attackingSide === "home") {
          score.home += 1;
        } else {
          score.away += 1;
        }

        let goalDescription = `Doelpunt voor ${scoringTeamName} tegen ${defendingTeamName}.`;
        let isPlayerInvolved = false;

        if (playerInvolved) {
          const playerGoalChance = clamp(
            0.2 + shooting * 0.45 + attackPositionWeight * 0.25,
            0.1,
            0.88
          );
          if (random() < playerGoalChance) {
            playerStats.goals += 1;
            isPlayerInvolved = true;
            goalDescription = `Doelpunt! ${player.name} scoort voor ${scoringTeamName}.`;
          } else {
            const assistChance = clamp(0.22 + passing * 0.5, 0.1, 0.85);
            if (random() < assistChance) {
              playerStats.assists += 1;
              isPlayerInvolved = true;
              goalDescription = `Goal voor ${scoringTeamName} op assist van ${player.name}.`;
            }
          }
        }

        events.push({
          minute,
          type: "goal",
          side: attackingSide,
          description: goalDescription,
          isPlayerInvolved,
        });
      } else {
        const teamName = attackingSide === "home" ? homeTeam.name : awayTeam.name;
        const chanceDescription = playerInvolved
          ? `${player.name} creëert een kans voor ${teamName}, maar geen doelpunt.`
          : `Grote kans voor ${teamName}, maar de afwerking ontbreekt.`;
        events.push({
          minute,
          type: "chance",
          side: attackingSide,
          description: chanceDescription,
          isPlayerInvolved: playerInvolved || undefined,
        });
      }
    }

    const homeCardRisk = (1 - normalizeRating(homeTeam.ratings.discipline)) * 0.025;
    const awayCardRisk = (1 - normalizeRating(awayTeam.ratings.discipline)) * 0.025;

    if (random() < homeCardRisk) {
      const playerBooked = player.side === "home" && random() < 0.22;
      if (playerBooked) {
        playerStats.yellowCards += 1;
      }
      events.push({
        minute,
        type: "yellow_card",
        side: "home",
        description: playerBooked
          ? `Gele kaart voor ${player.name}.`
          : `Gele kaart voor ${homeTeam.name}.`,
        isPlayerInvolved: playerBooked || undefined,
      });
    }

    if (random() < awayCardRisk) {
      const playerBooked = player.side === "away" && random() < 0.22;
      if (playerBooked) {
        playerStats.yellowCards += 1;
      }
      events.push({
        minute,
        type: "yellow_card",
        side: "away",
        description: playerBooked
          ? `Gele kaart voor ${player.name}.`
          : `Gele kaart voor ${awayTeam.name}.`,
        isPlayerInvolved: playerBooked || undefined,
      });
    }
  }

  const positionFatigue = getPositionFatigueWeight(player.position);
  const baseFatigue = 17 + positionFatigue * 38;
  const involvementFatigue = playerStats.chanceInvolvements * 1.05;
  const disciplineFatigue = playerStats.yellowCards * 1.5;
  const lowEnergyPenalty = Math.max(0, 70 - player.energy) * 0.1;
  const physicalMitigation = physical * 3 + stamina * 9;

  const fatigueIncrease = clamp(
    roundToOneDecimal(
      baseFatigue +
        involvementFatigue +
        disciplineFatigue +
        lowEnergyPenalty -
        physicalMitigation
    ),
    8,
    45
  );

  const endingEnergy = clamp(player.energy - fatigueIncrease, 0, 100);

  const playerTeamGoals = player.side === "home" ? score.home : score.away;
  const opponentGoals = player.side === "home" ? score.away : score.home;
  const resultBonus =
    playerTeamGoals > opponentGoals ? 0.55 : playerTeamGoals < opponentGoals ? -0.4 : 0;

  const rawRating =
    6 +
    (playerImpactScore - 0.45) * 1.3 +
    playerStats.goals * 1.45 +
    playerStats.assists * 1.1 +
    playerStats.chanceInvolvements * 0.1 +
    resultBonus -
    playerStats.yellowCards * 0.6 -
    Math.max(0, 30 - endingEnergy) * 0.015;

  const matchRating = clamp(roundToOneDecimal(rawRating), 1, 10);

  events.push({
    minute: MATCH_MINUTES,
    type: "full_time",
    side: "neutral",
    description: `Einde wedstrijd: ${homeTeam.name} ${score.home}-${score.away} ${awayTeam.name}.`,
  });

  return {
    homeTeam: homeTeam.name,
    awayTeam: awayTeam.name,
    score,
    events,
    player: {
      matchRating,
      goals: playerStats.goals,
      assists: playerStats.assists,
      yellowCards: playerStats.yellowCards,
      fatigueIncrease,
      startingEnergy: clamp(player.energy, 0, 100),
      endingEnergy,
      impactScore: roundToOneDecimal(playerImpactScore * 10) / 10,
    },
  };
}
