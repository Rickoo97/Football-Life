import { Trophy } from "lucide-react";

import { GameDashboard } from "@/components/game/game-dashboard";
import { SaveLoadPanel } from "@/components/game/save-load-panel";

export default function DashboardPage() {
  return (
    <div className="relative min-h-full flex-1 overflow-hidden bg-slate-950 text-slate-50">
      {/* Deep, subtly animated aurora glow behind the whole dashboard. */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/60 via-slate-950 to-black" />
        <div className="absolute -top-40 -left-32 size-96 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute top-1/4 -right-40 size-[32rem] rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 size-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-emerald-400 uppercase">
              <Trophy className="size-3.5" />
              Football Life Sim
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Career Dashboard
            </h1>
          </div>
          <SaveLoadPanel />
        </header>

        <GameDashboard />
      </main>
    </div>
  );
}
