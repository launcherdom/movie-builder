"use client";
import { useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { persistAsset } from "@/lib/assets/persist";
import type { Scene } from "@/types/movie";
import { PanelCard } from "./panel-card";

interface PanelGridProps {
  scene: Scene;
  sceneIndex: number;
  aspectRatio: string;
}

export function PanelGrid({ scene, sceneIndex, aspectRatio }: PanelGridProps) {
  const { story, qualityTier, setShotImageStatus, setShotPanel, id: projectId } = useProjectStore();
  const [generating, setGenerating] = useState(false);

  // Generate shots sequentially within the scene, each referencing the previous panel
  const handleGenerateScene = async () => {
    setGenerating(true);

    let previousPanelUrl: string | undefined;
    const characters = story?.characters ?? [];
    const visualStyle = useProjectStore.getState().visualStyle;

    for (const shot of scene.shots) {
      setShotImageStatus(shot.id, "generating");
      try {
        const res = await fetch("/api/storyboard/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shots: [shot],
            sceneDescription: scene.description,
            characters,
            qualityTier,
            visualStyle,
            aspectRatio,
            ...(previousPanelUrl && { referenceImageUrl: previousPanelUrl }),
          }),
        });
        if (!res.ok) {
          setShotImageStatus(shot.id, "error");
          continue;
        }
        const { results } = await res.json() as {
          results: Array<{ shotId: string; panel: { url: string; width: number; height: number } | null; prompt: string }>
        };
        const result = results[0];
        if (result?.panel) {
          setShotPanel(result.shotId, result.panel, result.prompt);
          previousPanelUrl = result.panel.url;
          if (projectId) {
            persistAsset({ url: result.panel.url, projectId, shotId: result.shotId, assetType: "storyboard" })
              .then((blobUrl) => { if (blobUrl !== result.panel!.url) setShotPanel(result.shotId, { ...result.panel!, url: blobUrl }, result.prompt); })
              .catch(() => {});
          }
        } else {
          setShotImageStatus(shot.id, "error");
        }
      } catch {
        setShotImageStatus(shot.id, "error");
      }
    }

    setGenerating(false);
  };

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
        <div>
          <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, letterSpacing: "0.08em", color: "var(--accent)" }}>
            SCENE {String(sceneIndex + 1).padStart(2, "0")} — {scene.heading}
          </span>
          {scene.characterIds.length > 0 && (
            <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-disabled)", marginLeft: 16 }}>
              · {scene.characterIds.map((id) => story?.characters.find((c) => c.id === id)?.name).filter(Boolean).join(", ")}
            </span>
          )}
        </div>
        <button
          onClick={handleGenerateScene}
          disabled={generating}
          style={{
            fontFamily: "var(--font-space-mono), monospace",
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            background: "transparent",
            border: "1px solid var(--border-visible)",
            borderRadius: "var(--radius-btn)",
            color: generating ? "var(--text-disabled)" : "var(--text-primary)",
            padding: "6px 16px",
            cursor: generating ? "not-allowed" : "pointer",
          }}
        >
          {generating ? "[GENERATING...]" : "GENERATE SCENE"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {scene.shots.map((shot) => (
          <PanelCard key={shot.id} shot={shot} aspectRatio={aspectRatio} />
        ))}
      </div>
    </div>
  );
}
