"use client";

import { CalendarDays, Wallet, Zap } from "lucide-react";

import { ClubCrest } from "@/components/game/club-crest";
import { Badge } from "@/components/ui/badge";
import {
  DIVISION_LABELS,
  formatCompactCurrency,
  formatGameDate,
  formatSeason,
} from "@/lib/game/formatters";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";

interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
  accent?: string;
}

function Stat({ icon, label, value, detail, accent = "text-emerald-400" }: StatProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10",
          accent
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          {label}
        </p>
        <p className="truncate text-lg font-bold text-white tabular-nums">{value}</p>
        {detail ? (
          <p className="truncate text-xs text-slate-400">{detail}</p>
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
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl shadow-black/20 backdrop-blur-xl">
      <div className="grid divide-y divide-white/10 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x lg:divide-white/10">
        <Stat
          icon={<CalendarDays className="size-4" />}
          label="Kalender"
          value={`Week ${currentWeek}`}
          detail={`${formatGameDate(currentDate)} · Seizoen ${formatSeason(season)}`}
          accent="text-sky-400"
        />
        <Stat
          icon={<Zap className="size-4" />}
          label="Actiepunten"
          value={`${actionPoints} / ${maxActionPoints}`}
          detail={actionPoints === 0 ? "Week afronden" : "Beschikbaar deze week"}
          accent="text-amber-400"
        />
        <Stat
          icon={<Wallet className="size-4" />}
          label="Banksaldo"
          value={formatCompactCurrency(balance)}
          detail="Persoonlijk vermogen"
          accent="text-emerald-400"
        />
        <div className="flex items-center gap-3 px-4 py-3.5">
          <ClubCrest id={club.id} name={club.name} size="lg" />
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Club
            </p>
            <p className="truncate text-lg font-bold text-white">{club.name}</p>
            <Badge
              variant="secondary"
              className="mt-0.5 bg-white/10 text-slate-200 ring-1 ring-white/10"
            >
              {DIVISION_LABELS[club.division]}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
