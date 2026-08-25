"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";

import { NewGameForm } from "@/components/onboarding/new-game-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getNationalityLabel } from "@/data/nationalities";
import { formatCurrency, formatSeason } from "@/lib/game/formatters";
import { useGameStore } from "@/store/game-store";

function ScreenSkeleton() {
  return <div className="h-[32rem] animate-pulse rounded-xl bg-muted" />;
}

/**
 * Landing screen of the game. Shows the "New Game" form, unless a career is
 * already stored — then the player first gets the choice to continue it.
 */
export function NewGameScreen() {
  const player = useGameStore((state) => state.player);
  const club = useGameStore((state) => state.club);
  const season = useGameStore((state) => state.season);
  const currentWeek = useGameStore((state) => state.currentWeek);
  const careerStarted = useGameStore((state) => state.careerStarted);
  const [startingOver, setStartingOver] = useState(false);

  const hydrated = useSyncExternalStore(
    (onStoreChange) => useGameStore.persist.onFinishHydration(onStoreChange),
    () => useGameStore.persist.hasHydrated(),
    () => false
  );

  useEffect(() => {
    void useGameStore.persist.rehydrate();
  }, []);

  if (!hydrated) {
    return <ScreenSkeleton />;
  }

  if (careerStarted && !startingOver) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Je hebt al een carrière lopen</CardTitle>
          <CardDescription>
            Ga verder waar je gebleven was, of begin helemaal opnieuw.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-lg font-semibold">{player.name}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{player.position}</Badge>
              <Badge variant="outline">
                {getNationalityLabel(player.nationality)}
              </Badge>
              <Badge variant="outline">{club.name}</Badge>
              <Badge variant="outline">
                Marktwaarde {formatCurrency(player.marketValue)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Seizoen {formatSeason(season)} · week {currentWeek}
            </p>
          </div>

          <Separator />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" className="sm:flex-1" render={<Link href="/dashboard" />}>
              Verder spelen
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="sm:flex-1"
              onClick={() => setStartingOver(true)}
            >
              Nieuwe carrière starten
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maak je speler</CardTitle>
        <CardDescription>
          Je startattributen worden bepaald door de positie die je kiest.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <NewGameForm />

        {careerStarted ? (
          <Button variant="ghost" size="sm" onClick={() => setStartingOver(false)}>
            Terug naar je huidige carrière
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
