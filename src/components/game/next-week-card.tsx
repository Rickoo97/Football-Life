"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PlayCircle } from "lucide-react";

import { ClubCrest } from "@/components/game/club-crest";
import { MatchReportDialog } from "@/components/game/match-report-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  const [isSimulating, setIsSimulating] = useState(false);

  const fixture = createFixture(club, season, currentWeek);
  const opponentName =
    fixture.playerSide === "home" ? fixture.awayTeam.name : fixture.homeTeam.name;
  const opponentId =
    fixture.playerSide === "home" ? fixture.awayTeam.id : fixture.homeTeam.id;

  const handlePlay = () => {
    setIsSimulating(true);
    // A brief, deliberate pause turns an instant simulation into a small
    // moment of anticipation before the match report reveals itself.
    window.setTimeout(() => {
      setReport(playNextWeek());
      setDialogOpen(true);
      setIsSimulating(false);
    }, 450);
  };

  return (
    <>
      <Card className="border-white/10 bg-white/5 py-0 text-slate-100 shadow-xl shadow-black/20 backdrop-blur-xl">
        <CardHeader className="pt-5">
          <p className="text-base font-bold text-white">
            Wedstrijd van week {currentWeek}
          </p>
          <p className="text-sm text-slate-400">
            {fixture.playerSide === "home" ? "Thuis tegen" : "Uit tegen"}{" "}
            {opponentName}
          </p>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 pb-5">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex min-w-0 items-center gap-2">
              <ClubCrest id={club.id} name={club.name} size="sm" />
              <p className="truncate text-sm font-medium text-slate-100">
                {fixture.homeTeam.name}
              </p>
              <span className="text-xs text-slate-500">—</span>
              <p className="truncate text-sm font-medium text-slate-100">
                {fixture.awayTeam.name}
              </p>
              <ClubCrest id={opponentId} name={opponentName} size="sm" />
            </div>
            <Badge
              variant={fixture.playerSide === "home" ? "default" : "secondary"}
              className={
                fixture.playerSide === "home"
                  ? "bg-emerald-500 text-emerald-950"
                  : "bg-white/10 text-slate-200"
              }
            >
              {fixture.playerSide === "home" ? "Thuis" : "Uit"}
            </Badge>
          </div>

          <p className="text-xs text-slate-400">
            {actionPoints > 0
              ? `Je hebt nog ${actionPoints} actiepunt(en) over.`
              : "Alle actiepunten zijn besteed."}
          </p>

          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              size="lg"
              className="w-full bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
              onClick={handlePlay}
              disabled={isSimulating}
            >
              <motion.span
                animate={isSimulating ? { rotate: 360 } : { rotate: 0 }}
                transition={
                  isSimulating
                    ? { repeat: Infinity, duration: 0.8, ease: "linear" }
                    : { duration: 0 }
                }
                className="flex items-center"
              >
                <PlayCircle className="size-4" />
              </motion.span>
              {isSimulating
                ? "Wedstrijd wordt gespeeld…"
                : "Volgende week / Speel wedstrijd"}
            </Button>
          </motion.div>
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
