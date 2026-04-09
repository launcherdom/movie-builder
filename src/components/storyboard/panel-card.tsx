"use client";
import { useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { Skeleton } from "@/components/ui/skeleton";
import type { Shot } from "@/types/movie";

interface PanelCardProps {
  shot: Shot;
  aspectRatio: string;
}

export function PanelCard({ shot, aspectRatio }: PanelCardProps) {
  const { setShotPanel, setShotImageStatus, story } = useProjectStore();
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [prompt, setPrompt] = useState(shot.imagePrompt ?? shot.description);
  const [error, setError] = useState<string | null>(null);

  const handleRegenerate = async () => {
    setError(null);
    setShotImageStatus(shot.id, "generating");
    try {
      const res = await fetch("/api/storyboard/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          characters: story?.characters ?? [],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { panel } = await res.json();
      setShotPanel(shot.id, panel, prompt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regen failed");
      setShotImageStatus(shot.id, "error");
    }
  };

  const ar = aspectRatio === "9:16" ? 9 / 16 : 16 / 9;
  const panelWidth = 200;
  const panelHeight = Math.round(panelWidth / ar);

  return (
    <div style={{ width: panelWidth + 2, flexShrink: 0 }}>
      <div
        style={{
          width: panelWidth,
          height: panelHeight,
          background: "var(--surface)",
          border: "1px solid var(--border-visible)",
          borderRadius: 8,
          overflow: "hidden",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {shot.storyboardPanel ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shot.storyboardPanel.url}
            alt={shot.description}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : shot.imageStatus === "generating" ? (
          <Skeleton width="100%" height={panelHeight} borderRadius={4} />
        ) : (
          <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-disabled)" }}>
            [IDLE]
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
        <span style={{
          fontFamily: "var(--font-space-mono), monospace",
          fontSize: 10,
          border: "1px solid var(--border-visible)",
          borderRadius: 4,
          padding: "1px 6px",
          color: "var(--text-primary)",
        }}>
          {shot.shotType}
        </span>
        <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "var(--text-disabled)" }}>
          {shot.duration}S
        </span>
        <button
          onClick={() => setEditingPrompt((p) => !p)}
          style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 14, lineHeight: 1 }}
          title="Edit prompt"
        >
          ✏
        </button>
        <button
          onClick={handleRegenerate}
          disabled={shot.imageStatus === "generating"}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 14, lineHeight: 1 }}
          title="Regenerate"
        >
          ↺
        </button>
      </div>

      {editingPrompt && (
        <div style={{ marginTop: 6 }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              background: "transparent",
              border: "1px solid var(--border-visible)",
              borderRadius: 4,
              color: "var(--text-primary)",
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontSize: 11,
              padding: 6,
              outline: "none",
              resize: "vertical",
            }}
          />
          <button
            onClick={handleRegenerate}
            style={{
              marginTop: 4,
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 10,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: "var(--text-display)",
              color: "var(--black)",
              border: "none",
              borderRadius: 999,
              padding: "4px 12px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            APPLY ──→
          </button>
        </div>
      )}

      {error && (
        <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "var(--accent)", marginTop: 4 }}>
          [ERROR]
        </p>
      )}
    </div>
  );
}
