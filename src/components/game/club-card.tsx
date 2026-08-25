"use client";

import { useState } from "react";

import { AttributeBar } from "@/components/game/attribute-bar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle>{club.name}</CardTitle>
        <CardDescription>{DIVISION_LABELS[club.division]}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <AttributeBar label="Clubreputatie" value={club.reputation} />
        <AttributeBar
          label="Relatie trainer"
          value={club.trainerRelationship}
          tone={club.trainerRelationship < 35 ? "warning" : "default"}
        />

        <Button
          variant="outline"
          size="sm"
          onClick={handleScout}
          disabled={Boolean(activeNegotiation)}
        >
          Onderhandel met een geïnteresseerde club
        </Button>
        {feedback ? (
          <p aria-live="polite" className="text-xs text-muted-foreground">
            {feedback}
          </p>
        ) : null}

        <Button variant="ghost" size="sm" onClick={resetGame}>
          Nieuwe carrière starten
        </Button>
      </CardContent>
    </Card>
  );
}
