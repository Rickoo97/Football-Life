import { cn } from "@/lib/utils";

/** Ultimate-Team-style tiering for the big overall rating badge. */
function getRatingTierClass(rating: number): string {
  if (rating >= 85) {
    return "from-amber-300 via-yellow-400 to-amber-500 text-amber-950 ring-amber-200/60";
  }
  if (rating >= 70) {
    return "from-slate-200 via-slate-300 to-slate-400 text-slate-900 ring-slate-100/60";
  }
  return "from-orange-700 via-orange-800 to-orange-950 text-orange-50 ring-orange-500/40";
}

interface OverallRatingBadgeProps {
  rating: number;
  position: string;
  className?: string;
}

/** Big, gold/silver/bronze-tiered overall rating — the first thing your eye lands on. */
export function OverallRatingBadge({
  rating,
  position,
  className,
}: OverallRatingBadgeProps) {
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div
        className={cn(
          "flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl font-extrabold tracking-tight shadow-lg shadow-black/40 ring-2",
          getRatingTierClass(rating)
        )}
      >
        {rating}
      </div>
      <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
        {position}
      </span>
    </div>
  );
}
