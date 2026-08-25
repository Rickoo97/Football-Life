import type { Division } from "@/types/game";

export const DIVISION_LABELS: Record<Division, string> = {
  eredivisie: "Eredivisie",
  eerste_divisie: "Eerste Divisie",
  premier_league: "Premier League",
  championship: "Championship",
  la_liga: "La Liga",
  serie_a: "Serie A",
  bundesliga: "Bundesliga",
};

const currencyFormatter = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatCompactCurrency(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `€ ${(amount / 1_000_000).toFixed(1).replace(".", ",")}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `€ ${Math.round(amount / 1_000)}K`;
  }
  return formatCurrency(amount);
}

export function formatGameDate(isoDate: string): string {
  return dateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}

export function formatSeason(season: number): string {
  return `${season}/${season + 1}`;
}
