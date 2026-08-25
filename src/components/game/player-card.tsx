"use client";

import { AttributeBar } from "@/components/game/attribute-bar";
import { AttributeRadar } from "@/components/game/attribute-radar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/game/formatters";
import { useGameStore } from "@/store/game-store";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function describeEnergy(energy: number): string {
  if (energy >= 80) return "Fit";
  if (energy >= 55) return "Redelijk";
  if (energy >= 30) return "Vermoeid";
  return "Uitgeput";
}

function describeMorale(morale: number): string {
  if (morale >= 80) return "Uitstekend";
  if (morale >= 55) return "Goed";
  if (morale >= 30) return "Matig";
  return "Slecht";
}

export function PlayerCard() {
  const player = useGameStore((state) => state.player);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="text-base font-semibold">
              {getInitials(player.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="text-lg">{player.name}</CardTitle>
            <CardDescription>
              {player.position} · {player.age} jaar
            </CardDescription>
            <div className="flex flex-wrap gap-2 pt-1">
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

      <CardContent className="flex flex-col gap-5">
        <AttributeRadar attributes={player.attributes} />

        <Separator />

        <div className="flex flex-col gap-3">
          <AttributeBar
            label="Energie"
            value={player.energy}
            tone={player.energy < 35 ? "warning" : "energy"}
            hint={describeEnergy(player.energy)}
          />
          <AttributeBar
            label="Moraal"
            value={player.morale}
            tone={player.morale < 35 ? "warning" : "morale"}
            hint={describeMorale(player.morale)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
