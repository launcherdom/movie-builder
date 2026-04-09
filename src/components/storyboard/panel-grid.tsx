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
  const { story, qualityTier, setShotImageStatus, setShotPanel, id: projectId, visualStyle } = useProjectStore();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingShots = scene.shots.filter((sh) => sh.imageStatus !== "done");
  const doneShots = scene.shots.filter((sh) => sh.imageStatus === "done").length;

  // Generate all shots in this scene as one grid image → split into panels
  const handleGenerateScene = async () => {
    if (pendingShots.length === 0) return;
    setGenerating(true);
    setError(null);

    const characters = story?.characters ?? [];
    const styleAnalysis = useProjectStore.getState().styleAnalysis;

    // Mark all pending shots as generating
    pendingShots.forEach((sh) => setShotImageStatus(sh.id, "generating"));

    try {
      const res = await fetch("/api/storyboard/grid-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene: { ...scene, shots: pendingShots },
          characters,
          qualityTier,
          visualStyle,
          aspectRatio,
          projectId,
          styleAnalysis,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        pendingShots.forEach((sh) => setShotImageStatus(sh.id, "error"));
        setError(body.error ?? "Generation failed");
        return;
      }

      const { results } = await res.json() as {
        results: Array<{ shotId: string; panel: { url: string; width: number; height: number } | null; prompt: string }>
      };

      for (const result of results) {
        if (result.panel) {
          setShotPanel(result.shotId, result.panel, result.prompt);
        } else {
          setShotImageStatus(result.shotId, "error");
        }
      }
    } catch (e) {
      pendingShots.forEach((sh) => setShotImageStatus(sh.id, "error"));
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const isSceneGenerating = scene.shots.some((sh) => sh.imageStatus === "generating");

  return (
    <div style={{ marginBottom: 40 }}>
      {/* Scene header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, letterSpacing: "0.08em", color: "var(--accent)" }}>
            SCENE {String(sceneIndex + 1).padStart(2, "0")} — {scene.heading}
          </span>
          {scene.characterIds.length > 0 && (
            <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-disabled)" }}>
              · {scene.characterIds.map((id) => story?.characters.find((c) => c.id === id)?.name).filter(Boolean).join(", ")}
            </span>
          )}
          {/* Shot progress dots */}
          <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
            {scene.shots.map((sh) => (
              <div key={sh.id} style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: sh.imageStatus === "done"
                  ? "var(--success)"
                  : sh.imageStatus === "generating"
                    ? "var(--text-secondary)"
                    : sh.imageStatus === "error"
                      ? "var(--accent)"
                      : "var(--border)",
              }} />
            ))}
            <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "var(--text-disabled)", marginLeft: 4 }}>
              {doneShots}/{scene.shots.length}
            </span>
          </div>
        </div>

        <button
          onClick={handleGenerateScene}
          disabled={generating || isSceneGenerating || pendingShots.length === 0}
          style={{
            fontFamily: "var(--font-space-mono), monospace",
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            background: "transparent",
            border: `1px solid ${pendingShots.length === 0 ? "var(--border)" : "var(--border-visible)"}`,
            borderRadius: "var(--radius-btn)",
            color: (generating || isSceneGenerating || pendingShots.length === 0) ? "var(--text-disabled)" : "var(--text-primary)",
            padding: "6px 16px",
            cursor: (generating || isSceneGenerating || pendingShots.length === 0) ? "not-allowed" : "pointer",
          }}
        >
          {generating || isSceneGenerating
            ? `[GENERATING ${scene.shots.length} SHOTS...]`
            : pendingShots.length === 0
              ? "✓ DONE"
              : `GENERATE ${pendingShots.length} SHOT${pendingShots.length > 1 ? "S" : ""}`}
        </button>
      </div>

      {error && (
        <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "var(--accent)", marginBottom: 8 }}>
          [ERROR: {error}]
        </p>
      )}

      {/* Shot panels */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {scene.shots.map((shot) => (
          <PanelCard key={shot.id} shot={shot} aspectRatio={aspectRatio} />
        ))}
      </div>
    </div>
  );
}
