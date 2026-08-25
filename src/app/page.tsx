import { GameDashboard } from "@/components/game/game-dashboard";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium text-muted-foreground">
          Football Life Sim
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      </header>

      <GameDashboard />
    </main>
  );
}
