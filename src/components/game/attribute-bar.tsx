import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type MeterTone = "default" | "energy" | "morale" | "warning";

const TONE_CLASSES: Record<MeterTone, string> = {
  default: "",
  energy: "[&_[data-slot=progress-indicator]]:bg-emerald-500",
  morale: "[&_[data-slot=progress-indicator]]:bg-sky-500",
  warning: "[&_[data-slot=progress-indicator]]:bg-amber-500",
};

interface AttributeBarProps {
  label: string;
  value: number;
  max?: number;
  tone?: MeterTone;
  /** Optional short text shown next to the numeric value. */
  hint?: string;
}

export function AttributeBar({
  label,
  value,
  max = 100,
  tone = "default",
  hint,
}: AttributeBarProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {hint ? (
            <span className="mr-2 font-normal text-muted-foreground">{hint}</span>
          ) : null}
          {Math.round(value)}
        </span>
      </div>
      <Progress
        value={(value / max) * 100}
        className={cn("h-1.5", TONE_CLASSES[tone])}
      />
    </div>
  );
}
