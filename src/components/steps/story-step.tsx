"use client";
import { useProjectStore } from "@/stores/project-store";
import { useLangStore } from "@/stores/lang-store";

export function StoryStep() {
  const { story, setCurrentStep } = useProjectStore();
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
              <p style={{
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 12,
                letterSpacing: "0.08em",
                color: "var(--accent)",
                marginBottom: 8,
              }}>
                {t.story.scene} {String(si + 1).padStart(2, "0")} — {scene.heading}
              </p>
              <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 14, color: "var(--text-secondary)", marginBottom: 12 }}>
                {scene.description}
              </p>
              {scene.shots.map((shot) => (
                <div key={shot.id} style={{ display: "flex", gap: 12, marginBottom: 8, alignItems: "flex-start" }}>
                  <span style={{
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 11,
                    border: "1px solid var(--border-visible)",
                    borderRadius: 4,
                    padding: "2px 8px",
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                  }}>
                    {shot.shotType}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 11,
                    color: "var(--text-disabled)",
                    whiteSpace: "nowrap",
                  }}>
                    {shot.duration}S
                  </span>
                  <span style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 14, color: "var(--text-primary)" }}>
                    {shot.description}
                  </span>
                </div>
              ))}
              {scene.shots.filter((s) => s.dialogue).map((shot) => (
                <p key={`d-${shot.id}`} style={{
                  fontFamily: "var(--font-space-grotesk), sans-serif",
                  fontSize: 14,
                  fontStyle: "italic",
                  color: "var(--text-secondary)",
                  paddingLeft: 24,
                  marginTop: 4,
                }}>
                  &ldquo;{shot.dialogue}&rdquo;
                </p>
              ))}
            </div>
          ))}
        </div>

        {/* Right: character list */}
        <div>
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
