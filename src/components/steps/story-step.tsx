"use client";
import { useState, useRef } from "react";
import { useProjectStore } from "@/stores/project-store";
import { useLangStore } from "@/stores/lang-store";
import type { ShotType } from "@/types/movie";

const SHOT_TYPES: ShotType[] = ["CU", "MCU", "MS", "MWS", "WS", "EWS", "OTS", "POV", "HIGH", "LOW"];

function EditableText({
  value,
  onSave,
  multiline = false,
  style,
}: {
  value: string;
  onSave: (v: string) => void;
  multiline?: boolean;
  style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value) onSave(draft.trim() || value);
  };

  if (editing) {
    const shared: React.CSSProperties = {
      ...style,
      background: "var(--surface)",
      border: "1px solid var(--border-visible)",
      borderRadius: 4,
      color: "var(--text-primary)",
      padding: "4px 8px",
      outline: "none",
      resize: "vertical" as const,
      width: "100%",
      fontFamily: "inherit",
      fontSize: "inherit",
    };
    return multiline ? (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        rows={3}
        style={shared}
      />
    ) : (
      <input
        ref={ref as React.RefObject<HTMLInputElement>}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        style={{ ...shared, display: "block" }}
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Click to edit"
      style={{
        ...style,
        cursor: "text",
        borderBottom: "1px dashed var(--border-visible)",
        paddingBottom: 1,
      }}
    >
      {value}
    </span>
  );
}

const iconBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--text-disabled)",
  fontFamily: "var(--font-space-mono), monospace",
  fontSize: 12,
  padding: "2px 6px",
  borderRadius: 4,
  lineHeight: 1,
};

function QualityBar({ label, score }: { label: string; score: number }) {
  const pct = Math.round((score / 10) * 100);
  const color = score >= 8 ? "var(--success)" : score >= 6 ? "var(--text-primary)" : "var(--accent)";
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
          {label.toUpperCase()}
        </span>
        <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color }}>
          {score}/10
        </span>
      </div>
      <div style={{ height: 3, background: "var(--border)", borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

export function StoryStep() {
  const { story, storyQuality, setCurrentStep, updateScene, updateShotField, addScene, removeScene, addShot, removeShot, duplicateShot } = useProjectStore();
  const { t } = useLangStore();

  if (!story) {
    return (
      <p style={{ fontFamily: "var(--font-space-mono), monospace", color: "var(--text-secondary)", fontSize: 13 }}>
        {t.story.noStory}
      </p>
    );
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 className="font-display" style={{ fontSize: 36, color: "var(--text-display)", marginBottom: 4 }}>
        {t.story.heading}
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 48, marginTop: 32 }}>
        {/* Left: screenplay */}
        <div>
          <h2 style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 24, color: "var(--text-display)", marginBottom: 4 }}>
            {story.title}
          </h2>
          <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 14, color: "var(--text-secondary)", fontStyle: "italic", marginBottom: 32 }}>
            {story.logline}
          </p>

          {story.scenes.map((scene, si) => (
            <div key={scene.id} style={{ marginBottom: 32 }}>
              {/* Scene heading */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 12, letterSpacing: "0.08em", color: "var(--accent)", whiteSpace: "nowrap" }}>
                  {t.story.scene} {String(si + 1).padStart(2, "0")} —
                </span>
                <EditableText
                  value={scene.heading}
                  onSave={(v) => updateScene(scene.id, { heading: v })}
                  style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 12, letterSpacing: "0.08em", color: "var(--accent)" }}
                />
                {/* Scene actions */}
                <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
                  <button style={iconBtn} title="Add shot" onClick={() => addShot(scene.id, scene.shots.length - 1)}>+ SHOT</button>
                  {story.scenes.length > 1 && (
                    <button style={{ ...iconBtn, color: "var(--accent)" }} title="Remove scene" onClick={() => removeScene(scene.id)}>× SCENE</button>
                  )}
                </div>
              </div>

              {/* Scene description */}
              <div style={{ marginBottom: 12 }}>
                <EditableText
                  value={scene.description}
                  onSave={(v) => updateScene(scene.id, { description: v })}
                  multiline
                  style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 14, color: "var(--text-secondary)" }}
                />
              </div>

              {/* Shots */}
              {scene.shots.map((shot) => (
                <div key={shot.id} style={{ marginBottom: 12, paddingLeft: 12, borderLeft: "2px solid var(--border)" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 4 }}>
                    {/* Shot type selector */}
                    <select
                      value={shot.shotType}
                      onChange={(e) => updateShotField(shot.id, { shotType: e.target.value as ShotType })}
                      style={{
                        fontFamily: "var(--font-space-mono), monospace",
                        fontSize: 10,
                        border: "1px solid var(--border-visible)",
                        borderRadius: 4,
                        padding: "2px 4px",
                        color: "var(--text-primary)",
                        background: "var(--surface)",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      {SHOT_TYPES.map((st) => <option key={st} value={st}>{st}</option>)}
                    </select>
                    {/* Duration */}
                    <input
                      type="number"
                      min={3}
                      max={8}
                      value={shot.duration}
                      onChange={(e) => updateShotField(shot.id, { duration: Number(e.target.value) })}
                      style={{
                        fontFamily: "var(--font-space-mono), monospace",
                        fontSize: 11,
                        width: 44,
                        border: "1px solid var(--border-visible)",
                        borderRadius: 4,
                        padding: "2px 4px",
                        color: "var(--text-disabled)",
                        background: "var(--surface)",
                        flexShrink: 0,
                        textAlign: "center",
                      }}
                    />
                    <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-disabled)", flexShrink: 0, marginTop: 2 }}>S</span>
                    {/* Shot description */}
                    <EditableText
                      value={shot.description}
                      onSave={(v) => updateShotField(shot.id, { description: v })}
                      style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 14, color: "var(--text-primary)", flex: 1 }}
                    />
                    {/* Shot actions */}
                    <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                      <button style={iconBtn} title="Duplicate shot" onClick={() => duplicateShot(shot.id)}>⧉</button>
                      {scene.shots.length > 1 && (
                        <button style={{ ...iconBtn, color: "var(--accent)" }} title="Remove shot" onClick={() => removeShot(shot.id)}>×</button>
                      )}
                    </div>
                  </div>
                  {/* Dialogue */}
                  {shot.dialogue !== undefined && (
                    <div style={{ paddingLeft: 80 }}>
                      <EditableText
                        value={shot.dialogue}
                        onSave={(v) => updateShotField(shot.id, { dialogue: v })}
                        style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 13, fontStyle: "italic", color: "var(--text-secondary)" }}
                      />
                    </div>
                  )}
                </div>
              ))}

              {/* Add scene after this one */}
              <button
                onClick={() => addScene(si)}
                style={{ ...iconBtn, color: "var(--text-disabled)", fontSize: 11, marginTop: 8, padding: "4px 10px", border: "1px dashed var(--border-visible)" }}
              >
                + ADD SCENE
              </button>
            </div>
          ))}
        </div>

        {/* Right: character list */}
        <div>
          {storyQuality && (
            <div style={{ marginBottom: 28, padding: "16px 20px", border: "1px solid var(--border)", borderRadius: "var(--radius-card)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
                  QUALITY SCORE
                </span>
                <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 13, color: storyQuality.overallScore >= 7 ? "var(--success)" : "var(--accent)" }}>
                  {storyQuality.overallScore.toFixed(1)}/10
                </span>
              </div>
              <QualityBar label="Pacing" score={storyQuality.pacing} />
              <QualityBar label="Hooks" score={storyQuality.hooks} />
              <QualityBar label="Dialogue" score={storyQuality.dialogue} />
              <QualityBar label="Visual Clarity" score={storyQuality.visualClarity} />
              <QualityBar label="Continuity" score={storyQuality.continuity} />
              {(storyQuality.suggestions ?? []).length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                  {(storyQuality.suggestions ?? []).map((s, i) => (
                    <p key={i} style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "var(--text-secondary)", marginBottom: 4, lineHeight: 1.5 }}>
                      {String(i + 1).padStart(2, "0")}. {s}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
          <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, letterSpacing: "0.08em", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: 16 }}>
            {t.story.characters} — {story.characters.length}
          </p>
          {story.characters.map((char) => (
            <div key={char.id} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--border)" }}>
              <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 16, color: "var(--text-display)", marginBottom: 2 }}>
                {char.name.toUpperCase()}
              </p>
              <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-secondary)" }}>
                {[char.age, char.gender].filter(Boolean).join(" · ")}
              </p>
              <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                {char.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => setCurrentStep("characters")}
        style={{
          marginTop: 32,
          fontFamily: "var(--font-space-mono), monospace",
          fontSize: 12,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: "var(--text-display)",
          color: "var(--black)",
          border: "none",
          borderRadius: "var(--radius-btn)",
          padding: "12px 32px",
          cursor: "pointer",
        }}
      >
        {t.story.next}
      </button>
    </div>
  );
}
