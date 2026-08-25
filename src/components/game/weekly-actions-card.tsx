"use client";

import { useState } from "react";
import {
  BedDouble,
  Briefcase,
  Dumbbell,
  Martini,
  Target,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/game/formatters";
import { WEEKLY_ACTIONS, type WeeklyActionId } from "@/lib/game/weekly-actions";
import { useGameStore } from "@/store/game-store";

const ACTION_ICONS: Record<WeeklyActionId, LucideIcon> = {
  training: Target,
  rest: BedDouble,
  gym: Dumbbell,
  nightclub: Martini,
  agent: Briefcase,
};

export function WeeklyActionsCard() {
  const actionPoints = useGameStore((state) => state.actionPoints);
  const balance = useGameStore((state) => state.balance);
  const performWeeklyAction = useGameStore((state) => state.performWeeklyAction);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAction = (actionId: WeeklyActionId) => {
    const result = performWeeklyAction(actionId);
    setFeedback(
      result
        ? result.summary
        : "Niet genoeg actiepunten of geld voor deze activiteit."
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekplanning</CardTitle>
        <CardDescription>
          Besteed je actiepunten aan activiteiten voor deze week.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {WEEKLY_ACTIONS.map((action) => {
          const Icon = ACTION_ICONS[action.id];
          const notEnoughPoints = actionPoints < action.actionPointCost;
          const notEnoughMoney = balance < action.moneyCost;
          const disabled = notEnoughPoints || notEnoughMoney;

          return (
            <div
              key={action.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{action.label}</span>
                  <Badge variant="outline">{action.actionPointCost} AP</Badge>
                  {action.moneyCost > 0 ? (
                    <Badge variant="secondary">
                      {formatCurrency(action.moneyCost)}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {action.description}
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() => handleAction(action.id)}
              >
                Doen
              </Button>
            </div>
          );
        })}

        {feedback ? (
          <p
            aria-live="polite"
            className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground"
          >
            {feedback}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
