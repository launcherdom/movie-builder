"use client";
import { useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { VideoPromptEditor } from "@/components/video/video-prompt-editor";
import type { Shot, VideoPromptJson } from "@/types/movie";

function buildDefaultVideoPromptJson(shot: Shot): VideoPromptJson {
  return {
    shot: {
      composition: shot.shotType + " shot, " + shot.description,
      lens: "standard cinematic lens",
      camera_movement: shot.cameraDirection ?? "static",
    },
    subject: {
      description: shot.description,
      wardrobe: "as described in scene",
      props: "none",
    },
    scene: {
      location: "as described in scene",
      time_of_day: "day",
      environment: "cinematic environment",
    },
    visual_details: {
      action: shot.description,
      special_effects: "none",
      hair_clothing_motion: "natural",
    },
    cinematography: {
      lighting: "cinematic lighting",
      color_palette: "natural tones",
      tone: "dramatic",
    },
    audio: {
      music: "background score",
      ambient: "natural ambience",
      sound_effects: "none",
      mix_level: "balanced",
    },
  };
}

function ShotVideoCard({ shot, shotIndex }: { shot: Shot; shotIndex: number }) {
  const { setShotVideo, setShotVideoStatus, setShotVideoPromptJson, qualityTier } = useProjectStore();
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const json = shot.videoPromptJson ?? buildDefaultVideoPromptJson(shot);

  const handleGenerate = async () => {
    if (!shot.storyboardPanel) {
      setError("No storyboard panel — generate panel first.");
      return;
    }
    if (!shot.videoPromptJson) {
      setShotVideoPromptJson(shot.id, json);
    }
    setError(null);
    setShotVideoStatus(shot.id, "generating");

    try {
      // Submit job
      const res = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shotId: shot.id,
          imageUrl: shot.storyboardPanel.url,
          videoPromptJson: shot.videoPromptJson ?? json,
          duration: shot.duration,
          qualityTier,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { requestId, endpoint } = await res.json();

      // Poll until done
      while (true) {
        await new Promise((r) => setTimeout(r, 4000));
        const poll = await fetch(`/api/video/status?requestId=${requestId}&endpoint=${encodeURIComponent(endpoint)}`);
        if (!poll.ok) throw new Error(await poll.text());
        const data = await poll.json();
        if (data.status === "COMPLETED") {
          setShotVideo(shot.id, data.video);
          break;
        }
        if (data.status === "error") {
          throw new Error(data.error ?? "Generation failed");
        }
        // IN_QUEUE or IN_PROGRESS — keep polling
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Video generation failed");
      setShotVideoStatus(shot.id, "error");
    }
  };

  return (
    <div style={{ marginBottom: 24, border: "1px solid var(--border)", borderRadius: "var(--radius-card)", overflow: "hidden", background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 12, color: "var(--text-secondary)" }}>
            SHOT {String(shotIndex + 1).padStart(2, "0")}
          </span>
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
          <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-disabled)" }}>
            {shot.duration}S
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {shot.videoStatus !== "idle" && (
            <span style={{
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 11,
              color: shot.videoStatus === "done" ? "var(--success)" : shot.videoStatus === "error" ? "var(--accent)" : "var(--text-secondary)",
            }}>
              [{shot.videoStatus.toUpperCase()}]
            </span>
          )}
          <button
            onClick={() => setExpanded((p) => !p)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontFamily: "var(--font-space-mono), monospace", fontSize: 11 }}
          >
            {expanded ? "▲ COLLAPSE" : "▼ EXPAND"}
          </button>
          <button
            onClick={handleGenerate}
            disabled={shot.videoStatus === "generating"}
            style={{
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: "transparent",
              border: "1px solid var(--border-visible)",
              borderRadius: "var(--radius-btn)",
              color: shot.videoStatus === "generating" ? "var(--text-disabled)" : "var(--text-primary)",
              padding: "6px 16px",
              cursor: shot.videoStatus === "generating" ? "not-allowed" : "pointer",
            }}
          >
            {shot.videoStatus === "generating" ? "[GENERATING...]" : "▶ GENERATE"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 0 }}>
        {shot.storyboardPanel && (
          <div style={{ width: 160, flexShrink: 0, padding: 16, borderRight: "1px solid var(--border)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot.storyboardPanel.url} alt="panel" style={{ width: "100%", borderRadius: 4 }} />
          </div>
        )}
        {shot.videoClip && (
          <div style={{ flex: 1, padding: 16 }}>
            <video src={shot.videoClip.url} controls style={{ width: "100%", borderRadius: 4 }} />
          </div>
        )}
      </div>

      {error && (
        <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--accent)", padding: "0 20px 8px" }}>
          [ERROR: {error}]
        </p>
      )}

      {expanded && (
        <div style={{ padding: "0 20px 20px" }}>
          <VideoPromptEditor shotId={shot.id} json={json} />
        </div>
      )}
    </div>
  );
}

export function VideoStep() {
  const { story, setGenerating, qualityTier } = useProjectStore();
  const projectId = useProjectStore((s) => s.id);
  const [assembling, setAssembling] = useState(false);
  const [assembledUrl, setAssembledUrl] = useState<string | null>(null);
  const [assembleError, setAssembleError] = useState<string | null>(null);

  if (!story) {
    return (
      <p style={{ fontFamily: "var(--font-space-mono), monospace", color: "var(--text-secondary)", fontSize: 13 }}>
        [NO STORY — return to CONCEPT]
      </p>
    );
  }

  const allShots = story.scenes.flatMap((sc) => sc.shots);
  const doneClips = allShots.filter((sh) => sh.videoStatus === "done").length;
  const readyClips = allShots.filter((sh) => sh.videoStatus === "done" && sh.videoClip);

  const handleAssemble = async () => {
    setAssembling(true);
    setAssembleError(null);
    setAssembledUrl(null);
    try {
      const clips = readyClips.map((sh) => ({ url: sh.videoClip!.url, duration: sh.duration }));
      const res = await fetch("/api/video/assemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clips, projectId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      setAssembledUrl(url);
    } catch (e) {
      setAssembleError(e instanceof Error ? e.message : "Assembly failed");
    } finally {
      setAssembling(false);
    }
  };

  const handleGenerateAll = async () => {
    setGenerating(true, { current: 0, total: allShots.length });
    for (const shot of allShots) {
      if (shot.videoStatus === "done" || !shot.storyboardPanel) continue;
      try {
        const json = shot.videoPromptJson ?? buildDefaultVideoPromptJson(shot);
        useProjectStore.getState().setShotVideoStatus(shot.id, "generating");

        const res = await fetch("/api/video/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shotId: shot.id,
            imageUrl: shot.storyboardPanel.url,
            videoPromptJson: json,
            duration: shot.duration,
            qualityTier,
          }),
        });
        if (!res.ok) continue;
        const { requestId, endpoint } = await res.json();

        // Poll until done
        while (true) {
          await new Promise((r) => setTimeout(r, 4000));
          const poll = await fetch(`/api/video/status?requestId=${requestId}&endpoint=${encodeURIComponent(endpoint)}`);
          if (!poll.ok) break;
          const data = await poll.json();
          if (data.status === "COMPLETED") {
            useProjectStore.getState().setShotVideo(shot.id, data.video);
            break;
          }
          if (data.status === "error") break;
        }
      } catch {
        // continue with next shot
      }
    }
    setGenerating(false);
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 36, color: "var(--text-display)", marginBottom: 4 }}>
            05 — VIDEO
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
              CLIPS
            </span>
            <div style={{ display: "flex", gap: 2 }}>
              {Array.from({ length: Math.min(allShots.length, 24) }).map((_, i) => (
                <div key={i} style={{ width: 8, height: 8, background: i < doneClips ? "var(--success)" : "var(--border)" }} />
              ))}
            </div>
            <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-primary)" }}>
              {doneClips} / {allShots.length}
            </span>
          </div>
        </div>
        <button
          onClick={handleGenerateAll}
          style={{
            fontFamily: "var(--font-space-mono), monospace",
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            background: "transparent",
            border: "1px solid var(--border-visible)",
            borderRadius: "var(--radius-btn)",
            color: "var(--text-primary)",
            padding: "8px 20px",
            cursor: "pointer",
          }}
        >
          GENERATE ALL
        </button>
      </div>

      {story.scenes.map((scene, si) => (
        <div key={scene.id} style={{ marginBottom: 40 }}>
          <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, letterSpacing: "0.08em", color: "var(--accent)", marginBottom: 12 }}>
            SCENE {String(si + 1).padStart(2, "0")} — {scene.heading}
          </p>
          {scene.shots.map((shot, shi) => (
            <ShotVideoCard key={shot.id} shot={shot} shotIndex={shi} />
          ))}
        </div>
      ))}

      {/* Assembly section */}
      {readyClips.length > 0 && (
        <div style={{ marginTop: 48, borderTop: "1px solid var(--border-visible)", paddingTop: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 13, color: "var(--text-display)", letterSpacing: "0.08em" }}>
                ASSEMBLE & EXPORT
              </p>
              <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                {readyClips.length} CLIPS → CONCAT → MP4
              </p>
            </div>
            <button
              onClick={handleAssemble}
              disabled={assembling}
              style={{
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 12,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: assembling ? "var(--border)" : "var(--text-display)",
                color: assembling ? "var(--text-disabled)" : "var(--black)",
                border: "none",
                borderRadius: "var(--radius-btn)",
                padding: "12px 32px",
                cursor: assembling ? "not-allowed" : "pointer",
              }}
            >
              {assembling ? "[ASSEMBLING...]" : "▶ ASSEMBLE"}
            </button>
          </div>

          {assembleError && (
            <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--accent)" }}>
              [ERROR: {assembleError}]
            </p>
          )}

          {assembledUrl && (
            <div style={{ marginTop: 16 }}>
              <video src={assembledUrl} controls style={{ width: "100%", borderRadius: "var(--radius-card)", marginBottom: 16 }} />
              <a
                href={assembledUrl}
                download="movie.mp4"
                style={{
                  display: "inline-block",
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 12,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  background: "transparent",
                  border: "1px solid var(--border-visible)",
                  borderRadius: "var(--radius-btn)",
                  color: "var(--text-primary)",
                  padding: "10px 28px",
                  textDecoration: "none",
                }}
              >
                ↓ DOWNLOAD MP4
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
