import { hashSeed } from "@/lib/game/player-creation";
import { cn } from "@/lib/utils";

/** Deterministic per-club color so the same club always gets the same "kit" colours. */
const CREST_GRADIENTS = [
  "from-sky-500 to-blue-700",
  "from-emerald-500 to-teal-700",
  "from-rose-500 to-red-700",
  "from-violet-500 to-purple-700",
  "from-amber-500 to-orange-700",
  "from-cyan-500 to-sky-700",
  "from-lime-500 to-emerald-700",
  "from-fuchsia-500 to-pink-700",
] as const;

const SIZE_CLASS = {
  sm: "size-6 rounded-md text-[9px]",
  md: "size-10 rounded-lg text-[11px]",
  lg: "size-14 rounded-xl text-sm",
} as const;

function getClubInitials(name: string): string {
  const words = name.split(" ").filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }
  return words
    .map((word) => word[0])
    .slice(0, 3)
    .join("")
    .toUpperCase();
}

interface ClubCrestProps {
  id: string;
  name: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}

/**
 * Stand-in "club logo": no real crest artwork exists for the procedurally
 * generated clubs, so this renders a badge with the club's initials on a
 * gradient that's stable per club id, which reads as a logo at a glance.
 */
export function ClubCrest({ id, name, size = "md", className }: ClubCrestProps) {
  const gradient = CREST_GRADIENTS[hashSeed(id) % CREST_GRADIENTS.length];

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center bg-gradient-to-br font-extrabold text-white shadow-md shadow-black/30 ring-1 ring-white/25",
        gradient,
        SIZE_CLASS[size],
        className
      )}
      title={name}
      aria-hidden
    >
      {getClubInitials(name)}
    </div>
  );
}
