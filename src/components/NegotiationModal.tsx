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
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";
import type { ContractTerms, NegotiationSpeaker } from "@/types/negotiation";

function speakerLabel(speaker: NegotiationSpeaker, clubName: string): string {
  if (speaker === "club") return clubName;
  if (speaker === "agent") return "Zaakwaarnemer";
  return "Jij";
}

function speakerBadgeClass(speaker: NegotiationSpeaker): string {
  if (speaker === "club") return "border-white/15 text-slate-300";
  if (speaker === "agent") return "bg-amber-500/90 text-amber-950";
  return "bg-white/10 text-slate-100";
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
      <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
        {label}
      </p>
      <p className="text-base font-bold text-white tabular-nums">{value}</p>
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
        <Label className="text-slate-300">{label}</Label>
        <span className="font-semibold text-white tabular-nums">
          {format(value)}
        </span>
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
      <DialogContent className="border-white/10 bg-slate-900/95 text-slate-100 backdrop-blur-2xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Handshake className="size-4" />
            Contractonderhandeling met {club.name}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
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
          <p className="text-xs text-slate-400">
            Ronde {round}
            {round > maxRounds
              ? " — de club verliest sneller geduld naarmate dit langer duurt."
              : ` van circa ${maxRounds}.`}
          </p>
        ) : null}

        <Separator className="bg-white/10" />

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-white">
            Huidig bod van {club.name}
          </p>
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

        <ScrollArea className="h-36 rounded-xl border border-white/10 bg-black/10">
          <ul className="flex flex-col gap-2 p-3">
            {history.map((message) => (
              <li key={message.id} className="flex flex-col gap-0.5 text-sm">
                <div className="flex items-center gap-2">
                  <Badge className={speakerBadgeClass(message.speaker)}>
                    {speakerLabel(message.speaker, club.name)}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {formatCurrency(message.terms.weeklySalary)}/week ·{" "}
                    {message.terms.contractDurationYears} jaar
                  </span>
                </div>
                <p className="text-slate-300">{message.message}</p>
              </li>
            ))}
          </ul>
        </ScrollArea>

        {!isFinished ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-white">Jouw tegenbod</p>
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
            className={cn(
              "rounded-xl border px-3 py-2 text-sm",
              outcome === "accepted"
                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                : "border-rose-400/20 bg-rose-500/10 text-rose-300"
            )}
          >
            {history.at(-1)?.message ??
              (outcome === "accepted"
                ? `Deal! Je hebt getekend bij ${club.name}.`
                : `${club.name} heeft de onderhandelingen afgebroken. Hun geduld raakte op.`)}
          </p>
        )}

        <DialogFooter className="border-white/10 bg-transparent">
          {isFinished ? (
            <Button
              onClick={dismissNegotiation}
              className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
            >
              Sluiten
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                className="text-slate-400 hover:bg-white/5 hover:text-slate-100"
                onClick={walkAwayFromNegotiation}
              >
                Loop weg
              </Button>
              <Button
                variant="outline"
                className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/15"
                onClick={() => submitCounterOffer(counterOffer)}
              >
                Doe tegenbod
              </Button>
              <Button
                onClick={acceptNegotiation}
                className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
              >
                Akkoord met dit bod
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
