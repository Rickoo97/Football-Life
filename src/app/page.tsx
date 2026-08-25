"use client";

import { AttributeBar } from "@/components/game/attribute-bar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useGameStore } from "@/store/game-store";

const DIVISION_LABELS: Record<string, string> = {
  eredivisie: "Eredivisie",
  eerste_divisie: "Eerste Divisie",
  premier_league: "Premier League",
  championship: "Championship",
  la_liga: "La Liga",
  serie_a: "Serie A",
  bundesliga: "Bundesliga",
};

const EVENT_TYPE_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  match: "default",
  training: "secondary",
  injury: "destructive",
  transfer: "default",
  media: "outline",
  contract: "secondary",
  system: "outline",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(isoDate: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(isoDate));
}

export default function Home() {
  const player = useGameStore((state) => state.player);
  const club = useGameStore((state) => state.club);
  const currentWeek = useGameStore((state) => state.currentWeek);
  const currentDate = useGameStore((state) => state.currentDate);
  const season = useGameStore((state) => state.season);
  const actionPoints = useGameStore((state) => state.actionPoints);
  const maxActionPointsPerWeek = useGameStore(
    (state) => state.maxActionPointsPerWeek
  );
  const eventLog = useGameStore((state) => state.eventLog);
  const advanceWeek = useGameStore((state) => state.advanceWeek);
  const spendActionPoints = useGameStore((state) => state.spendActionPoints);
  const logEvent = useGameStore((state) => state.logEvent);
  const resetGame = useGameStore((state) => state.resetGame);

  const handleTrain = () => {
    const spent = spendActionPoints(1);
    if (spent) {
      logEvent({
        type: "training",
        title: "Extra training",
        description: `${player.name} heeft een extra trainingssessie afgerond.`,
      });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium text-muted-foreground">
          Seizoen {season}/{season + 1} · Week {currentWeek} ·{" "}
          {formatDate(currentDate)}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Football Life Sim
        </h1>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-start gap-4">
              <Avatar className="size-14">
                <AvatarFallback className="text-base font-semibold">
                  {player.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <CardTitle className="text-lg">{player.name}</CardTitle>
                <CardDescription>
                  {player.position} · {player.age} jaar ·{" "}
                  {DIVISION_LABELS[club.division] ?? club.division}
                </CardDescription>
                <div className="flex gap-2 pt-1">
                  <Badge variant="secondary">
                    Marktwaarde {formatCurrency(player.marketValue)}
                  </Badge>
                  <Badge variant="outline">
                    {formatCurrency(player.weeklySalary)} / week
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <AttributeBar label="Energie" value={player.energy} />
              <AttributeBar label="Moraal" value={player.morale} />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <AttributeBar label="Schieten" value={player.attributes.shooting} />
              <AttributeBar label="Passing" value={player.attributes.passing} />
              <AttributeBar label="Fysiek" value={player.attributes.physical} />
              <AttributeBar label="Tempo" value={player.attributes.pace} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{club.name}</CardTitle>
            <CardDescription>
              {DIVISION_LABELS[club.division] ?? club.division}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <AttributeBar label="Reputatie" value={club.reputation} />
            <AttributeBar
              label="Relatie trainer"
              value={club.trainerRelationship}
            />
            <Separator />
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Actiepunten deze week
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {actionPoints}
                <span className="text-base font-normal text-muted-foreground">
                  {" "}
                  / {maxActionPointsPerWeek}
                </span>
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={handleTrain} disabled={actionPoints < 1}>
                Extra training (1 AP)
              </Button>
              <Button variant="outline" onClick={advanceWeek}>
                Volgende week
              </Button>
              <Button variant="ghost" onClick={resetGame}>
                Reset save
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logboek</CardTitle>
          <CardDescription>
            Overzicht van gebeurtenissen in je carrière.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3">
            {[...eventLog].reverse().map((event) => (
              <li
                key={event.id}
                className="flex flex-col gap-1 rounded-lg border p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{event.title}</span>
                  <Badge variant={EVENT_TYPE_VARIANT[event.type] ?? "outline"}>
                    {event.type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {event.description}
                </p>
                <span className="text-xs text-muted-foreground">
                  Week {event.week} · {formatDate(event.date)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
