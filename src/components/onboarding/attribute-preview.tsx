"use client";

import { AttributeBar } from "@/components/game/attribute-bar";
import type { PlayerAttributes } from "@/types/game";

const ATTRIBUTE_LABELS: Array<{ key: keyof PlayerAttributes; label: string }> = [
  { key: "shooting", label: "Schieten" },
  { key: "passing", label: "Passing" },
  { key: "defending", label: "Verdedigen" },
  { key: "technique", label: "Techniek" },
  { key: "pace", label: "Tempo" },
  { key: "physical", label: "Fysiek" },
  { key: "stamina", label: "Conditie" },
];

interface AttributePreviewProps {
  attributes: PlayerAttributes;
}

/** Live preview of the starting attributes the chosen position will produce. */
export function AttributePreview({ attributes }: AttributePreviewProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {ATTRIBUTE_LABELS.map(({ key, label }) => (
        <AttributeBar
          key={key}
          label={label}
          value={attributes[key]}
          tone={attributes[key] >= 65 ? "energy" : "default"}
        />
      ))}
    </div>
  );
}
