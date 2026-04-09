"use client";
import { useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { useLangStore } from "@/stores/lang-store";
import { VideoPromptEditor } from "@/components/video/video-prompt-editor";
import { generationQueue } from "@/lib/generation/queue";
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

import type { GeneratedVideo } from "@/types/movie";
import { CostBadge } from "@/components/ui/cost-badge";

async function pollVideo(requestId: string, endpoint: string): Promise<GeneratedVideo> {
  while (true) {
    await new Promise((r) => setTimeout(r, 4000));
    const poll = await fetch(`/api/video/status?requestId=${requestId}&endpoint=${encodeURIComponent(endpoint)}`);
    if (!poll.ok) throw new Error(await poll.text());
    const data = await poll.json();
    if (data.status === "COMPLETED") return data.video as GeneratedVideo;
    if (data.status === "error") throw new Error(data.error ?? "Generation failed");
  }
}

function ShotVideoCard({ shot, shotIndex, sceneDescription }: { shot: Shot; shotIndex: number; sceneDescription: string }) {
  const store = useProjectStore();
  const { setShotVideo, setShotVideoStatus, setShotVideoPromptJson, setShotKeyframe, setShotKeyframeStatus, qualityTier, aspectRatio, visualStyle, story } = store;
  const { t } = useLangStore();
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const json = shot.videoPromptJson ?? buildDefaultVideoPromptJson(shot);

  const handleGenerateKeyframe = async () => {
    if (!shot.storyboardPanel) {
      setError(t.video.noPanel);
      return;
    }
    setError(null);
    setShotKeyframeStatus(shot.id, "generating");
    try {
      const res = await fetch("/api/keyframe/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shots: [shot],
          sceneDescription,
          characters: story?.characters ?? [],
          qualityTier,
          visualStyle,
          aspectRatio,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { results } = await res.json();
      const r = results?.[0];
      if (r?.keyframe) {
        setShotKeyframe(shot.id, r.keyframe, r.prompt);
      } else {
        throw new Error("No keyframe returned");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Keyframe generation failed");
      setShotKeyframeStatus(shot.id, "error");
    }
  };

  const handleGenerate = async () => {
    const imageUrl = shot.keyframeImage?.url ?? shot.storyboardPanel?.url;
    if (!imageUrl) {
      setError(t.video.noPanel);
      return;
    }
    if (!shot.videoPromptJson) setShotVideoPromptJson(shot.id, json);
    setError(null);
    setShotVideoStatus(shot.id, "generating");
    try {
      const res = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shotId: shot.id,
          imageUrl,
          videoPromptJson: shot.videoPromptJson ?? json,
          duration: shot.duration,
          qualityTier,
          aspectRatio,
          projectId: useProjectStore.getState().id,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { requestId, endpoint } = await res.json();
      const video = await pollVideo(requestId, endpoint);
      setShotVideo(shot.id, video);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.video.errorFail);
      setShotVideoStatus(shot.id, "error");
    }
  };

  const isGeneratingKeyframe = shot.keyframeStatus === "generating";
  const isGeneratingVideo = shot.videoStatus === "generating";
  const hasSourceImage = !!(shot.keyframeImage ?? shot.storyboardPanel);

  return (
    <div style={{ marginBottom: 24, border: "1px solid var(--border)", borderRadius: "var(--radius-card)", overflow: "hidden", background: "var(--surface)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 12, color: "var(--text-secondary)" }}>
            SHOT {String(shotIndex + 1).padStart(2, "0")}
          </span>
          <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 10, border: "1px solid var(--border-visible)", borderRadius: 4, padding: "1px 6px", color: "var(--text-primary)" }}>
            {shot.shotType}
          </span>
          <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-disabled)" }}>
            {shot.duration}S
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {shot.videoStatus !== "idle" && (
            <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: shot.videoStatus === "done" ? "var(--success)" : shot.videoStatus === "error" ? "var(--accent)" : "var(--text-secondary)" }}>
              [{shot.videoStatus.toUpperCase()}]
            </span>
          )}
          <button
            onClick={() => setExpanded((p) => !p)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontFamily: "var(--font-space-mono), monospace", fontSize: 11 }}
          >
            {expanded ? "▲" : "▼"}
          </button>
          {/* Keyframe button */}
          <button
            onClick={handleGenerateKeyframe}
            disabled={isGeneratingKeyframe || isGeneratingVideo}
            style={{
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.06em",
              background: "transparent",
              border: `1px solid ${shot.keyframeImage ? "var(--success)" : "var(--border-visible)"}`,
              borderRadius: "var(--radius-btn)",
              color: isGeneratingKeyframe ? "var(--text-disabled)" : shot.keyframeImage ? "var(--success)" : "var(--text-primary)",
              padding: "6px 14px",
              cursor: (isGeneratingKeyframe || isGeneratingVideo) ? "not-allowed" : "pointer",
            }}
          >
            {isGeneratingKeyframe ? t.video.generatingKeyframe : t.video.generateKeyframe}
          </button>
          {/* Video button */}
          <button
            onClick={handleGenerate}
            disabled={isGeneratingVideo || isGeneratingKeyframe || !hasSourceImage}
            style={{
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.06em",
              background: "transparent",
              border: "1px solid var(--border-visible)",
              borderRadius: "var(--radius-btn)",
              color: (isGeneratingVideo || !hasSourceImage) ? "var(--text-disabled)" : "var(--text-primary)",
              padding: "6px 16px",
              cursor: (isGeneratingVideo || isGeneratingKeyframe || !hasSourceImage) ? "not-allowed" : "pointer",
            }}
          >
            {isGeneratingVideo ? "[GENERATING...]" : "▶ GENERATE"}
          </button>
        </div>
      </div>

      {/* Image strip: storyboard → keyframe → video */}
      <div style={{ display: "flex" }}>
        {shot.storyboardPanel && (
          <div style={{ width: 140, flexShrink: 0, padding: 12, borderRight: "1px solid var(--border)" }}>
            <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 9, color: "var(--text-disabled)", marginBottom: 6, letterSpacing: "0.08em" }}>BOARD</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot.storyboardPanel.url} alt="storyboard" style={{ width: "100%", borderRadius: 4, opacity: 0.7 }} />
          </div>
        )}
        {(shot.keyframeImage || shot.keyframeStatus === "generating") && (
          <div style={{ width: 160, flexShrink: 0, padding: 12, borderRight: "1px solid var(--border)" }}>
            <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 9, color: "var(--text-secondary)", marginBottom: 6, letterSpacing: "0.08em" }}>{t.video.keyframe}</p>
            {shot.keyframeImage
              ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={shot.keyframeImage.url} alt="keyframe" style={{ width: "100%", borderRadius: 4 }} />
              : <div style={{ width: "100%", aspectRatio: "9/16", background: "var(--border)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 9, color: "var(--text-disabled)" }}>...</span>
                </div>
            }
          </div>
        )}
        {shot.videoClip && (
          <div style={{ flex: 1, padding: 12 }}>
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
  const { story, setGenerating, qualityTier, aspectRatio, visualStyle } = useProjectStore();
  const { t } = useLangStore();
  const [assembling, setAssembling] = useState(false);
  const [assembledUrl, setAssembledUrl] = useState<string | null>(null);
  const [assembleError, setAssembleError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  if (!story) {
    return (
      <p style={{ fontFamily: "var(--font-space-mono), monospace", color: "var(--text-secondary)", fontSize: 13 }}>
        {t.video.noStory}
      </p>
    );
  }

  const allShots = story.scenes.flatMap((sc) => sc.shots);
  const doneClips = allShots.filter((sh) => sh.videoStatus === "done").length;
  const readyClips = allShots.filter((sh) => sh.videoStatus === "done" && sh.videoClip);

  const handleExportCapcut = async () => {
    setExporting(true);
    try {
      const { aspectRatio } = useProjectStore.getState();
      const res = await fetch("/api/export/capcut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story, aspectRatio }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${story.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_capcut.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("CapCut export failed:", e);
    } finally {
      setExporting(false);
    }
  };

  const handleAssemble = async () => {
    setAssembling(true);
    setAssembleError(null);
    setAssembledUrl(null);
    try {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile, toBlobURL } = await import("@ffmpeg/util");
      const ffmpeg = new FFmpeg();
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      const clipUrls = readyClips.map((sh) => sh.videoClip!.url);
      for (let i = 0; i < clipUrls.length; i++) {
        await ffmpeg.writeFile(`clip${i}.mp4`, await fetchFile(clipUrls[i]));
      }
      await ffmpeg.writeFile("list.txt", clipUrls.map((_, i) => `file 'clip${i}.mp4'`).join("\n"));
      await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "output.mp4"]);
      const data = await ffmpeg.readFile("output.mp4");
      setAssembledUrl(URL.createObjectURL(new Blob([new Uint8Array(data as Uint8Array)], { type: "video/mp4" })));
    } catch (e) {
      setAssembleError(e instanceof Error ? e.message : t.video.assemblyFail);
    } finally {
      setAssembling(false);
    }
  };

  const handleGenerateAll = async () => {
    const store = useProjectStore.getState();
    const allPairs = story.scenes.flatMap((sc) => sc.shots.map((sh) => ({ shot: sh, scene: sc })));
    // Include shots that have at least a storyboard panel (keyframe optional)
    const toProcess = allPairs.filter(({ shot }) => shot.videoStatus !== "done" && (shot.storyboardPanel || shot.keyframeImage));

    setGenerating(true, { current: 0, total: toProcess.length });

    // Generate all videos (max 1 concurrent via queue), using keyframe > storyboard panel as source
    for (const { shot } of toProcess) {
      await generationQueue.enqueueVideo(async () => {
        const freshShot = useProjectStore.getState().story?.scenes
          .flatMap((sc) => sc.shots).find((sh) => sh.id === shot.id);
        const imageUrl = freshShot?.keyframeImage?.url ?? freshShot?.storyboardPanel?.url;
        if (!imageUrl || !freshShot) return;
        const json = freshShot.videoPromptJson ?? buildDefaultVideoPromptJson(freshShot);
        store.setShotVideoStatus(shot.id, "generating");
        try {
          const res = await fetch("/api/video/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              shotId: shot.id,
              imageUrl,
              videoPromptJson: json,
              duration: shot.duration,
              qualityTier,
              aspectRatio,
              projectId: useProjectStore.getState().id,
            }),
          });
          if (!res.ok) { store.setShotVideoStatus(shot.id, "error"); return; }
          const { requestId, endpoint } = await res.json();
          const video = await pollVideo(requestId, endpoint);
          store.setShotVideo(shot.id, video);
        } catch {
          store.setShotVideoStatus(shot.id, "error");
        }
      });
    }

    setGenerating(false);
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 36, color: "var(--text-display)", marginBottom: 4 }}>
            {t.video.heading}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
              {t.video.clips}
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
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <CostBadge scope="video" />
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
            {t.video.generateAll}
          </button>
        </div>
      </div>

      {story.scenes.map((scene, si) => (
        <div key={scene.id} style={{ marginBottom: 40 }}>
          <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, letterSpacing: "0.08em", color: "var(--accent)", marginBottom: 12 }}>
            SCENE {String(si + 1).padStart(2, "0")} — {scene.heading}
          </p>
          {scene.shots.map((shot, shi) => (
            <ShotVideoCard key={shot.id} shot={shot} shotIndex={shi} sceneDescription={scene.description} />
          ))}
        </div>
      ))}

      {/* CapCut export — available whenever any shots exist */}
      <div style={{ marginTop: 32, display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleExportCapcut}
          disabled={exporting}
          style={{
            fontFamily: "var(--font-space-mono), monospace",
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            background: "transparent",
            border: "1px solid var(--border-visible)",
            borderRadius: "var(--radius-btn)",
            color: exporting ? "var(--text-disabled)" : "var(--text-secondary)",
            padding: "8px 20px",
            cursor: exporting ? "not-allowed" : "pointer",
          }}
        >
          {exporting ? "[EXPORTING...]" : "EXPORT TO CAPCUT"}
        </button>
      </div>

      {/* Assembly section */}
      {readyClips.length > 0 && (
        <div style={{ marginTop: 48, borderTop: "1px solid var(--border-visible)", paddingTop: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 13, color: "var(--text-display)", letterSpacing: "0.08em" }}>
                {t.video.assemble}
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
              {assembling ? t.video.assembling : t.video.assembleBtn}
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
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
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
                  {t.video.download}
                </a>
                <button
                  onClick={handleExportCapcut}
                  disabled={exporting}
                  style={{
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 12,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    background: "transparent",
                    border: "1px solid var(--border-visible)",
                    borderRadius: "var(--radius-btn)",
                    color: exporting ? "var(--text-disabled)" : "var(--text-primary)",
                    padding: "10px 28px",
                    cursor: exporting ? "not-allowed" : "pointer",
                  }}
                >
                  {exporting ? "[EXPORTING...]" : "EXPORT TO CAPCUT"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
