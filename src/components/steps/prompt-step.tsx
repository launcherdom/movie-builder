"use client";
import { useState, useRef } from "react";
import { useProjectStore } from "@/stores/project-store";
import { useLangStore } from "@/stores/lang-store";
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
  const { initProject, setStyleReference } = useProjectStore();
  const { t } = useLangStore();
  const router = useRouter();

  const [concept, setConcept] = useState("");
  const [genre, setGenre] = useState<Genre>("drama");
  const [tone, setTone] = useState<Tone>("serious");
  const [duration, setDuration] = useState(60);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [visualStyle, setVisualStyle] = useState<VisualStyle>("realistic");
  const [generating, setGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [styleFile, setStyleFile] = useState<File | null>(null);
  const [stylePreview, setStylePreview] = useState<string | null>(null);
  const [styleUploading, setStyleUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStyleFile = (file: File) => {
    setStyleFile(file);
    setStylePreview(URL.createObjectURL(file));
  };

  const handleGenerate = async () => {
    if (!concept.trim()) {
      setError(t.prompt.errorEmpty);
      return;
    }
    setError(null);
    setGenerating(true);

    initProject({ concept, genre, tone, targetDuration: duration, aspectRatio, visualStyle });
    const projectId = useProjectStore.getState().id;

    try {
      // Upload style reference if provided
      if (styleFile) {
        setStyleUploading(true);
        const fd = new FormData();
        fd.append("file", styleFile);
        const styleRes = await fetch("/api/style/analyze", { method: "POST", body: fd });
        if (styleRes.ok) {
          const { blobUrl, styleAnalysis } = await styleRes.json() as { blobUrl: string; styleAnalysis: string };
          setStyleReference(
            { url: blobUrl, width: 0, height: 0 },
            styleAnalysis
          );
        }
        setStyleUploading(false);
      }

      // Persist project to DB before generating story
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId, concept, genre, tone, targetDuration: duration, aspectRatio, visualStyle }),
      });

      // Consume SSE stream from story generation
      const res = await fetch("/api/story/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept, genre, tone, targetDuration: duration, aspectRatio, visualStyle }),
      });
      if (!res.ok) throw new Error(await res.text());

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const evt = JSON.parse(line.slice(6)) as { status: string; message?: string; story?: unknown; scores?: unknown; error?: string };
          if (evt.status === "thinking" && evt.message) {
            setGeneratingMessage(evt.message);
          } else if (evt.status === "evaluating" && evt.message) {
            setGeneratingMessage(evt.message);
          } else if (evt.status === "quality" && evt.scores) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            useProjectStore.getState().setStoryQuality(evt.scores as any);
          } else if (evt.status === "done" && evt.story) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            useProjectStore.getState().setStory(evt.story as any);
          } else if (evt.status === "error") {
            throw new Error(evt.error ?? "Story generation failed");
          }
        }
      }

      router.push(`/project/${projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.prompt.errorFail);
      setGenerating(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 className="font-display" style={{ fontSize: 36, color: "var(--text-display)", marginBottom: 8 }}>
        {t.prompt.heading}
      </h1>

      <div style={{ marginTop: 40, marginBottom: 32 }}>
        <label style={labelStyle}>{t.prompt.label}</label>
        <textarea
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder={t.prompt.placeholder}
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
          <label style={labelStyle}>{t.prompt.genre}</label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value as Genre)}
            style={{ ...underlineInput, fontFamily: "var(--font-space-mono), monospace", fontSize: 13 }}
          >
            {GENRES.map((g) => <option key={g} value={g}>{g.toUpperCase()}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>{t.prompt.tone}</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            style={{ ...underlineInput, fontFamily: "var(--font-space-mono), monospace", fontSize: 13 }}
          >
            {TONES.map((t2) => <option key={t2} value={t2}>{t2.toUpperCase()}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>{t.prompt.visualStyle}</label>
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
          <label style={labelStyle}>{t.prompt.duration}</label>
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
          <label style={labelStyle}>{t.prompt.aspectRatio}</label>
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
                  {ar} {ar === "9:16" ? t.prompt.vertical : t.prompt.cinematic}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Style reference upload */}
      <div style={{ marginBottom: 32 }}>
        <label style={labelStyle}>STYLE REFERENCE (OPTIONAL)</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) handleStyleFile(f); }}
          style={{
            border: "1px dashed var(--border-visible)",
            borderRadius: 8,
            padding: "20px 16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 16,
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--text-secondary)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-visible)")}
        >
          {stylePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={stylePreview} alt="style reference" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 4 }} />
          ) : (
            <div style={{ width: 64, height: 64, background: "var(--surface)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 24, color: "var(--text-disabled)" }}>+</span>
            </div>
          )}
          <div>
            <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: styleFile ? "var(--text-primary)" : "var(--text-secondary)" }}>
              {styleFile ? styleFile.name : "DROP IMAGE OR CLICK"}
            </p>
            <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "var(--text-disabled)", marginTop: 4 }}>
              Claude Vision will analyze and apply the style to all generated images
            </p>
            {styleUploading && (
              <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "var(--accent)", marginTop: 4 }}>
                [ANALYZING STYLE...]
              </p>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleStyleFile(f); }}
        />
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
        {generating ? (generatingMessage || t.prompt.generating) : t.prompt.generate}
      </button>
    </div>
  );
}
