"use client";
import { useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { useRouter } from "next/navigation";
import type { Genre, Tone, AspectRatio, VisualStyle } from "@/types/movie";

const GENRES: Genre[] = ["drama", "comedy", "thriller", "romance", "scifi", "fantasy", "horror"];
const TONES: Tone[] = ["serious", "light", "dark", "whimsical"];
const DURATIONS = [30, 60, 120, 300];
const VISUAL_STYLES: VisualStyle[] = ["realistic", "anime", "comic", "cinematic"];

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-space-mono), monospace",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-secondary)",
  display: "block",
  marginBottom: 8,
};

const underlineInput: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  borderBottom: "1px solid var(--border-visible)",
  color: "var(--text-primary)",
  fontFamily: "var(--font-space-grotesk), sans-serif",
  fontSize: 16,
  padding: "8px 0",
  outline: "none",
};

export function PromptStep() {
  const { initProject } = useProjectStore();
  const router = useRouter();

  const [concept, setConcept] = useState("");
  const [genre, setGenre] = useState<Genre>("drama");
  const [tone, setTone] = useState<Tone>("serious");
  const [duration, setDuration] = useState(60);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [visualStyle, setVisualStyle] = useState<VisualStyle>("realistic");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!concept.trim()) {
      setError("Please enter your story concept.");
      return;
    }
    setError(null);
    setGenerating(true);

    initProject({ concept, genre, tone, targetDuration: duration, aspectRatio, visualStyle, qualityTier: "draft" });

    try {
      const res = await fetch("/api/story/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept, genre, tone, targetDuration: duration, aspectRatio, visualStyle }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { story } = await res.json();
      useProjectStore.getState().setStory(story);
      const projectId = useProjectStore.getState().id;
      router.push(`/project/${projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Story generation failed.");
      setGenerating(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 className="font-display" style={{ fontSize: 36, color: "var(--text-display)", marginBottom: 8 }}>
        01 — CONCEPT
      </h1>

      <div style={{ marginTop: 40, marginBottom: 32 }}>
        <label style={labelStyle}>What&apos;s your story?</label>
        <textarea
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="A detective investigates a murder that turns out to be her own..."
          rows={4}
          style={{
            ...underlineInput,
            resize: "vertical",
            borderBottom: "none",
            border: "1px solid var(--border-visible)",
            borderRadius: 4,
            padding: "12px",
          }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginBottom: 32 }}>
        <div>
          <label style={labelStyle}>Genre</label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value as Genre)}
            style={{ ...underlineInput, fontFamily: "var(--font-space-mono), monospace", fontSize: 13 }}
          >
            {GENRES.map((g) => <option key={g} value={g}>{g.toUpperCase()}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Tone</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            style={{ ...underlineInput, fontFamily: "var(--font-space-mono), monospace", fontSize: 13 }}
          >
            {TONES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Visual Style</label>
          <select
            value={visualStyle}
            onChange={(e) => setVisualStyle(e.target.value as VisualStyle)}
            style={{ ...underlineInput, fontFamily: "var(--font-space-mono), monospace", fontSize: 13 }}
          >
            {VISUAL_STYLES.map((vs) => <option key={vs} value={vs}>{vs.toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 40 }}>
        <div>
          <label style={labelStyle}>Duration</label>
          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            {DURATIONS.map((d) => (
              <label key={d} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="duration"
                  checked={duration === d}
                  onChange={() => setDuration(d)}
                  style={{ accentColor: "var(--accent)" }}
                />
                <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 12, color: duration === d ? "var(--text-display)" : "var(--text-secondary)" }}>
                  {d < 60 ? `${d}S` : `${d / 60}M`}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Aspect Ratio</label>
          <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
            {(["9:16", "16:9"] as AspectRatio[]).map((ar) => (
              <label key={ar} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="aspect"
                  checked={aspectRatio === ar}
                  onChange={() => setAspectRatio(ar)}
                  style={{ accentColor: "var(--accent)" }}
                />
                <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 12, color: aspectRatio === ar ? "var(--text-display)" : "var(--text-secondary)" }}>
                  {ar} {ar === "9:16" ? "VERTICAL" : "CINEMATIC"}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 12, color: "var(--accent)", marginBottom: 16 }}>
          [ERROR: {error}]
        </p>
      )}

      <button
        onClick={handleGenerate}
        disabled={generating}
        style={{
          fontFamily: "var(--font-space-mono), monospace",
          fontSize: 12,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: generating ? "var(--border-visible)" : "var(--text-display)",
          color: "var(--black)",
          border: "none",
          borderRadius: "var(--radius-btn)",
          padding: "12px 32px",
          cursor: generating ? "not-allowed" : "pointer",
          minHeight: 40,
        }}
      >
        {generating ? "[GENERATING...]" : "GENERATE STORY ──→"}
      </button>
    </div>
  );
}
