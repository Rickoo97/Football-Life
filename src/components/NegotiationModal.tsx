"use client";

import { useState } from "react";
import { Handshake } from "lucide-react";

import { AttributeBar } from "@/components/game/attribute-bar";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  DIVISION_LABELS,
  formatCompactCurrency,
  formatCurrency,
} from "@/lib/game/formatters";
import { getCurrentClubOffer, getNegotiationBounds } from "@/lib/game/negotiation";
import { useGameStore } from "@/store/game-store";
import type { ContractTerms } from "@/types/negotiation";

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}

interface TermSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
}

function TermSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: TermSliderProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <Label>{label}</Label>
        <span className="font-medium tabular-nums">{format(value)}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
      />
    </div>
  );
}

function describePatience(patience: number): string {
  if (patience >= 70) return "Kalm";
  if (patience >= 35) return "Gespannen";
  return "Bijna op";
}

/**
 * Contract negotiation dashboard: the club's AI-driven agent opens with a
 * bid, the player counters with sliders, and the club's patience decides
 * whether a deal survives. Accepting immediately switches the player's club
 * in the Zustand store.
 */
export function NegotiationModal() {
  const activeNegotiation = useGameStore((state) => state.activeNegotiation);
  const submitCounterOffer = useGameStore((state) => state.submitCounterOffer);
  const acceptNegotiation = useGameStore((state) => state.acceptNegotiation);
  const walkAwayFromNegotiation = useGameStore(
    (state) => state.walkAwayFromNegotiation
  );
  const dismissNegotiation = useGameStore((state) => state.dismissNegotiation);

  const currentOffer = activeNegotiation
    ? getCurrentClubOffer(activeNegotiation)
    : null;

  const [counterOffer, setCounterOffer] = useState<ContractTerms | null>(
    currentOffer
  );
  const [syncedRound, setSyncedRound] = useState<number | null>(
    activeNegotiation?.round ?? null
  );

  // Re-sync the sliders to the club's latest offer whenever a new round
  // starts, so the player always adjusts from what's actually on the table.
  // Adjusting state during render (rather than in an effect) avoids an extra
  // render pass; see https://react.dev/learn/you-might-not-need-an-effect.
  if (activeNegotiation && activeNegotiation.round !== syncedRound) {
    setSyncedRound(activeNegotiation.round);
    setCounterOffer(currentOffer);
  }

  if (!activeNegotiation || !currentOffer || !counterOffer) {
    return null;
  }

  const { club, patience, outcome, history, round, maxRounds } = activeNegotiation;
  const bounds = getNegotiationBounds(club);
  const isFinished = outcome !== "in_progress";

  const updateTerm = (key: keyof ContractTerms) => (value: number) =>
    setCounterOffer((previous) =>
      previous ? { ...previous, [key]: value } : previous
    );

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="size-4" />
            Contractonderhandeling met {club.name}
          </DialogTitle>
          <DialogDescription>
            {DIVISION_LABELS[club.division]} · {club.country} · reputatie{" "}
            {club.reputation}
          </DialogDescription>
        </DialogHeader>

        <AttributeBar
          label="Geduld van de club"
          value={patience}
          tone={patience < 35 ? "warning" : "default"}
          hint={describePatience(patience)}
        />

        {!isFinished ? (
          <p className="text-xs text-muted-foreground">
            Ronde {round}
            {round > maxRounds
              ? " — de club verliest sneller geduld naarmate dit langer duurt."
              : ` van circa ${maxRounds}.`}
          </p>
        ) : null}

        <Separator />

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Huidig bod van {club.name}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatBlock
              label="Weeksalaris"
              value={formatCurrency(currentOffer.weeklySalary)}
            />
            <StatBlock
              label="Contractduur"
              value={`${currentOffer.contractDurationYears} jaar`}
            />
            <StatBlock
              label="Tekengeld"
              value={formatCompactCurrency(currentOffer.signingBonus)}
            />
            <StatBlock
              label="Doelpuntbonus"
              value={formatCurrency(currentOffer.goalBonus)}
            />
          </div>
        </div>

        <ScrollArea className="h-36 rounded-lg border">
          <ul className="flex flex-col gap-2 p-3">
            {history.map((message) => (
              <li key={message.id} className="flex flex-col gap-0.5 text-sm">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={message.speaker === "club" ? "outline" : "secondary"}
                  >
                    {message.speaker === "club" ? club.name : "Jij"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(message.terms.weeklySalary)}/week ·{" "}
                    {message.terms.contractDurationYears} jaar
                  </span>
                </div>
                <p className="text-muted-foreground">{message.message}</p>
              </li>
            ))}
          </ul>
        </ScrollArea>

        {!isFinished ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Jouw tegenbod</p>
            <TermSlider
              label="Weeksalaris"
              value={counterOffer.weeklySalary}
              min={bounds.weeklySalary[0]}
              max={bounds.weeklySalary[1]}
              step={250}
              onChange={updateTerm("weeklySalary")}
              format={formatCurrency}
            />
            <TermSlider
              label="Contractduur"
              value={counterOffer.contractDurationYears}
              min={bounds.contractDurationYears[0]}
              max={bounds.contractDurationYears[1]}
              step={1}
              onChange={updateTerm("contractDurationYears")}
              format={(value) => `${value} jaar`}
            />
            <TermSlider
              label="Tekengeld"
              value={counterOffer.signingBonus}
              min={bounds.signingBonus[0]}
              max={bounds.signingBonus[1]}
              step={1000}
              onChange={updateTerm("signingBonus")}
              format={formatCompactCurrency}
            />
            <TermSlider
              label="Doelpuntbonus"
              value={counterOffer.goalBonus}
              min={bounds.goalBonus[0]}
              max={bounds.goalBonus[1]}
              step={50}
              onChange={updateTerm("goalBonus")}
              format={formatCurrency}
            />
          </div>
        ) : (
          <p
            className={
              outcome === "accepted"
                ? "rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400"
                : "rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            }
          >
            {outcome === "accepted"
              ? `Deal! Je hebt getekend bij ${club.name}.`
              : `${club.name} heeft de onderhandelingen afgebroken. Hun geduld raakte op.`}
          </p>
        )}

        <DialogFooter>
          {isFinished ? (
            <Button onClick={dismissNegotiation}>Sluiten</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={walkAwayFromNegotiation}>
                Loop weg
              </Button>
              <Button
                variant="outline"
                onClick={() => submitCounterOffer(counterOffer)}
              >
                Doe tegenbod
              </Button>
              <Button onClick={acceptNegotiation}>Akkoord met dit bod</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
