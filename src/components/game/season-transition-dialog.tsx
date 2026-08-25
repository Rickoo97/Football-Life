"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  DIVISION_LABELS,
  formatCompactCurrency,
  formatCurrency,
  formatSeason,
} from "@/lib/game/formatters";
import { useGameStore } from "@/store/game-store";

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function SeasonTransitionDialog() {
  const pendingSeasonTransition = useGameStore(
    (state) => state.pendingSeasonTransition
  );
  const resolveSeasonTransition = useGameStore(
    (state) => state.resolveSeasonTransition
  );

  if (!pendingSeasonTransition) {
    return null;
  }

  const { summary, contractOffer, transferOffers } = pendingSeasonTransition;

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Seizoen {formatSeason(summary.season)} afgerond</DialogTitle>
          <DialogDescription>
            Seizoenssamenvatting, contractevaluatie en eventuele
            transferaanbiedingen bij {summary.clubName}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatBlock label="Wedstrijden" value={String(summary.matchesPlayed)} />
          <StatBlock label="Doelpunten" value={String(summary.goals)} />
          <StatBlock label="Assists" value={String(summary.assists)} />
          <StatBlock
            label="Gem. cijfer"
            value={summary.averageRating.toFixed(1)}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Marktwaarde: {formatCompactCurrency(summary.startingMarketValue)} →{" "}
          {formatCompactCurrency(summary.endingMarketValue)}{" "}
          <span
            className={
              summary.marketValueGrowth >= 0 ? "text-emerald-600" : "text-destructive"
            }
          >
            ({summary.marketValueGrowth >= 0 ? "+" : ""}
            {formatCompactCurrency(summary.marketValueGrowth)})
          </span>
        </p>

        <Separator />

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Contractaanbod van {contractOffer.clubName}</p>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">
                {formatCurrency(contractOffer.weeklySalary)} / week
              </p>
              <p className="text-xs text-muted-foreground">
                {contractOffer.durationYears} jaar ·{" "}
                {contractOffer.raisePercentage >= 0 ? "+" : ""}
                {contractOffer.raisePercentage}% t.o.v. huidig salaris
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => resolveSeasonTransition({ type: "renew-contract" })}
            >
              Teken bij
            </Button>
          </div>
        </div>

        {transferOffers.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Interesse van andere clubs</p>
            {transferOffers.map((offer) => (
              <div
                key={offer.clubId}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {offer.clubName}
                    </span>
                    <Badge variant="outline">
                      {DIVISION_LABELS[offer.division]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(offer.weeklySalary)} / week · transfersom{" "}
                    {formatCompactCurrency(offer.transferFee)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    resolveSeasonTransition({
                      type: "accept-transfer",
                      clubId: offer.clubId,
                    })
                  }
                >
                  Accepteer
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Geen andere clubs hebben deze offseason interesse getoond.
          </p>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => resolveSeasonTransition({ type: "reject-all" })}
          >
            Blijf zonder nieuw contract
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
