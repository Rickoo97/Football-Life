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
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
      <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
        {label}
      </p>
      <p className="text-lg font-bold text-white tabular-nums">{value}</p>
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
      <DialogContent className="border-white/10 bg-slate-900/95 text-slate-100 backdrop-blur-2xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-white">
            Seizoen {formatSeason(summary.season)} afgerond
          </DialogTitle>
          <DialogDescription className="text-slate-400">
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

        <p className="text-xs text-slate-400">
          Marktwaarde: {formatCompactCurrency(summary.startingMarketValue)} →{" "}
          {formatCompactCurrency(summary.endingMarketValue)}{" "}
          <span
            className={
              summary.marketValueGrowth >= 0 ? "text-emerald-400" : "text-rose-400"
            }
          >
            ({summary.marketValueGrowth >= 0 ? "+" : ""}
            {formatCompactCurrency(summary.marketValueGrowth)})
          </span>
        </p>

        <Separator className="bg-white/10" />

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-white">
            Contractaanbod van {contractOffer.clubName}
          </p>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
            <div>
              <p className="text-sm font-medium text-slate-100">
                {formatCurrency(contractOffer.weeklySalary)} / week
              </p>
              <p className="text-xs text-slate-400">
                {contractOffer.durationYears} jaar ·{" "}
                {contractOffer.raisePercentage >= 0 ? "+" : ""}
                {contractOffer.raisePercentage}% t.o.v. huidig salaris
              </p>
            </div>
            <Button
              size="sm"
              className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
              onClick={() => resolveSeasonTransition({ type: "renew-contract" })}
            >
              Teken bij
            </Button>
          </div>
        </div>

        {transferOffers.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-white">
              Interesse van andere clubs
            </p>
            {transferOffers.map((offer) => (
              <div
                key={offer.clubId}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-100">
                      {offer.clubName}
                    </span>
                    <Badge variant="outline" className="border-white/15 text-slate-300">
                      {DIVISION_LABELS[offer.division]}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    {formatCurrency(offer.weeklySalary)} / week · transfersom{" "}
                    {formatCompactCurrency(offer.transferFee)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/15"
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
          <p className="text-sm text-slate-400">
            Geen andere clubs hebben deze offseason interesse getoond.
          </p>
        )}

        <DialogFooter className="border-white/10 bg-transparent">
          <Button
            variant="ghost"
            className="text-slate-400 hover:bg-white/5 hover:text-slate-100"
            onClick={() => resolveSeasonTransition({ type: "reject-all" })}
          >
            Blijf zonder nieuw contract
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
