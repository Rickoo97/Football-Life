"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";

import { ClubCard } from "@/components/game/club-card";
import { EventLogCard } from "@/components/game/event-log-card";
import { NextWeekCard } from "@/components/game/next-week-card";
import { PlayerCard } from "@/components/game/player-card";
import { SeasonTransitionDialog } from "@/components/game/season-transition-dialog";
import { TopBar } from "@/components/game/top-bar";
import { WeeklyActionsCard } from "@/components/game/weekly-actions-card";
import { NegotiationModal } from "@/components/NegotiationModal";
import { useGameStore } from "@/store/game-store";

const CONTAINER_VARIANTS: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-20 animate-pulse rounded-2xl bg-white/5 ring-1 ring-white/10" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-96 animate-pulse rounded-2xl bg-white/5 ring-1 ring-white/10" />
        <div className="h-96 animate-pulse rounded-2xl bg-white/5 ring-1 ring-white/10" />
        <div className="h-96 animate-pulse rounded-2xl bg-white/5 ring-1 ring-white/10" />
      </div>
    </div>
  );
}

/**
 * The dashboard is styled as a "premium career mode" dark theme (deep
 * gradients, glassmorphism cards), which only makes sense once the player
 * has actually created a career. Toggling the `dark` class on `<html>` while
 * this component is mounted flips every shadcn primitive's color tokens —
 * including dialogs, which portal to `document.body` and would otherwise
 * escape a locally-scoped dark wrapper.
 */
function useDashboardDarkTheme() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    return () => root.classList.remove("dark");
  }, []);
}

export function GameDashboard() {
  const router = useRouter();
  const careerStarted = useGameStore((state) => state.careerStarted);
  useDashboardDarkTheme();

  const hydrated = useSyncExternalStore(
    (onStoreChange) => useGameStore.persist.onFinishHydration(onStoreChange),
    () => useGameStore.persist.hasHydrated(),
    () => false
  );

  useEffect(() => {
    void useGameStore.persist.rehydrate();
  }, []);

  // Without a created player the dashboard would show placeholder data, so
  // send anyone who lands here first through the onboarding flow.
  useEffect(() => {
    if (hydrated && !careerStarted) {
      router.replace("/");
    }
  }, [hydrated, careerStarted, router]);

  if (!hydrated || !careerStarted) {
    return <DashboardSkeleton />;
  }

  return (
    <motion.div
      className="flex flex-col gap-6"
      variants={CONTAINER_VARIANTS}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={ITEM_VARIANTS}>
        <TopBar />
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div variants={ITEM_VARIANTS}>
          <PlayerCard />
        </motion.div>
        <motion.div variants={ITEM_VARIANTS}>
          <WeeklyActionsCard />
        </motion.div>
        <motion.div variants={ITEM_VARIANTS} className="flex flex-col gap-6">
          <NextWeekCard />
          <ClubCard />
        </motion.div>
      </div>

      <motion.div variants={ITEM_VARIANTS}>
        <EventLogCard />
      </motion.div>

      <SeasonTransitionDialog />
      <NegotiationModal />
    </motion.div>
  );
}
