"use client";
import { useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { useLangStore } from "@/stores/lang-store";
import { Skeleton } from "@/components/ui/skeleton";
import type { Scene } from "@/types/movie";

function ScenePanelCard({ scene, sceneIndex }: { scene: Scene; sceneIndex: number }) {
  const { setScenePanel, setScenePanelStatus, aspectRatio, id: projectId, story } = useProjectStore();
  const [error, setError] = useState<string | null>(null);

  const status = scene.scenePanelStatus ?? "idle";
  const isGenerating = status === "generating";

  const handleGenerate = async () => {
    setError(null);
    setScenePanelStatus(scene.id, "generating");
    try {
      const characters = story?.characters ?? [];
      const res = await fetch("/api/storyboard/scene-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene, characters, aspectRatio, projectId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { panel } = await res.json();
      if (!panel) throw new Error("No panel returned");
      setScenePanel(scene.id, panel);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setScenePanelStatus(scene.id, "error");
    }
  };

  return (
    <div style={{ marginBottom: 24, border: "1px solid var(--border)", borderRadius: "var(--radius-card)", overflow: "hidden", background: "var(--surface)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--accent)", letterSpacing: "0.08em" }}>
            SCENE {String(sceneIndex + 1).padStart(2, "0")}
          </span>
          <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-primary)" }}>
            {scene.heading}
          </span>
          <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "var(--text-disabled)" }}>
            {scene.shots.length} CUTS · {Math.min(scene.shots.reduce((s, sh) => s + sh.duration, 0), 15)}S
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {status !== "idle" && (
            <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: status === "done" ? "var(--success)" : status === "error" ? "var(--accent)" : "var(--text-secondary)" }}>
              [{status.toUpperCase()}]
            </span>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.06em",
              background: "transparent",
              border: "1px solid var(--border-visible)",
              borderRadius: "var(--radius-btn)",
              color: isGenerating ? "var(--text-disabled)" : "var(--text-primary)",
              padding: "6px 16px",
              cursor: isGenerating ? "not-allowed" : "pointer",
            }}
          >
            {isGenerating ? "[GENERATING...]" : status === "done" ? "↺ REGENERATE" : "▶ GENERATE"}
          </button>
        </div>
      </div>

      {/* Scene shots list */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: 8, flexWrap: "wrap" }}>
        {scene.shots.map((sh, i) => (
          <span key={sh.id} style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 9, color: "var(--text-disabled)", background: "var(--border)", borderRadius: 2, padding: "2px 6px" }}>
            {i + 1} {sh.shotType} {sh.duration}s
          </span>
        ))}
      </div>

      {/* Panel image */}
      <div style={{ padding: 12 }}>
        {scene.scenePanel ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={scene.scenePanel.url}
            alt={`scene ${sceneIndex + 1} manga`}
            style={{ width: "100%", borderRadius: 4, display: "block" }}
          />
        ) : isGenerating ? (
          <Skeleton width="100%" height={300} borderRadius={4} />
        ) : (
          <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "var(--text-disabled)" }}>
              NO PANEL — CLICK GENERATE
            </span>
          </div>
        )}
        {error && (
          <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--accent)", marginTop: 6 }}>
            [ERROR: {error}]
          </p>
        )}
      </div>
    </div>
  );
}

export function StoryboardStep() {
  const { story, setCurrentStep } = useProjectStore();
  const { t } = useLangStore();
  const [generatingAll, setGeneratingAll] = useState(false);

  if (!story) {
    return (
      <p style={{ fontFamily: "var(--font-space-mono), monospace", color: "var(--text-secondary)", fontSize: 13 }}>
        {t.storyboard.noStory}
      </p>
    );
  }

  const totalScenes = story.scenes.length;
  const doneScenes = story.scenes.filter((sc) => sc.scenePanelStatus === "done").length;

  const handleGenerateAll = async () => {
    setGeneratingAll(true);
    const { story: currentStory, aspectRatio, id: projectId } = useProjectStore.getState();
    if (!currentStory) { setGeneratingAll(false); return; }

    for (const scene of currentStory.scenes) {
      if (scene.scenePanelStatus === "done") continue;
      const { setScenePanel, setScenePanelStatus } = useProjectStore.getState();
      setScenePanelStatus(scene.id, "generating");
      try {
        const characters = currentStory.characters;
        const res = await fetch("/api/storyboard/scene-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scene, characters, aspectRatio, projectId }),
        });
        if (!res.ok) { setScenePanelStatus(scene.id, "error"); continue; }
        const { panel } = await res.json();
        if (panel) setScenePanel(scene.id, panel);
        else setScenePanelStatus(scene.id, "error");
      } catch {
        useProjectStore.getState().setScenePanelStatus(scene.id, "error");
      }
    }
    setGeneratingAll(false);
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 36, color: "var(--text-display)", marginBottom: 4 }}>
            {t.storyboard.heading}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
              SCENES
            </span>
            <div style={{ display: "flex", gap: 2 }}>
              {story.scenes.map((sc, i) => (
                <div key={i} style={{ width: 8, height: 8, background: sc.scenePanelStatus === "done" ? "var(--text-display)" : "var(--border)" }} />
              ))}
            </div>
            <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-primary)" }}>
              {doneScenes} / {totalScenes}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
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
        <ScenePanelCard key={scene.id} scene={scene} sceneIndex={i} />
      ))}

      <button
        onClick={() => setCurrentStep("video")}
        disabled={doneScenes === 0}
        style={{
          marginTop: 16,
          fontFamily: "var(--font-space-mono), monospace",
          fontSize: 12,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: doneScenes > 0 ? "var(--text-display)" : "var(--border)",
          color: doneScenes > 0 ? "var(--black)" : "var(--text-disabled)",
          border: "none",
          borderRadius: "var(--radius-btn)",
          padding: "12px 32px",
          cursor: doneScenes > 0 ? "pointer" : "not-allowed",
        }}
      >
        {t.storyboard.next}
      </button>
    </div>
  );
}
