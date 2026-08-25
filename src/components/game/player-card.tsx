"use client";

import { ClubCrest } from "@/components/game/club-crest";
import { OverallRatingBadge } from "@/components/game/overall-rating-badge";
import { AttributeBar } from "@/components/game/attribute-bar";
import { AttributeRadar } from "@/components/game/attribute-radar";
import { StatBar } from "@/components/game/stat-bar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { findNationality } from "@/data/nationalities";
import { formatCompactCurrency, formatCurrency } from "@/lib/game/formatters";
import { computePlayerRating } from "@/lib/game/negotiation";
import { useGameStore } from "@/store/game-store";
import type { PlayerAttributes } from "@/types/game";

const ATTRIBUTE_ROWS: Array<{ key: keyof PlayerAttributes; label: string }> = [
  { key: "shooting", label: "Schieten" },
  { key: "passing", label: "Passing" },
  { key: "defending", label: "Verdedigen" },
  { key: "technique", label: "Techniek" },
  { key: "pace", label: "Tempo" },
  { key: "physical", label: "Fysiek" },
  { key: "stamina", label: "Conditie" },
];

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

/**
 * The hero "Player Card": name, position, nationality and club up top like
 * an Ultimate-Team card, colour-coded attribute bars below, and the
 * condition meters (energy/morale) at the bottom.
 */
export function PlayerCard() {
  const player = useGameStore((state) => state.player);
  const club = useGameStore((state) => state.club);
  const rating = computePlayerRating(player);
  const nationality = findNationality(player.nationality);

  return (
    <Card className="relative overflow-hidden border-white/10 bg-white/5 py-0 text-slate-100 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-emerald-400/10 blur-3xl" />

      <CardHeader className="relative gap-4 pt-6">
        <div className="flex items-start gap-4">
          <OverallRatingBadge rating={rating} position={player.position} />

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-3">
              <Avatar className="size-11 ring-2 ring-white/15">
                <AvatarFallback className="bg-white/10 text-sm font-bold text-white">
                  {getInitials(player.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold leading-tight text-white">
                  {player.name}
                </p>
                <p className="text-xs text-slate-400">{player.age} jaar</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/10">
                <span className="text-base leading-none" aria-hidden>
                  {nationality?.flag ?? "🏳️"}
                </span>
                {nationality?.label ?? player.nationality}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/10">
                <ClubCrest id={club.id} name={club.name} size="sm" />
                {club.name}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
              Weeksalaris
            </p>
            <p className="text-2xl font-extrabold tracking-tight text-white tabular-nums">
              {formatCurrency(player.weeklySalary)}
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
              Marktwaarde
            </p>
            <p className="text-2xl font-extrabold tracking-tight text-white tabular-nums">
              {formatCompactCurrency(player.marketValue)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative flex flex-col gap-5 pb-6">
        <AttributeRadar attributes={player.attributes} />

        <Separator className="bg-white/10" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ATTRIBUTE_ROWS.map(({ key, label }) => (
            <StatBar key={key} label={label} value={player.attributes[key]} />
          ))}
        </div>

        <Separator className="bg-white/10" />

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
