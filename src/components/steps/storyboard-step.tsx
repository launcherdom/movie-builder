"use client";
import { useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { useLangStore } from "@/stores/lang-store";
import { buildDependencyPlan } from "@/lib/generation/dependency-plan";
import { persistAsset } from "@/lib/assets/persist";
import { PanelGrid } from "@/components/storyboard/panel-grid";
import type { QualityTier } from "@/types/movie";

const TIERS: QualityTier[] = ["draft", "standard", "premium"];

export function StoryboardStep() {
  const { story, qualityTier, setQualityTier, setCurrentStep, aspectRatio, id: projectId, setShotImageStatus, setShotPanel, visualStyle } = useProjectStore();
  const { t } = useLangStore();
  const [generatingAll, setGeneratingAll] = useState(false);

  if (!story) {
    return (
      <p style={{ fontFamily: "var(--font-space-mono), monospace", color: "var(--text-secondary)", fontSize: 13 }}>
        {t.storyboard.noStory}
      </p>
    );
  }

  const totalPanels = story.scenes.flatMap((sc) => sc.shots).length;
  const donePanels = story.scenes.flatMap((sc) => sc.shots).filter((sh) => sh.imageStatus === "done").length;

  // Generate All: run dependency batches across all scenes
  // Batch 0 = first shot of each scene (parallel), Batch 1 = second shots (parallel), etc.
  const handleGenerateAll = async () => {
    setGeneratingAll(true);
    const characters = story.characters;
    const batches = buildDependencyPlan(story.scenes);

    // Track generated panel URLs per scene for reference chaining
    const lastPanelPerScene: Record<string, string | undefined> = {};

    for (const batch of batches) {
      // Mark all shots in this batch as generating
      batch.forEach(({ shotId }) => setShotImageStatus(shotId, "generating"));

      // Run all shots in the batch in parallel (different scenes)
      await Promise.all(
        batch.map(async ({ shot, scene, shotId }) => {
          const referenceImageUrl = lastPanelPerScene[scene.id];
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
                ...(referenceImageUrl && { referenceImageUrl }),
              }),
            });
            if (!res.ok) { setShotImageStatus(shotId, "error"); return; }
            const { results } = await res.json() as {
              results: Array<{ shotId: string; panel: { url: string; width: number; height: number } | null; prompt: string }>
            };
            const result = results[0];
            if (result?.panel) {
              setShotPanel(result.shotId, result.panel, result.prompt);
              lastPanelPerScene[scene.id] = result.panel.url;
              if (projectId) {
                persistAsset({ url: result.panel.url, projectId, shotId, assetType: "storyboard" })
                  .then((blobUrl) => { if (blobUrl !== result.panel!.url) setShotPanel(result.shotId, { ...result.panel!, url: blobUrl }, result.prompt); })
                  .catch(() => {});
              }
            } else {
              setShotImageStatus(shotId, "error");
            }
          } catch {
            setShotImageStatus(shotId, "error");
          }
        })
      );
    }

    setGeneratingAll(false);
  };

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 36, color: "var(--text-display)", marginBottom: 4 }}>
            {t.storyboard.heading}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
              {t.storyboard.panels}
            </span>
            <div style={{ display: "flex", gap: 2 }}>
              {Array.from({ length: Math.min(totalPanels, 24) }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    background: i < donePanels ? "var(--text-display)" : "var(--border)",
                  }}
                />
              ))}
            </div>
            <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-primary)" }}>
              {donePanels} / {totalPanels}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {TIERS.map((tier) => (
            <label key={tier} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="radio"
                name="tier"
                checked={qualityTier === tier}
                onChange={() => setQualityTier(tier)}
                style={{ accentColor: "var(--accent)" }}
              />
              <span style={{
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 11,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: qualityTier === tier ? "var(--text-display)" : "var(--text-secondary)",
              }}>
                {tier}
              </span>
            </label>
          ))}

          <button
            onClick={handleGenerateAll}
            disabled={generatingAll}
            style={{
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: generatingAll ? "var(--border)" : "var(--text-display)",
              color: generatingAll ? "var(--text-disabled)" : "var(--black)",
              border: "none",
              borderRadius: "var(--radius-btn)",
              padding: "8px 20px",
              cursor: generatingAll ? "not-allowed" : "pointer",
            }}
          >
            {generatingAll ? "[GENERATING ALL...]" : "GENERATE ALL"}
          </button>
        </div>
      </div>

      {story.scenes.map((scene, i) => (
        <PanelGrid key={scene.id} scene={scene} sceneIndex={i} aspectRatio={aspectRatio} />
      ))}

      <button
        onClick={() => setCurrentStep("video")}
        disabled={donePanels === 0}
        style={{
          marginTop: 16,
          fontFamily: "var(--font-space-mono), monospace",
          fontSize: 12,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: donePanels > 0 ? "var(--text-display)" : "var(--border)",
          color: donePanels > 0 ? "var(--black)" : "var(--text-disabled)",
          border: "none",
          borderRadius: "var(--radius-btn)",
          padding: "12px 32px",
          cursor: donePanels > 0 ? "pointer" : "not-allowed",
        }}
      >
        {t.storyboard.next}
      </button>
    </div>
  );
}
