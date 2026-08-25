"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatGameDate } from "@/lib/game/formatters";
import { useGameStore } from "@/store/game-store";
import type { GameEventType } from "@/types/game";

const EVENT_TYPE_VARIANT: Record<
  GameEventType,
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

const EVENT_TYPE_LABEL: Record<GameEventType, string> = {
  match: "Wedstrijd",
  training: "Training",
  injury: "Blessure",
  transfer: "Transfer",
  media: "Media",
  contract: "Contract",
  system: "Systeem",
};

export function EventLogCard() {
  const eventLog = useGameStore((state) => state.eventLog);
  const entries = [...eventLog].reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logboek</CardTitle>
        <CardDescription>
          Alles wat er in je carrière gebeurt, nieuwste eerst.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-72 rounded-lg border">
          <ul className="flex flex-col gap-2 p-3">
            {entries.map((event) => (
              <li key={event.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-medium">
                    {event.title}
                  </span>
                  <Badge variant={EVENT_TYPE_VARIANT[event.type]}>
                    {EVENT_TYPE_LABEL[event.type]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {event.description}
                </p>
                <span className="text-xs text-muted-foreground">
                  Week {event.week} · {formatGameDate(event.date)}
                </span>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
