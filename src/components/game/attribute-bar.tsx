import { Progress } from "@/components/ui/progress";

interface AttributeBarProps {
  label: string;
  value: number;
  max?: number;
}

export function AttributeBar({ label, value, max = 100 }: AttributeBarProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <Progress value={(value / max) * 100} />
    </div>
  );
}
