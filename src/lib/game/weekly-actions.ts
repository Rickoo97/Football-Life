import type { GameEventType, Player, PlayerAttributes } from "@/types/game";

/** Identifier of a weekly activity the player can choose. */
export type WeeklyActionId =
  | "training"
  | "rest"
  | "gym"
  | "nightclub"
  | "agent";

export interface WeeklyAction {
  id: WeeklyActionId;
  label: string;
  description: string;
  /** Action points required to perform this activity. */
  actionPointCost: number;
  /** Money spent in euros when performing this activity. */
  moneyCost: number;
  /** Log category used when the activity is written to the event log. */
  eventType: GameEventType;
}

/** Everything an action changed, used to update state and inform the player. */
export interface WeeklyActionResult {
  energyDelta: number;
  moraleDelta: number;
  attributeDeltas: Partial<PlayerAttributes>;
  marketValueDelta: number;
  trainerRelationshipDelta: number;
  moneyCost: number;
  /** Human readable summary shown in the event log. */
  summary: string;
}

export const WEEKLY_ACTIONS: readonly WeeklyAction[] = [
  {
    id: "training",
    label: "Training",
    description:
      "Werk aan je positiespecifieke kwaliteiten. Kost energie, levert groei op.",
    actionPointCost: 1,
    moneyCost: 0,
    eventType: "training",
  },
  {
    id: "rest",
    label: "Rusten",
    description: "Volledige hersteldag. Herstelt flink wat energie.",
    actionPointCost: 1,
    moneyCost: 0,
    eventType: "system",
  },
  {
    id: "gym",
    label: "Extra gymsessie",
    description: "Krachttraining voor fysiek en conditie. Kost extra energie.",
    actionPointCost: 1,
    moneyCost: 150,
    eventType: "training",
  },
  {
    id: "nightclub",
    label: "Nachtclub bezoeken",
    description:
      "Even alles vergeten. Goed voor je moraal, slecht voor je energie en de trainer.",
    actionPointCost: 1,
    moneyCost: 800,
    eventType: "media",
  },
  {
    id: "agent",
    label: "Zaakwaarnemer spreken",
    description:
      "Bespreek je marktpositie en contractopties. Verhoogt je marktwaarde.",
    actionPointCost: 1,
    moneyCost: 1_500,
    eventType: "contract",
  },
] as const;

export function getWeeklyAction(id: WeeklyActionId): WeeklyAction {
  const action = WEEKLY_ACTIONS.find((item) => item.id === id);
  if (!action) {
    throw new Error(`Unknown weekly action: ${id}`);
  }
  return action;
}

/**
 * Training focuses on the attributes that matter most for the player's
 * position, so a striker sharpens finishing while a midfielder gains passing.
 */
function getTrainingFocus(player: Player): Partial<PlayerAttributes> {
  switch (player.position) {
    case "GK":
      return { defending: 1, physical: 1 };
    case "CB":
    case "LB":
    case "RB":
      return { defending: 1, physical: 1, pace: 1 };
    case "CDM":
      return { defending: 1, passing: 1 };
    case "CM":
      return { passing: 1, technique: 1 };
    case "CAM":
    case "LM":
    case "RM":
      return { passing: 1, technique: 1, shooting: 1 };
    case "LW":
    case "RW":
      return { pace: 1, technique: 1 };
    case "CF":
    case "ST":
      return { shooting: 1, technique: 1 };
    default:
      return { technique: 1 };
  }
}

const EMPTY_RESULT: Omit<WeeklyActionResult, "summary" | "moneyCost"> = {
  energyDelta: 0,
  moraleDelta: 0,
  attributeDeltas: {},
  marketValueDelta: 0,
  trainerRelationshipDelta: 0,
};

/**
 * Computes the effects of a weekly action for the given player. Pure: it only
 * describes the deltas, applying them is the store's responsibility.
 */
export function resolveWeeklyAction(
  actionId: WeeklyActionId,
  player: Player
): WeeklyActionResult {
  const action = getWeeklyAction(actionId);

  switch (actionId) {
    case "training": {
      const attributeDeltas = getTrainingFocus(player);
      const focusLabels = Object.keys(attributeDeltas).join(", ");
      return {
        ...EMPTY_RESULT,
        energyDelta: -8,
        moraleDelta: 2,
        attributeDeltas,
        marketValueDelta: Math.round(player.marketValue * 0.005),
        moneyCost: action.moneyCost,
        summary: `Scherpe trainingsweek. Progressie op ${focusLabels}.`,
      };
    }

    case "rest":
      return {
        ...EMPTY_RESULT,
        energyDelta: 20,
        moraleDelta: 3,
        moneyCost: action.moneyCost,
        summary: "Volledig uitgerust en klaar voor de volgende wedstrijd.",
      };

    case "gym":
      return {
        ...EMPTY_RESULT,
        energyDelta: -10,
        moraleDelta: 1,
        attributeDeltas: { physical: 1, stamina: 1 },
        marketValueDelta: Math.round(player.marketValue * 0.003),
        moneyCost: action.moneyCost,
        summary: "Zware gymsessie afgerond: fysiek en conditie verbeterd.",
      };

    case "nightclub":
      return {
        ...EMPTY_RESULT,
        energyDelta: -14,
        moraleDelta: 12,
        trainerRelationshipDelta: -4,
        moneyCost: action.moneyCost,
        summary:
          "Lange nacht in de club. Je moraal is top, de trainer is minder blij.",
      };

    case "agent":
      return {
        ...EMPTY_RESULT,
        energyDelta: -2,
        moraleDelta: 4,
        marketValueDelta: Math.round(player.marketValue * 0.02),
        moneyCost: action.moneyCost,
        summary:
          "Je zaakwaarnemer heeft je positie besproken: je marktwaarde stijgt.",
      };

    default: {
      const exhaustiveCheck: never = actionId;
      throw new Error(`Unhandled weekly action: ${exhaustiveCheck}`);
    }
  }
}
