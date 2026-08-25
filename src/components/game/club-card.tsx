"use client";

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
  const resetGame = useGameStore((state) => state.resetGame);

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
        <Button variant="ghost" size="sm" onClick={resetGame}>
          Nieuwe carrière starten
        </Button>
      </CardContent>
    </Card>
  );
}
