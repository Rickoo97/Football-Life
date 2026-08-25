"use client";

import { useEffect, useSyncExternalStore } from "react";

import { ClubCard } from "@/components/game/club-card";
import { EventLogCard } from "@/components/game/event-log-card";
import { NextWeekCard } from "@/components/game/next-week-card";
import { PlayerCard } from "@/components/game/player-card";
import { SeasonTransitionDialog } from "@/components/game/season-transition-dialog";
import { TopBar } from "@/components/game/top-bar";
import { WeeklyActionsCard } from "@/components/game/weekly-actions-card";
import { useGameStore } from "@/store/game-store";

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-20 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}

export function GameDashboard() {
  const hydrated = useSyncExternalStore(
    (onStoreChange) => useGameStore.persist.onFinishHydration(onStoreChange),
    () => useGameStore.persist.hasHydrated(),
    () => false
  );

  useEffect(() => {
    void useGameStore.persist.rehydrate();
  }, []);

  if (!hydrated) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      <TopBar />

      <div className="grid gap-6 lg:grid-cols-3">
        <PlayerCard />
        <WeeklyActionsCard />
        <div className="flex flex-col gap-6">
          <NextWeekCard />
          <ClubCard />
        </div>
      </div>

      <EventLogCard />
      <SeasonTransitionDialog />
    </div>
  );
}
