"use client";
import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { nanoid } from "nanoid";
import { useProjectStore } from "@/stores/project-store";
import { useLangStore } from "@/stores/lang-store";
import { VideoPromptEditor } from "@/components/video/video-prompt-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { generationQueue } from "@/lib/generation/queue";
import type { Shot, Scene, VideoPromptJson, Character, GeneratedVideo } from "@/types/movie";

// Map common direction words to Seedance-recognized cinematic camera vocabulary
function toCinematicMovement(raw?: string): string {
  if (!raw) return "static camera";
  const r = raw.toLowerCase();
  if (r.includes("dolly") || r.includes("push") || r.includes("pull")) return "dolly shot";
  if (r.includes("track") || r.includes("follow")) return "tracking shot";
  if (r.includes("pan")) return "slow pan";
  if (r.includes("orbit") || r.includes("arc")) return "orbiting shot";
  if (r.includes("handheld") || r.includes("hand held")) return "handheld";
  if (r.includes("zoom")) return "slow zoom";
  if (r.includes("tilt")) return "tilt";
  if (r.includes("crane") || r.includes("rise") || r.includes("descend")) return "crane shot";
  if (r.includes("static") || r.includes("lock")) return "static camera";
  return raw;
}

function buildDefaultVideoPromptJson(shot: Shot, sceneCharacters: Character[] = []): VideoPromptJson {
  const charAnchors = sceneCharacters
    .filter((c) => c.description)
    .map((c) => c.description)
    .join(" | ");
  const subjectDescription = charAnchors
    ? `${charAnchors}. ${shot.description}`
    : shot.description;

  return {
    dialogue: shot.dialogue,
    shot: {
      composition: shot.shotType + " shot",
      lens: "standard cinematic lens",
      camera_movement: toCinematicMovement(shot.cameraDirection),
    },
    subject: {
      description: subjectDescription,
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
      hair_clothing_motion: "natural fabric motion",
    },
    cinematography: {
      lighting: "natural cinematic lighting, soft shadows",
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

function buildSceneShotsPayload(
  scene: Scene,
  characters: Character[]
): Array<{ prompt: VideoPromptJson; startTime: number; endTime: number }> {
  const sceneChars = characters.filter((c) => scene.characterIds.includes(c.id));
  let cursor = 0;
  return scene.shots.map((shot) => {
    const start = cursor;
    const end = cursor + shot.duration;
    cursor = end;
    const prompt = shot.videoPromptJson ?? buildDefaultVideoPromptJson(shot, sceneChars);
    return { prompt, startTime: start, endTime: end };
  });
}

function SceneVideoCard({
  scene,
  sceneIndex,
}: {
  scene: Scene;
  sceneIndex: number;
}) {
  const store = useProjectStore();
  const { setSceneVideo, setSceneVideoStatus, aspectRatio, story } = store;
  const { t } = useLangStore();
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = scene.sceneVideoStatus ?? "idle";
  const isGenerating = status === "generating";

  // Require at least one shot with a storyboard panel
  const hasPanels = scene.shots.some((sh) => sh.storyboardPanel?.url?.startsWith("http"));
  const totalDuration = Math.min(scene.shots.reduce((s, sh) => s + sh.duration, 0), 15);

  const handleGenerate = async () => {
    if (!hasPanels) {
      setError("Generate storyboard panels first");
      return;
    }
    setError(null);
    setSceneVideoStatus(scene.id, "generating");

    try {
      const characters = story?.characters ?? [];
      // Use scene-specific chars; fall back to all characters if characterIds don't match
      let sceneChars = characters.filter((c) => scene.characterIds.includes(c.id));
      if (sceneChars.length === 0 && characters.length > 0) sceneChars = characters;

      // Character sheets first, then up to 3 storyboard panels from this scene
      const charSheetUrls = sceneChars
        .map((c) => c.characterSheet?.url)
        .filter((u): u is string => !!u && u.startsWith("http"));
      const panelUrls = scene.shots
        .map((sh) => sh.storyboardPanel?.url)
        .filter((u): u is string => !!u && u.startsWith("http"))
        .slice(0, 3);
      const referenceImageUrls = [...charSheetUrls, ...panelUrls].slice(0, 9);

      // Labels tell Seedance what each @Image represents — critical for identity anchoring
      const referenceLabels = [
        ...sceneChars.filter((c) => c.characterSheet?.url?.startsWith("http")).map((c) => `${c.name} character sheet`),
        ...panelUrls.map((_, i) => `scene storyboard panel ${i + 1}`),
      ].slice(0, 9);

      if (referenceImageUrls.length === 0) {
        throw new Error("No valid reference images");
      }

      const shots = buildSceneShotsPayload(scene, characters);

      const res = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId: scene.id,
          referenceImageUrls,
          referenceLabels,
          shots,
          totalDuration,
          scene: { location: scene.location, timeOfDay: scene.timeOfDay },
          aspectRatio,
          projectId: useProjectStore.getState().id,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { requestId, endpoint } = await res.json();
      const video = await pollVideo(requestId, endpoint);
      setSceneVideo(scene.id, video);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.video.errorFail);
      setSceneVideoStatus(scene.id, "error");
    }
  };

  return (
    <div style={{ marginBottom: 24, border: "1px solid var(--border)", borderRadius: "var(--radius-card)", overflow: "hidden", background: "var(--surface)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 12, color: "var(--accent)", letterSpacing: "0.08em" }}>
            SCENE {String(sceneIndex + 1).padStart(2, "0")}
          </span>
          <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-primary)" }}>
            {scene.heading}
          </span>
          <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "var(--text-disabled)" }}>
            {scene.shots.length} CUTS · {totalDuration}S
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {status !== "idle" && (
            <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: status === "done" ? "var(--success)" : status === "error" ? "var(--accent)" : "var(--text-secondary)" }}>
              [{status.toUpperCase()}]
            </span>
          )}
          <button
            onClick={() => setExpanded((p) => !p)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontFamily: "var(--font-space-mono), monospace", fontSize: 11 }}
          >
            {expanded ? "▲" : "▼"}
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !hasPanels}
            style={{
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.06em",
              background: "transparent",
              border: "1px solid var(--border-visible)",
              borderRadius: "var(--radius-btn)",
              color: (isGenerating || !hasPanels) ? "var(--text-disabled)" : "var(--text-primary)",
              padding: "6px 16px",
              cursor: (isGenerating || !hasPanels) ? "not-allowed" : "pointer",
            }}
          >
            {isGenerating ? "[GENERATING...]" : "▶ GENERATE"}
          </button>
        </div>
      </div>

      {/* Storyboard strip + video */}
      <div style={{ display: "flex", gap: 0 }}>
        {/* Shot thumbnails */}
        <div style={{ display: "flex", gap: 0, borderRight: "1px solid var(--border)", overflow: "hidden" }}>
          {scene.shots.map((shot, shi) => (
            <div key={shot.id} style={{ width: 80, flexShrink: 0, padding: 8, borderRight: shi < scene.shots.length - 1 ? "1px solid var(--border)" : "none" }}>
              <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 8, color: "var(--text-disabled)", marginBottom: 4, letterSpacing: "0.08em" }}>
                {shot.shotType} {shot.duration}S
              </p>
              {shot.storyboardPanel ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shot.storyboardPanel.url}
                  alt={`shot ${shi + 1}`}
                  style={{ width: "100%", borderRadius: 3, opacity: 0.75 }}
                />
              ) : (
                <div style={{ width: "100%", aspectRatio: "9/16", background: "var(--border)", borderRadius: 3 }} />
              )}
            </div>
          ))}
        </div>

        {/* Scene video */}
        {scene.sceneVideoClip ? (
          <div style={{ flex: 1, padding: 12 }}>
            <video src={scene.sceneVideoClip.url} controls style={{ width: "100%", borderRadius: 4 }} />
          </div>
        ) : isGenerating ? (
          <div style={{ flex: 1, padding: 12 }}>
            <Skeleton width="100%" height={200} borderRadius={4} />
          </div>
        ) : null}
      </div>

      {error && (
        <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--accent)", padding: "0 20px 8px" }}>
          [ERROR: {error}]
        </p>
      )}

      {/* Expanded: per-shot prompt editors */}
      {expanded && (
        <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "var(--text-disabled)", margin: "12px 0 8px", letterSpacing: "0.08em" }}>
            SHOT PROMPTS (edit before generating)
          </p>
          {scene.shots.map((shot, shi) => (
            <div key={shot.id} style={{ marginBottom: 16 }}>
              <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "var(--text-secondary)", marginBottom: 6 }}>
                SHOT {String(shi + 1).padStart(2, "0")} [{shot.shotType}] {shot.duration}S
                {shot.dialogue && ` — "${shot.dialogue}"`}
              </p>
              <VideoPromptEditor
                shotId={shot.id}
                json={shot.videoPromptJson ?? buildDefaultVideoPromptJson(shot, (story?.characters ?? []).filter((c) => scene.characterIds.includes(c.id)))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function VideoStep() {
  const { story, setGenerating, aspectRatio, visualStyle, setShotVideoPromptJson } = useProjectStore();
  const { t } = useLangStore();
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [promptsError, setPromptsError] = useState<string | null>(null);
  const [assembling, setAssembling] = useState(false);
  const [assembledUrl, setAssembledUrl] = useState<string | null>(null);
  const [assembleError, setAssembleError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [srt, setSrt] = useState<string | null>(null);
  const [generatingSrt, setGeneratingSrt] = useState(false);
  const [burningSubtitles, setBurningSubtitles] = useState(false);
  const [subtitledUrl, setSubtitledUrl] = useState<string | null>(null);
  const [subtitleError, setSubtitleError] = useState<string | null>(null);

  if (!story) {
    return (
      <p style={{ fontFamily: "var(--font-space-mono), monospace", color: "var(--text-secondary)", fontSize: 13 }}>
        {t.video.noStory}
      </p>
    );
  }

  const doneScenes = story.scenes.filter((sc) => sc.sceneVideoStatus === "done").length;
  const readyScenes = story.scenes.filter((sc) => sc.sceneVideoStatus === "done" && sc.sceneVideoClip);

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
      const clipUrls = readyScenes.map((sc) => sc.sceneVideoClip!.url);
      for (let i = 0; i < clipUrls.length; i++) {
        await ffmpeg.writeFile(`clip${i}.mp4`, await fetchFile(clipUrls[i]));
      }
      await ffmpeg.writeFile("list.txt", clipUrls.map((_, i) => `file 'clip${i}.mp4'`).join("\n"));
      await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "output.mp4"]);
      const data = await ffmpeg.readFile("output.mp4");
      const mp4Blob = new Blob([new Uint8Array(data as Uint8Array)], { type: "video/mp4" });

      // Upload directly to Vercel Blob (client-side, no 4MB API limit)
      try {
        const projectId = useProjectStore.getState().id;
        const blob = await upload(`assembled/${projectId}/output.mp4`, mp4Blob, {
          access: "public",
          handleUploadUrl: "/api/assets/upload",
          contentType: "video/mp4",
        });
        setAssembledUrl(blob.url);
      } catch {
        // Fallback to blob URL (BURN SUBTITLES won't work but video plays fine)
        setAssembledUrl(URL.createObjectURL(mp4Blob));
      }
    } catch (e) {
      setAssembleError(e instanceof Error ? e.message : t.video.assemblyFail);
    } finally {
      setAssembling(false);
    }
  };

  const handleGenerateSrt = async () => {
    setGeneratingSrt(true);
    setSubtitleError(null);
    try {
      const res = await fetch("/api/subtitles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { srt: generated } = await res.json();
      setSrt(generated);
    } catch (e) {
      setSubtitleError(e instanceof Error ? e.message : "SRT generation failed");
    } finally {
      setGeneratingSrt(false);
    }
  };

  const handleBurnSubtitles = async (videoUrl: string) => {
    if (!srt) return;
    setBurningSubtitles(true);
    setSubtitleError(null);
    setSubtitledUrl(null);
    try {
      const projectId = useProjectStore.getState().id;

      // blob: URLs are browser-local and unreachable from the server.
      // Re-upload to Vercel Blob first if the initial assembly upload failed.
      let httpVideoUrl = videoUrl;
      if (videoUrl.startsWith("blob:")) {
        const blobRes = await fetch(videoUrl);
        const blobContent = await blobRes.blob();
        const uploaded = await upload(
          `assembled/${projectId ?? "project"}/output.mp4`,
          blobContent,
          { access: "public", handleUploadUrl: "/api/assets/upload", contentType: "video/mp4" }
        );
        httpVideoUrl = uploaded.url;
        setAssembledUrl(httpVideoUrl);
      }

      // Server-side burn via /api/video/compose (native FFmpeg + bundled DejaVu font)
      const res = await fetch("/api/video/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: httpVideoUrl,
          srtContent: srt,
          projectId,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      setSubtitledUrl(url);
    } catch (e) {
      setSubtitleError(e instanceof Error ? e.message : "Subtitle burn failed");
    } finally {
      setBurningSubtitles(false);
    }
  };

  const handleGeneratePrompts = async () => {
    setGeneratingPrompts(true);
    setPromptsError(null);
    try {
      const res = await fetch("/api/video/prompts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story, visualStyle, aspectRatio }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { prompts } = await res.json() as {
        prompts: Array<{ shotId: string; prompt: import("@/types/movie").VideoPromptJson }>;
      };
      for (const { shotId, prompt } of prompts) {
        setShotVideoPromptJson(shotId, prompt);
      }
    } catch (e) {
      setPromptsError(e instanceof Error ? e.message : "Prompt generation failed");
    } finally {
      setGeneratingPrompts(false);
    }
  };

  const handleGenerateAll = async () => {
    const store = useProjectStore.getState();
    const toProcess = story.scenes.filter(
      (sc) => sc.sceneVideoStatus !== "done" && sc.shots.some((sh) => sh.storyboardPanel?.url?.startsWith("http"))
    );

    setGenerating(true, { current: 0, total: toProcess.length });

    await Promise.all(toProcess.map((scene) =>
      generationQueue.enqueueVideo(async () => {
        const storeState = useProjectStore.getState();
        const freshScene = storeState.story?.scenes.find((sc) => sc.id === scene.id);
        if (!freshScene) return;

        const characters = storeState.story?.characters ?? [];
        const sceneChars = characters.filter((c) => freshScene.characterIds.includes(c.id));

        const faceImageUrls = sceneChars
          .map((c) => c.faceImage?.url)
          .filter((u): u is string => !!u && u.startsWith("http"));
        const charSheetUrls = sceneChars
          .map((c) => c.characterSheet?.url)
          .filter((u): u is string => !!u && u.startsWith("http"));
        const firstPanelUrl = freshScene.shots
          .map((sh) => sh.storyboardPanel?.url)
          .find((u): u is string => !!u && u.startsWith("http"));
        const referenceImageUrls = [...faceImageUrls, ...charSheetUrls, ...(firstPanelUrl ? [firstPanelUrl] : [])].slice(0, 9);

        if (referenceImageUrls.length === 0) return;

        const shots = buildSceneShotsPayload(freshScene, characters);
        const totalDuration = Math.min(freshScene.shots.reduce((s, sh) => s + sh.duration, 0), 15);

        store.setSceneVideoStatus(scene.id, "generating");
        try {
          const res = await fetch("/api/video/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sceneId: scene.id,
              referenceImageUrls,
              shots,
              totalDuration,
              scene: { location: freshScene.location, timeOfDay: freshScene.timeOfDay },
              aspectRatio,
              projectId: storeState.id,
            }),
          });
          if (!res.ok) { store.setSceneVideoStatus(scene.id, "error"); return; }
          const { requestId, endpoint } = await res.json();
          const video = await pollVideo(requestId, endpoint);
          store.setSceneVideo(scene.id, video);
        } catch {
          store.setSceneVideoStatus(scene.id, "error");
        }
      })
    ));

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
              SCENES
            </span>
            <div style={{ display: "flex", gap: 2 }}>
              {story.scenes.map((sc, i) => (
                <div key={i} style={{ width: 8, height: 8, background: sc.sceneVideoStatus === "done" ? "var(--success)" : sc.sceneVideoStatus === "generating" ? "var(--accent)" : "var(--border)" }} />
              ))}
            </div>
            <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-primary)" }}>
              {doneScenes} / {story.scenes.length}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={handleGeneratePrompts}
            disabled={generatingPrompts}
            title="Use Claude to generate rich cinematic prompts for all shots"
            style={{
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: "transparent",
              border: "1px solid var(--border-visible)",
              borderRadius: "var(--radius-btn)",
              color: generatingPrompts ? "var(--text-disabled)" : "var(--text-secondary)",
              padding: "8px 20px",
              cursor: generatingPrompts ? "not-allowed" : "pointer",
            }}
          >
            {generatingPrompts ? "[WRITING PROMPTS...]" : "✦ WRITE PROMPTS"}
          </button>
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

      {promptsError && (
        <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--accent)", marginBottom: 16 }}>
          [PROMPTS ERROR: {promptsError}]
        </p>
      )}

      {story.scenes.map((scene, si) => (
        <SceneVideoCard key={scene.id} scene={scene} sceneIndex={si} />
      ))}

      {/* CapCut export */}
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
      {readyScenes.length > 0 && (
        <div style={{ marginTop: 48, borderTop: "1px solid var(--border-visible)", paddingTop: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 13, color: "var(--text-display)", letterSpacing: "0.08em" }}>
                {t.video.assemble}
              </p>
              <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                {readyScenes.length} SCENES → CONCAT → MP4
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

              {/* Subtitle section */}
              <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
                    SUBTITLES
                  </p>
                  <button
                    onClick={handleGenerateSrt}
                    disabled={generatingSrt}
                    style={{
                      fontFamily: "var(--font-space-mono), monospace",
                      fontSize: 11,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      background: "transparent",
                      border: "1px solid var(--border-visible)",
                      borderRadius: "var(--radius-btn)",
                      color: generatingSrt ? "var(--text-disabled)" : "var(--text-primary)",
                      padding: "6px 16px",
                      cursor: generatingSrt ? "not-allowed" : "pointer",
                    }}
                  >
                    {generatingSrt ? "[GENERATING...]" : "GENERATE SUBTITLES"}
                  </button>
                </div>

                {srt !== null && (
                  <>
                    <textarea
                      value={srt}
                      onChange={(e) => setSrt(e.target.value)}
                      rows={8}
                      style={{
                        width: "100%",
                        fontFamily: "var(--font-space-mono), monospace",
                        fontSize: 11,
                        background: "var(--surface)",
                        border: "1px solid var(--border-visible)",
                        borderRadius: "var(--radius-card)",
                        color: "var(--text-primary)",
                        padding: "12px",
                        resize: "vertical",
                        marginBottom: 12,
                        boxSizing: "border-box",
                      }}
                      spellCheck={false}
                    />
                    <button
                      onClick={() => handleBurnSubtitles(assembledUrl)}
                      disabled={burningSubtitles || !srt.trim()}
                      style={{
                        fontFamily: "var(--font-space-mono), monospace",
                        fontSize: 12,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        background: burningSubtitles ? "var(--border)" : "var(--text-display)",
                        color: burningSubtitles ? "var(--text-disabled)" : "var(--black)",
                        border: "none",
                        borderRadius: "var(--radius-btn)",
                        padding: "10px 28px",
                        cursor: burningSubtitles ? "not-allowed" : "pointer",
                      }}
                    >
                      {burningSubtitles ? "[BURNING...]" : "BURN SUBTITLES"}
                    </button>
                  </>
                )}

                {subtitleError && (
                  <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--accent)", marginTop: 8 }}>
                    [ERROR: {subtitleError}]
                  </p>
                )}

                {subtitledUrl && (
                  <div style={{ marginTop: 16 }}>
                    <video src={subtitledUrl} controls style={{ width: "100%", borderRadius: "var(--radius-card)", marginBottom: 12 }} />
                    <a
                      href={subtitledUrl}
                      download="movie_subtitled.mp4"
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
                      DOWNLOAD WITH SUBTITLES
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
