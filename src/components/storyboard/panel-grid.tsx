"use client";
import { useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import type { Scene } from "@/types/movie";
import { PanelCard } from "./panel-card";

interface PanelGridProps {
  scene: Scene;
  sceneIndex: number;
  aspectRatio: string;
}

export function PanelGrid({ scene, sceneIndex, aspectRatio }: PanelGridProps) {
  const { story, qualityTier, setShotImageStatus, setShotPanel } = useProjectStore();
  const [generating, setGenerating] = useState(false);

  const handleGenerateScene = async () => {
    setGenerating(true);
    scene.shots.forEach((sh) => setShotImageStatus(sh.id, "generating"));

    try {
      const res = await fetch("/api/storyboard/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shots: scene.shots,
          sceneDescription: scene.description,
          characters: story?.characters ?? [],
          qualityTier,
          visualStyle: useProjectStore.getState().visualStyle,
          aspectRatio,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { results } = await res.json();
      results.forEach(({ shotId, panel, prompt }: { shotId: string; panel: { url: string; width: number; height: number } | null; prompt: string }) => {
        if (panel) setShotPanel(shotId, panel, prompt);
        else setShotImageStatus(shotId, "error");
      });
    } catch {
      scene.shots.forEach((sh) => setShotImageStatus(sh.id, "error"));
    } finally {
      setGenerating(false);
    }
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
