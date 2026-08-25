"use client";

import { CalendarDays, Shield, Wallet, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DIVISION_LABELS,
  formatCompactCurrency,
  formatGameDate,
  formatSeason,
} from "@/lib/game/formatters";
import { useGameStore } from "@/store/game-store";

interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
}

function Stat({ icon, label, value, detail }: StatProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
        {detail ? (
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        ) : null}
      </div>
    </div>
  );
}

export function TopBar() {
  const currentWeek = useGameStore((state) => state.currentWeek);
  const currentDate = useGameStore((state) => state.currentDate);
  const season = useGameStore((state) => state.season);
  const actionPoints = useGameStore((state) => state.actionPoints);
  const maxActionPoints = useGameStore((state) => state.maxActionPointsPerWeek);
  const balance = useGameStore((state) => state.balance);
  const club = useGameStore((state) => state.club);

  return (
    <Card className="overflow-hidden py-0">
      <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        <Stat
          icon={<CalendarDays className="size-4" />}
          label="Kalender"
          value={`Week ${currentWeek}`}
          detail={`${formatGameDate(currentDate)} · Seizoen ${formatSeason(season)}`}
        />
        <Stat
          icon={<Zap className="size-4" />}
          label="Actiepunten"
          value={`${actionPoints} / ${maxActionPoints}`}
          detail={actionPoints === 0 ? "Week afronden" : "Beschikbaar deze week"}
        />
        <Stat
          icon={<Wallet className="size-4" />}
          label="Banksaldo"
          value={formatCompactCurrency(balance)}
          detail="Persoonlijk vermogen"
        />
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Shield className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Club</p>
            <p className="truncate text-sm font-semibold">{club.name}</p>
            <Badge variant="secondary" className="mt-0.5">
              {DIVISION_LABELS[club.division]}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
