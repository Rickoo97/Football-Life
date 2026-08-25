"use client";

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

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Wedstrijdverslag</DialogTitle>
          <DialogDescription>
            {report.homeTeam} {report.score.home}-{report.score.away}{" "}
            {report.awayTeam}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatBlock
            label="Cijfer"
            value={report.player.matchRating.toFixed(1)}
          />
          <StatBlock label="Goals" value={String(report.player.goals)} />
          <StatBlock label="Assists" value={String(report.player.assists)} />
          <StatBlock
            label="Vermoeidheid"
            value={`-${report.player.fatigueIncrease}`}
          />
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Hoogtepunten</p>
          <ScrollArea className="h-48 rounded-lg border">
            <ul className="flex flex-col gap-2 p-3">
              {highlights.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  Geen noemenswaardige momenten deze wedstrijd.
                </li>
              ) : (
                highlights.map((event, index) => (
                  <li
                    key={`${event.minute}-${index}`}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="w-10 shrink-0 text-xs tabular-nums text-muted-foreground">
                      {event.minute}&apos;
                    </span>
                    <Badge
                      variant={event.type === "goal" ? "default" : "outline"}
                      className="shrink-0"
                    >
                      {EVENT_LABELS[event.type]}
                    </Badge>
                    <span className="min-w-0">{event.description}</span>
                  </li>
                ))
              )}
            </ul>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Sluiten</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
