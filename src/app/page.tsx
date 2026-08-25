import { Trophy } from "lucide-react";

import { NewGameScreen } from "@/components/onboarding/new-game-screen";

const HIGHLIGHTS = [
  {
    title: "Speel week voor week",
    description:
      "Trainen, rusten, uitgaan of je zaakwaarnemer bellen: elke week telt mee.",
  },
  {
    title: "Groei naar de top",
    description:
      "Wedstrijden bepalen je cijfer, je marktwaarde en de interesse van clubs.",
  },
  {
    title: "Onderhandel je droomtransfer",
    description:
      "Je zaakwaarnemer haalt het onderste uit de kan — als je niet te gulzig wordt.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-10 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:py-16">
      <section className="flex flex-col gap-6 lg:max-w-md lg:flex-1">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Trophy className="size-4" />
          Football Life Sim
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Van talent tot legende.
          </h1>
          <p className="text-base text-muted-foreground text-pretty">
            Kies je naam, je land en je positie op het veld. Vanaf daar bepaal jij
            hoe ver je het schopt.
          </p>
        </div>

        <ul className="flex flex-col gap-4">
          {HIGHLIGHTS.map((highlight) => (
            <li key={highlight.title} className="flex flex-col gap-0.5">
              <p className="text-sm font-medium">{highlight.title}</p>
              <p className="text-sm text-muted-foreground">
                {highlight.description}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="lg:flex-1">
        <NewGameScreen />
      </section>
    </main>
  );
}
