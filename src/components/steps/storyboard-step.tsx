"use client";
import { useProjectStore } from "@/stores/project-store";
import { useLangStore } from "@/stores/lang-store";
import { PanelGrid } from "@/components/storyboard/panel-grid";
import type { QualityTier } from "@/types/movie";

const TIERS: QualityTier[] = ["draft", "standard", "premium"];

export function StoryboardStep() {
  const { story, qualityTier, setQualityTier, setCurrentStep, aspectRatio } = useProjectStore();
  const { t } = useLangStore();

  if (!story) {
    return (
      <p style={{ fontFamily: "var(--font-space-mono), monospace", color: "var(--text-secondary)", fontSize: 13 }}>
        {t.storyboard.noStory}
      </p>
    );
  }

  const totalPanels = story.scenes.flatMap((sc) => sc.shots).length;
  const donePanels = story.scenes.flatMap((sc) => sc.shots).filter((sh) => sh.imageStatus === "done").length;

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
