"use client";

import { useProjectStore } from "@/stores/project-store";
import { estimateCost, formatCost } from "@/lib/generation/cost-estimator";

interface CostBadgeProps {
  scope?: "all" | "storyboard" | "keyframes" | "video";
}

export function CostBadge({ scope = "all" }: CostBadgeProps) {
  const { story } = useProjectStore();
  if (!story) return null;

  const breakdown = estimateCost(story);

  const cost = scope === "storyboard"
    ? breakdown.storyboardPanels.total
    : scope === "keyframes"
    ? breakdown.keyframes.total
    : scope === "video"
    ? breakdown.videoClips.total
    : breakdown.grandTotal;

  return (
    <span
      title={
        scope === "all"
          ? `Characters: ${formatCost(breakdown.characterSheets.total)}\n` +
            `Storyboard: ${formatCost(breakdown.storyboardPanels.total)}\n` +
            `Keyframes: ${formatCost(breakdown.keyframes.total)}\n` +
            `Video: ${formatCost(breakdown.videoClips.total)}`
          : undefined
      }
      style={{
        fontFamily: "var(--font-space-mono), monospace",
        fontSize: 10,
        letterSpacing: "0.06em",
        color: "var(--text-disabled)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        padding: "2px 8px",
        cursor: scope === "all" ? "help" : "default",
        whiteSpace: "nowrap",
      }}
    >
      ~{formatCost(cost)}
    </span>
  );
}
