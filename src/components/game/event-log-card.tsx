"use client";

import { AnimatePresence, motion } from "framer-motion";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatGameDate } from "@/lib/game/formatters";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";
import type { GameEventType } from "@/types/game";

const EVENT_TYPE_LABEL: Record<GameEventType, string> = {
  match: "Wedstrijd",
  training: "Training",
  injury: "Blessure",
  transfer: "Transfer",
  media: "Media",
  contract: "Contract",
  system: "Systeem",
};

const EVENT_TYPE_DOT: Record<GameEventType, string> = {
  match: "bg-sky-400",
  training: "bg-emerald-400",
  injury: "bg-rose-400",
  transfer: "bg-violet-400",
  media: "bg-fuchsia-400",
  contract: "bg-amber-400",
  system: "bg-slate-400",
};

const EVENT_TYPE_BADGE: Record<GameEventType, string> = {
  match: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/20",
  training: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20",
  injury: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/20",
  transfer: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/20",
  media: "bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-400/20",
  contract: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/20",
  system: "bg-white/10 text-slate-300 ring-1 ring-white/10",
};

export function EventLogCard() {
  const eventLog = useGameStore((state) => state.eventLog);
  const entries = [...eventLog].reverse();

  return (
    <Card className="border-white/10 bg-white/5 py-0 text-slate-100 shadow-xl shadow-black/20 backdrop-blur-xl">
      <CardHeader className="pt-5">
        <p className="text-base font-bold text-white">Logboek</p>
        <p className="text-sm text-slate-400">
          Alles wat er in je carrière gebeurt, nieuwste eerst.
        </p>
      </CardHeader>

      <CardContent className="pb-5">
        <ScrollArea className="h-72 rounded-xl border border-white/10 bg-black/10">
          <ul className="flex flex-col gap-2 p-3">
            <AnimatePresence initial={false} mode="popLayout">
              {entries.map((event) => (
                <motion.li
                  key={event.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        EVENT_TYPE_DOT[event.type]
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                      {event.title}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        EVENT_TYPE_BADGE[event.type]
                      )}
                    >
                      {EVENT_TYPE_LABEL[event.type]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    {event.description}
                  </p>
                  <span className="text-xs text-slate-500">
                    Week {event.week} · {formatGameDate(event.date)}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
