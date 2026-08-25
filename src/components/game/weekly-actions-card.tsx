"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/game/formatters";
import { WEEKLY_ACTIONS, type WeeklyActionId } from "@/lib/game/weekly-actions";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";

const ACTION_ICONS: Record<WeeklyActionId, LucideIcon> = {
  training: Target,
  rest: BedDouble,
  gym: Dumbbell,
  nightclub: Martini,
  agent: Briefcase,
};

const ACTION_ACCENTS: Record<WeeklyActionId, string> = {
  training: "bg-sky-500/15 text-sky-400 ring-sky-400/20",
  rest: "bg-emerald-500/15 text-emerald-400 ring-emerald-400/20",
  gym: "bg-orange-500/15 text-orange-400 ring-orange-400/20",
  nightclub: "bg-fuchsia-500/15 text-fuchsia-400 ring-fuchsia-400/20",
  agent: "bg-amber-500/15 text-amber-400 ring-amber-400/20",
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
    <Card className="border-white/10 bg-white/5 py-0 text-slate-100 shadow-xl shadow-black/20 backdrop-blur-xl">
      <CardHeader className="pt-5">
        <p className="text-base font-bold text-white">Weekplanning</p>
        <p className="text-sm text-slate-400">
          Besteed je actiepunten aan activiteiten voor deze week.
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 pb-5">
        {WEEKLY_ACTIONS.map((action) => {
          const Icon = ACTION_ICONS[action.id];
          const notEnoughPoints = actionPoints < action.actionPointCost;
          const notEnoughMoney = balance < action.moneyCost;
          const disabled = notEnoughPoints || notEnoughMoney;

          return (
            <div
              key={action.id}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06]"
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1",
                  ACTION_ACCENTS[action.id]
                )}
              >
                <Icon className="size-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {action.label}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-white/15 text-slate-300"
                  >
                    {action.actionPointCost} AP
                  </Badge>
                  {action.moneyCost > 0 ? (
                    <Badge className="bg-white/10 text-slate-200">
                      {formatCurrency(action.moneyCost)}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-slate-400">{action.description}</p>
              </div>

              <motion.div whileTap={disabled ? undefined : { scale: 0.92 }}>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/15"
                  disabled={disabled}
                  onClick={() => handleAction(action.id)}
                >
                  Doen
                </Button>
              </motion.div>
            </div>
          );
        })}

        <AnimatePresence mode="wait">
          {feedback ? (
            <motion.p
              key={feedback}
              aria-live="polite"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"
            >
              {feedback}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
