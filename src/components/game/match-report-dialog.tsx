"use client";

import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { MatchEventType, MatchReport } from "@/lib/engine/matchEngine";
import { cn } from "@/lib/utils";

const EVENT_LABELS: Record<MatchEventType, string> = {
  kickoff: "Aftrap",
  chance: "Kans",
  goal: "Goal",
  yellow_card: "Geel",
  substitution: "Wissel",
  full_time: "Einde",
};

interface MatchReportDialogProps {
  report: MatchReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatBlock({
  label,
  value,
  accent = "text-white",
  index = 0,
}: {
  label: string;
  value: string;
  accent?: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className="rounded-xl border border-white/10 bg-white/5 p-3 text-center"
    >
      <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
        {label}
      </p>
      <p className={cn("text-2xl font-extrabold tabular-nums", accent)}>{value}</p>
    </motion.div>
  );
}

export function MatchReportDialog({
  report,
  open,
  onOpenChange,
}: MatchReportDialogProps) {
  if (!report) {
    return null;
  }

  const highlights = report.events.filter(
    (event) => event.type === "goal" || event.isPlayerInvolved
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-slate-900/95 text-slate-100 backdrop-blur-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Wedstrijdverslag</DialogTitle>
          <DialogDescription className="text-slate-400">
            {report.homeTeam} {report.score.home}-{report.score.away}{" "}
            {report.awayTeam}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatBlock
            label="Cijfer"
            value={report.player.matchRating.toFixed(1)}
            accent={
              report.player.matchRating >= 7.5
                ? "text-emerald-400"
                : report.player.matchRating <= 5.5
                  ? "text-rose-400"
                  : "text-amber-400"
            }
            index={0}
          />
          <StatBlock
            label="Goals"
            value={String(report.player.goals)}
            index={1}
          />
          <StatBlock
            label="Assists"
            value={String(report.player.assists)}
            index={2}
          />
          <StatBlock
            label="Vermoeidheid"
            value={`-${report.player.fatigueIncrease}`}
            index={3}
          />
        </div>

        <Separator className="bg-white/10" />

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-white">Hoogtepunten</p>
          <ScrollArea className="h-48 rounded-xl border border-white/10 bg-black/10">
            <ul className="flex flex-col gap-2 p-3">
              {highlights.length === 0 ? (
                <li className="text-sm text-slate-400">
                  Geen noemenswaardige momenten deze wedstrijd.
                </li>
              ) : (
                highlights.map((event, index) => (
                  <li
                    key={`${event.minute}-${index}`}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="w-10 shrink-0 text-xs text-slate-500 tabular-nums">
                      {event.minute}&apos;
                    </span>
                    <Badge
                      variant={event.type === "goal" ? "default" : "outline"}
                      className={cn(
                        "shrink-0",
                        event.type === "goal"
                          ? "bg-emerald-500 text-emerald-950"
                          : "border-white/15 text-slate-300"
                      )}
                    >
                      {EVENT_LABELS[event.type]}
                    </Badge>
                    <span className="min-w-0 text-slate-300">
                      {event.description}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </ScrollArea>
        </div>

        <DialogFooter className="border-white/10 bg-transparent">
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
          >
            Sluiten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
