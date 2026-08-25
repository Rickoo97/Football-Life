"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Handshake, RotateCcw } from "lucide-react";

import { ClubCrest } from "@/components/game/club-crest";
import { StatBar } from "@/components/game/stat-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DIVISION_LABELS } from "@/lib/game/formatters";
import { useGameStore } from "@/store/game-store";

export function ClubCard() {
  const club = useGameStore((state) => state.club);
  const activeNegotiation = useGameStore((state) => state.activeNegotiation);
  const startRandomNegotiation = useGameStore(
    (state) => state.startRandomNegotiation
  );
  const resetGame = useGameStore((state) => state.resetGame);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleScout = () => {
    const found = startRandomNegotiation();
    setFeedback(
      found
        ? null
        : "Geen enkele club toont momenteel interesse. Speel verder om je marktwaarde te verhogen."
    );
  };

  return (
    <Card className="border-white/10 bg-white/5 py-0 text-slate-100 shadow-xl shadow-black/20 backdrop-blur-xl">
      <CardHeader className="flex items-center gap-3 pt-5">
        <ClubCrest id={club.id} name={club.name} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-white">{club.name}</p>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            {DIVISION_LABELS[club.division]}
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 pb-5">
        <StatBar label="Clubreputatie" value={club.reputation} />
        <StatBar label="Relatie trainer" value={club.trainerRelationship} />

        <motion.div whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-white/15 bg-white/5 text-slate-100 hover:bg-white/10"
            onClick={handleScout}
            disabled={Boolean(activeNegotiation)}
          >
            <Handshake className="size-4" />
            Onderhandel met een geïnteresseerde club
          </Button>
        </motion.div>
        {feedback ? (
          <p aria-live="polite" className="text-xs text-slate-400">
            {feedback}
          </p>
        ) : null}

        <motion.div whileTap={{ scale: 0.98 }}>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-slate-400 hover:bg-white/5 hover:text-slate-100"
            onClick={resetGame}
          >
            <RotateCcw className="size-3.5" />
            Nieuwe carrière starten
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  );
}
