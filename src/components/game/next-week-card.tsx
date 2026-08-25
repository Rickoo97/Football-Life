"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";

import { MatchReportDialog } from "@/components/game/match-report-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MatchReport } from "@/lib/engine/matchEngine";
import { createFixture } from "@/lib/game/fixtures";
import { useGameStore } from "@/store/game-store";

export function NextWeekCard() {
  const club = useGameStore((state) => state.club);
  const season = useGameStore((state) => state.season);
  const currentWeek = useGameStore((state) => state.currentWeek);
  const actionPoints = useGameStore((state) => state.actionPoints);
  const playNextWeek = useGameStore((state) => state.playNextWeek);

  const [report, setReport] = useState<MatchReport | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fixture = createFixture(club, season, currentWeek);
  const opponentName =
    fixture.playerSide === "home" ? fixture.awayTeam.name : fixture.homeTeam.name;

  const handlePlay = () => {
    setReport(playNextWeek());
    setDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Wedstrijd van week {currentWeek}</CardTitle>
          <CardDescription>
            {fixture.playerSide === "home" ? "Thuis tegen" : "Uit tegen"}{" "}
            {opponentName}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {fixture.homeTeam.name} — {fixture.awayTeam.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {actionPoints > 0
                  ? `Je hebt nog ${actionPoints} actiepunt(en) over.`
                  : "Alle actiepunten zijn besteed."}
              </p>
            </div>
            <Badge variant={fixture.playerSide === "home" ? "default" : "secondary"}>
              {fixture.playerSide === "home" ? "Thuis" : "Uit"}
            </Badge>
          </div>

          <Button size="lg" className="w-full" onClick={handlePlay}>
            <PlayCircle className="size-4" />
            Volgende week / Speel wedstrijd
          </Button>
        </CardContent>
      </Card>

      <MatchReportDialog
        report={report}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
