"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export type StatTier = "low" | "mid" | "high";

/** Red below 60, yellow 60-79, green 80+ — the thresholds used across every player/club rating. */
export function getStatTier(value: number): StatTier {
  if (value >= 80) return "high";
  if (value >= 60) return "mid";
  return "low";
}

const TIER_BAR_CLASS: Record<StatTier, string> = {
  low: "bg-gradient-to-r from-rose-500 to-red-500",
  mid: "bg-gradient-to-r from-amber-400 to-yellow-500",
  high: "bg-gradient-to-r from-emerald-400 to-green-500",
};

const TIER_TEXT_CLASS: Record<StatTier, string> = {
  low: "text-rose-400",
  mid: "text-amber-400",
  high: "text-emerald-400",
};

interface StatBarProps {
  label: string;
  value: number;
  max?: number;
  className?: string;
}

/**
 * Colour-coded, animated progress bar for 0-100 ratings (player attributes,
 * club reputation, etc.). Red below 60, yellow up to 80, green above that —
 * the same "premium career mode" language as EA FC / Football Manager.
 */
export function StatBar({ label, value, max = 100, className }: StatBarProps) {
  const tier = getStatTier(value);
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium tracking-wide text-slate-300 uppercase">
          {label}
        </span>
        <span className={cn("font-bold tabular-nums", TIER_TEXT_CLASS[tier])}>
          {Math.round(value)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className={cn("h-full rounded-full", TIER_BAR_CLASS[tier])}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
