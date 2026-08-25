"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { PlayerAttributes } from "@/types/game";

const CHART_CONFIG = {
  value: {
    label: "Waarde",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

const ATTRIBUTE_LABELS: Array<{ key: keyof PlayerAttributes; label: string }> = [
  { key: "pace", label: "Tempo" },
  { key: "shooting", label: "Schieten" },
  { key: "passing", label: "Passing" },
  { key: "defending", label: "Verdedigen" },
  { key: "technique", label: "Techniek" },
  { key: "physical", label: "Fysiek" },
  { key: "stamina", label: "Conditie" },
];

interface AttributeRadarProps {
  attributes: PlayerAttributes;
}

export function AttributeRadar({ attributes }: AttributeRadarProps) {
  const data = ATTRIBUTE_LABELS.map(({ key, label }) => ({
    attribute: label,
    value: attributes[key],
  }));

  return (
    <ChartContainer
      config={CHART_CONFIG}
      className="mx-auto aspect-square w-full max-w-[260px]"
    >
      <RadarChart data={data} outerRadius="72%">
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <PolarGrid />
        <PolarAngleAxis dataKey="attribute" />
        <Radar
          dataKey="value"
          stroke="var(--color-value)"
          fill="var(--color-value)"
          fillOpacity={0.35}
          dot={{ r: 3, fillOpacity: 1 }}
        />
      </RadarChart>
    </ChartContainer>
  );
}
