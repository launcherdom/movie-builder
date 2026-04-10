import Anthropic from "@anthropic-ai/sdk";
import type { Story, Genre, Tone, AspectRatio, VisualStyle, VideoPromptJson, SeriesConfig } from "@/types/movie";
import { nanoid } from "nanoid";

export const SCREENPLAY_TOOL: Anthropic.Tool = {
  name: "create_screenplay",
  description: "Output a structured screenplay as JSON",
  input_schema: {
    type: "object" as const,
    required: ["title", "logline", "synopsis", "characters", "scenes", "totalDuration"],
    properties: {
      title: { type: "string" },
      logline: { type: "string" },
      synopsis: { type: "string" },
      totalDuration: { type: "number" },
      characters: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "name", "description", "personality"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            age: { type: "string" },
            gender: { type: "string" },
            description: { type: "string" },
            personality: { type: "string" },
          },
        },
      },
      scenes: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "orderIndex", "heading", "location", "timeOfDay", "description", "characterIds", "shots", "transitionTo"],
          properties: {
            id: { type: "string" },
            orderIndex: { type: "number" },
            heading: { type: "string" },
            location: { type: "string" },
            timeOfDay: { type: "string" },
            description: { type: "string" },
            characterIds: { type: "array", items: { type: "string" } },
            transitionTo: { type: "string", enum: ["cut", "dissolve", "fade-black"] },
            shots: {
              type: "array",
              items: {
                type: "object",
                required: ["id", "sceneId", "orderIndex", "shotType", "description", "duration"],
                properties: {
                  id: { type: "string" },
                  sceneId: { type: "string" },
                  orderIndex: { type: "number" },
                  shotType: {
                    type: "string",
                    enum: ["CU", "MCU", "MS", "MWS", "WS", "EWS", "OTS", "POV", "HIGH", "LOW"],
                  },
                  description: { type: "string" },
                  dialogue: { type: "string" },
                  speakerId: { type: "string" },
                  cameraDirection: { type: "string" },
                  duration: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const VIDEO_PROMPT_TOOL: Anthropic.Tool = {
  name: "create_video_prompts",
  description: "Generate VideoPromptJson for each shot",
  input_schema: {
    type: "object" as const,
    required: ["prompts"],
    properties: {
      prompts: {
        type: "array",
        items: {
          type: "object",
          required: ["shotId", "prompt"],
          properties: {
            shotId: { type: "string" },
            prompt: {
              type: "object",
              required: ["shot", "subject", "scene", "visual_details", "cinematography", "audio"],
              properties: {
                dialogue: { type: "string", description: "Exact character dialogue for lip-sync (verbatim from shot)" },
                shot: {
                  type: "object",
                  required: ["composition", "lens", "camera_movement"],
                  properties: {
                    composition: { type: "string" },
                    lens: { type: "string" },
                    camera_movement: { type: "string" },
                  },
                },
                subject: {
                  type: "object",
                  required: ["description", "wardrobe", "props"],
                  properties: {
                    description: { type: "string" },
                    wardrobe: { type: "string" },
                    props: { type: "string" },
                  },
                },
                scene: {
                  type: "object",
                  required: ["location", "time_of_day", "environment"],
                  properties: {
                    location: { type: "string" },
                    time_of_day: { type: "string" },
                    environment: { type: "string" },
                  },
                },
                visual_details: {
                  type: "object",
                  required: ["action", "special_effects", "hair_clothing_motion"],
                  properties: {
                    action: { type: "string" },
                    special_effects: { type: "string" },
                    hair_clothing_motion: { type: "string" },
                  },
                },
                cinematography: {
                  type: "object",
                  required: ["lighting", "color_palette", "tone"],
                  properties: {
                    lighting: { type: "string" },
                    color_palette: { type: "string" },
                    tone: { type: "string" },
                  },
                },
                audio: {
                  type: "object",
                  required: ["music", "ambient", "sound_effects", "mix_level"],
                  properties: {
                    music: { type: "string" },
                    ambient: { type: "string" },
                    sound_effects: { type: "string" },
                    mix_level: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const CONTINUITY_REVIEW_TOOL: Anthropic.Tool = {
  name: "review_continuity",
  description: "Review scene-to-scene continuity in a screenplay",
  input_schema: {
    type: "object" as const,
    required: ["score", "issues"],
    properties: {
      score: { type: "number", description: "Overall continuity score 0-100" },
      issues: {
        type: "array",
        items: {
          type: "object",
          required: ["sceneIndex", "type", "description", "fix"],
          properties: {
            sceneIndex: { type: "number", description: "0-based index of the scene with the issue" },
            type: { type: "string", enum: ["physical", "emotional", "location", "narrative", "temporal"] },
            description: { type: "string", description: "What is wrong between this scene and the previous" },
            fix: { type: "string", description: "Specific fix to apply to this scene's description or shots" },
          },
        },
      },
    },
  },
};

export const EVALUATE_SCREENPLAY_TOOL: Anthropic.Tool = {
  name: "evaluate_screenplay",
  description: "Evaluate the screenplay quality across 5 cinematic dimensions",
  input_schema: {
    type: "object" as const,
    required: ["pacing", "hooks", "dialogue", "visualClarity", "continuity", "overallScore", "suggestions"],
    properties: {
      pacing: { type: "number", description: "1-10: narrative rhythm, shot timing variety" },
      hooks: { type: "number", description: "1-10: opening hook strength, tension peaks, ending satisfaction" },
      dialogue: { type: "number", description: "1-10: naturalism, character voice distinction" },
      visualClarity: { type: "number", description: "1-10: shot descriptions clear enough for AI image generation" },
      continuity: { type: "number", description: "1-10: character/location/prop consistency across scenes" },
      overallScore: { type: "number", description: "Weighted average score (0-10)" },
      suggestions: {
        type: "array",
        items: { type: "string" },
        description: "Up to 3 specific improvement suggestions",
      },
    },
  },
};

export function buildEvaluationPrompt(story: Story, genre: Genre): string {
  const genreWeights: Record<string, string> = {
    thriller: "Pacing and hooks are most critical (×2 weight each).",
    drama: "Dialogue and continuity are most critical (×2 weight each).",
    comedy: "Hooks and dialogue are most critical (×2 weight each).",
    romance: "Dialogue and pacing are most critical (×2 weight each).",
    scifi: "Visual clarity and continuity are most critical (×2 weight each).",
    fantasy: "Visual clarity and hooks are most critical (×2 weight each).",
    horror: "Pacing and hooks are most critical (×2 weight each).",
  };
  const genreNote = genreWeights[genre] ?? "";

  return `Evaluate this ${genre} short film screenplay for AI video production quality.
${genreNote}
Score each dimension 1-10. Provide up to 3 specific, actionable improvement suggestions.

Title: ${story.title}
Logline: ${story.logline}
Scenes: ${story.scenes.length}, Total shots: ${story.scenes.flatMap((s) => s.shots).length}
Total duration: ${story.totalDuration}s

SYNOPSIS:
${story.synopsis}

CHARACTERS:
${story.characters.map((c) => `- ${c.name} (${c.age ?? "?"}, ${c.gender ?? "?"}): ${c.description}`).join("\n")}

SCENES SUMMARY:
${story.scenes.map((sc, i) =>
  `Scene ${i + 1}: ${sc.heading} — ${sc.shots.length} shots\n` +
  sc.shots.map((sh) => `  [${sh.shotType}] ${sh.description}${sh.dialogue ? ` | "${sh.dialogue}"` : ""}`).join("\n")
).join("\n")}

Use the evaluate_screenplay tool to output your scores.`;
}

export function parseEvaluationResponse(response: ClaudeResponse): import("@/types/movie").StoryQualityScores | null {
  const toolBlock = response.content.find(
    (b) => b.type === "tool_use" && b.name === "evaluate_screenplay"
  );
  if (!toolBlock || !toolBlock.input) return null;
  const raw = toolBlock.input as Record<string, unknown>;
  return {
    pacing: Number(raw.pacing ?? 7),
    hooks: Number(raw.hooks ?? 7),
    dialogue: Number(raw.dialogue ?? 7),
    visualClarity: Number(raw.visualClarity ?? 7),
    continuity: Number(raw.continuity ?? 7),
    overallScore: Number(raw.overallScore ?? 7),
    suggestions: Array.isArray(raw.suggestions) ? raw.suggestions as string[] : [],
  };
}

function buildSeriesBlock(series: SeriesConfig): string {
  const { episodeNumber, totalEpisodes } = series;
  const isFirst = episodeNumber === 1;
  const isLast = episodeNumber === totalEpisodes;

  const positionGuide = isFirst
    ? `This is the FIRST episode of a ${totalEpisodes}-episode series.
- Establish the world, main characters, and central conflict clearly.
- Plant seeds for future episodes (introduce a mystery, relationship tension, or unresolved goal).
- End with a strong hook or cliffhanger that makes the viewer want to watch Episode 2.
- Do NOT resolve the main conflict — this is just the beginning.`
    : isLast
    ? `This is the FINAL episode (${episodeNumber} of ${totalEpisodes}) of the series.
- Reference that previous episodes have built up to this moment (write descriptions as if continuing from prior events).
- Bring all major plot threads to a satisfying resolution.
- Give characters meaningful closure.
- The ending should feel earned and complete — no cliffhangers.`
    : `This is Episode ${episodeNumber} of ${totalEpisodes} in a series.
- Reference that previous events have already happened (the opening scene should feel like a continuation).
- Continue escalating the central conflict established in Episode 1.
- End with a hook or partial revelation that bridges to Episode ${episodeNumber + 1}.
- Do NOT introduce or resolve the main conflict — deepen it.`;

  return `
Series mode (CRITICAL):
This is Episode ${episodeNumber} of ${totalEpisodes}.
${positionGuide}
The title should include the episode number (e.g. "— Ep.${episodeNumber}").
The logline should reflect only what happens in this episode.
Characters and their visual descriptions must remain consistent across all episodes.`;
}

export function buildStorySystemPrompt(
  genre: Genre,
  tone: Tone,
  targetDuration: number,
  aspectRatio: AspectRatio,
  visualStyle: VisualStyle,
  series?: SeriesConfig
): string {
  const shotCount = Math.round(targetDuration / 4);
  const sceneCount = Math.max(2, Math.round(shotCount / 4));

  const seriesBlock = series?.enabled
    ? buildSeriesBlock(series)
    : "";

  return `You are a professional screenplay writer specializing in short-form drama.
Write a ${genre} short film with a ${tone} tone.
Target duration: ${targetDuration} seconds (~${sceneCount} scenes, ~${shotCount} shots, 3-6 seconds each).
Aspect ratio: ${aspectRatio} (${aspectRatio === "9:16" ? "vertical/mobile" : "cinematic widescreen"}).
Visual style: ${visualStyle}.
Always use the create_screenplay tool to output your response as structured JSON.
Keep character descriptions detailed and visual — they will be used as image generation prompts.
Include age and gender for every character.
Shot durations must be between 4 and 15 seconds (API minimum is 4s).
${seriesBlock}

Scene duration rules (CRITICAL):
- Each scene's total duration (sum of all shot durations) must be 15 seconds or less.
- This is a hard limit — Seedance 2.0 generates one video clip per scene, maximum 15s.
- If a scene would naturally exceed 15 seconds, split it into multiple consecutive scenes at a natural dramatic beat (e.g. "Scene 3A", "Scene 3B").

Scene continuity rules (CRITICAL — scenes must flow as one continuous narrative):
- Every scene must connect directly to the previous one. The last shot of Scene N sets up the first shot of Scene N+1.
- Physical continuity: if a character exits left in Scene N, they enter right in Scene N+1. If they reach a door, the next scene shows them entering the next room.
- Emotional continuity: characters carry their emotional state between scenes — a frightened character in Scene 3 is still tense at the start of Scene 4.
- Location progression: scenes should move logically through space (hallway → room → exterior, not random jumps).
- Narrative arc: structure scenes as a single flowing story — setup → escalation → climax → resolution. Each scene must raise or release tension from the previous.
- The description of each scene should reference what just happened (e.g. "Following the confrontation, Maya now stands alone in...").
- Avoid disconnected anthology-style scenes. Every scene must feel like the next moment in time.

Camera direction rules (use exact film terminology — these map directly to Seedance camera movements):
- Use: "dolly shot", "tracking shot", "orbit shot", "crane shot", "handheld", "slow zoom", "tilt", "static camera", "over-the-shoulder (OTS)", "slow pan"
- Vary camera movements across shots — avoid repeating the same movement more than twice in a row.

Character description rules (critical for visual consistency across shots):
- Include 3-5 fixed visual anchors: specific clothing colors/style, hair color/style, and 1-2 distinguishing features.
- Example: "Young woman, mid-20s, long black hair in a bun, wearing a red silk qipao with gold trim, sharp cheekbones."
- These anchors must be identical every time the character appears.

Scene characterIds rules (CRITICAL):
- characterIds must list ONLY the characters who physically appear in that scene.
- Do NOT include characters who are merely mentioned or off-screen.
- If a scene has no named characters, set characterIds to an empty array [].

Dialogue rules:
- At least 40% of shots should have dialogue — this is a talking film, not a silent movie.
- Every scene with 2+ characters must have at least one exchange of dialogue.
- Dialogue should feel natural and character-specific — each character has a distinct voice.
- Lines can be 1–20 words. Longer lines are fine for emotional or dramatic moments.
- Include speakerId matching the character's id for every line.
- Avoid scenes where characters are only described acting silently — give them words.`;
}

type ClaudeResponse = { content: Array<{ type: string; name?: string; input?: unknown; text?: string }> };

export function parseStoryResponse(response: ClaudeResponse): Story {
  const toolBlock = response.content.find(
    (b) => b.type === "tool_use" && b.name === "create_screenplay"
  );
  if (!toolBlock || !toolBlock.input) throw new Error("No tool_use block in Claude response");

  const raw = toolBlock.input as Record<string, unknown>;
  const characters = ((raw.characters as Array<Record<string, unknown>>) ?? []).map((c) => ({
    id: (c.id as string) || nanoid(),
    name: c.name as string,
    age: c.age as string | undefined,
    gender: c.gender as string | undefined,
    description: c.description as string,
    personality: c.personality as string,
  }));

  const scenes = ((raw.scenes as Array<Record<string, unknown>>) ?? []).map((sc, scIdx) => ({
    id: (sc.id as string) || nanoid(),
    orderIndex: scIdx,
    heading: sc.heading as string,
    location: sc.location as string,
    timeOfDay: sc.timeOfDay as string,
    description: sc.description as string,
    characterIds: sc.characterIds as string[],
    transitionTo: ((sc.transitionTo as string) || "cut") as import("@/types/movie").TransitionType,
    shots: ((sc.shots as Array<Record<string, unknown>>) || []).map((sh, shIdx) => ({
      id: (sh.id as string) || nanoid(),
      sceneId: sc.id as string,
      orderIndex: shIdx,
      shotType: sh.shotType as import("@/types/movie").ShotType,
      description: sh.description as string,
      dialogue: sh.dialogue as string | undefined,
      speakerId: sh.speakerId as string | undefined,
      cameraDirection: sh.cameraDirection as string | undefined,
      duration: sh.duration as number,
      imageStatus: "idle" as const,
      keyframeStatus: "idle" as const,
      videoStatus: "idle" as const,
    })),
  }));

  // Safety: split any scene exceeding 15s into multiple scenes
  const splitScenes: typeof scenes = [];
  for (const scene of scenes) {
    const total = scene.shots.reduce((s, sh) => s + sh.duration, 0);
    if (total <= 15) {
      splitScenes.push(scene);
      continue;
    }
    // Split shots into 15s chunks
    let chunk: typeof scene.shots = [];
    let chunkDur = 0;
    let partIdx = 0;
    for (const shot of scene.shots) {
      if (chunkDur + shot.duration > 15 && chunk.length > 0) {
        splitScenes.push({ ...scene, id: partIdx === 0 ? scene.id : nanoid(), heading: `${scene.heading} (${partIdx + 1})`, shots: chunk, orderIndex: splitScenes.length });
        partIdx++;
        chunk = [];
        chunkDur = 0;
      }
      chunk.push(shot);
      chunkDur += shot.duration;
    }
    if (chunk.length > 0) {
      splitScenes.push({ ...scene, id: partIdx === 0 ? scene.id : nanoid(), heading: `${scene.heading} (${partIdx + 1})`, shots: chunk, orderIndex: splitScenes.length });
    }
  }

  return {
    title: raw.title as string,
    logline: raw.logline as string,
    synopsis: raw.synopsis as string,
    characters,
    scenes: splitScenes.map((sc, i) => ({ ...sc, orderIndex: i })),
    totalDuration: raw.totalDuration as number,
  };
}

export function buildContinuityReviewPrompt(story: Story): string {
  const sceneList = story.scenes.map((sc, i) => {
    const lastShot = sc.shots[sc.shots.length - 1];
    const firstShot = sc.shots[0];
    return [
      `Scene ${i + 1}: ${sc.heading} — ${sc.location}, ${sc.timeOfDay}`,
      `  Description: ${sc.description}`,
      `  First shot: [${firstShot?.shotType}] ${firstShot?.description}`,
      `  Last shot:  [${lastShot?.shotType}] ${lastShot?.description}`,
      lastShot?.dialogue ? `  Exit line: "${lastShot.dialogue}"` : null,
    ].filter(Boolean).join("\n");
  }).join("\n\n");

  return `You are a continuity supervisor reviewing a short film screenplay for scene-to-scene flow.

Evaluate how naturally each scene transitions to the next. Check specifically:
- Physical continuity: Does the character's position/direction make sense going from Scene N's last shot to Scene N+1's first shot?
- Emotional continuity: Does the character's emotional state carry over logically?
- Location continuity: Is the spatial progression logical (no unmotivated jumps)?
- Temporal continuity: Does time flow naturally between scenes?
- Narrative continuity: Does each scene raise or resolve tension from the previous?

Score 0-100:
- 90-100: Seamless flow, cinematic quality
- 70-89: Minor gaps, acceptable
- 50-69: Noticeable disconnections, should fix
- 0-49: Major continuity breaks

Screenplay scenes:
${sceneList}

Use the review_continuity tool. For each issue found, specify the sceneIndex (0-based) and an exact fix.`;
}

export function buildContinuityFixPrompt(story: Story, issues: Array<{ sceneIndex: number; type: string; description: string; fix: string }>): string {
  const issueList = issues.map((issue, i) =>
    `Issue ${i + 1} [Scene ${issue.sceneIndex + 1}, ${issue.type}]: ${issue.description}\nFix: ${issue.fix}`
  ).join("\n\n");

  const sceneList = story.scenes.map((sc, i) => {
    return `Scene ${i + 1} (${sc.id}): ${sc.heading}\n  Description: ${sc.description}\n  Shots: ${sc.shots.map((sh) => `[${sh.shotType}] ${sh.description}`).join(" | ")}`;
  }).join("\n\n");

  return `You are fixing continuity issues in a short film screenplay.

Apply ONLY the fixes listed below. Do not change scenes that are not mentioned. Keep all IDs, character names, locations, and timing identical except where the fix requires changes.

FIXES TO APPLY:
${issueList}

CURRENT SCENES:
${sceneList}

Use the create_screenplay tool to output the corrected full screenplay. Preserve everything that is not being fixed.`;
}

export function parseContinuityReview(response: ClaudeResponse): { score: number; issues: Array<{ sceneIndex: number; type: string; description: string; fix: string }> } | null {
  const toolBlock = response.content.find(
    (b) => b.type === "tool_use" && b.name === "review_continuity"
  );
  if (!toolBlock || !toolBlock.input) return null;
  const raw = toolBlock.input as Record<string, unknown>;
  return {
    score: Number(raw.score ?? 100),
    issues: Array.isArray(raw.issues) ? raw.issues as Array<{ sceneIndex: number; type: string; description: string; fix: string }> : [],
  };
}

// ─── Video Prompt Generation ────────────────────────────────────────────────

export function buildVideoPromptSystemPrompt(story: Story, visualStyle: string, aspectRatio: string): string {
  const charDescriptions = story.characters
    .map((c) => `- ${c.name} (${c.age ?? "?"}, ${c.gender ?? "?"}): ${c.description}`)
    .join("\n");

  return `You are a cinematographer writing AI video generation prompts for Seedance 2.0.

Story: "${story.title}" — ${story.logline}
Visual style: ${visualStyle}, aspect ratio: ${aspectRatio}.

Characters:
${charDescriptions}

Reference images (@Image1, @Image2, ...) already contain the characters' exact appearance.
DO NOT describe character appearance, hair, clothing, or physical features in the prompt — the reference images handle that. Text descriptions of appearance conflict with the reference images and reduce consistency.

When describing character actions, use @Image tags as subject anchors:
- GOOD: "@Image1 slowly turns to face the camera"
- BAD: "The character turns to face the camera"
This anchors Seedance 2.0's identity tracking to the specific reference image.

For EACH shot, write a focused cinematic prompt that:
1. Opens with camera framing (e.g. "A tight close-up", "An extreme wide shot", "A low-angle shot")
2. Describes the setting with vivid sensory details (lighting, atmosphere, textures)
3. Describes ACTION and MOTION in cinematic present tense using @Image tags as subjects
4. Includes technical cinematography (film grain, lens characteristics, color grading)
5. For dialogue shots: describes mouth movement and emotional expression

subject.description = "@Image1 [action/movement only]" (e.g. "@Image1 walks forward", "@Image1 turns to camera")
subject.wardrobe = "as in reference image"
dialogue = exact spoken line (verbatim from the shot's dialogue field, for lip-sync)

Keep each prompt under 200 words — Seedance performs best with concise, motion-focused prompts.

Use the create_video_prompts tool to output all prompts.`;
}

export function parseVideoPromptsResponse(
  response: ClaudeResponse
): Array<{ shotId: string; prompt: VideoPromptJson }> {
  const toolBlock = response.content.find(
    (b) => b.type === "tool_use" && b.name === "create_video_prompts"
  );
  if (!toolBlock || !toolBlock.input) return [];
  const raw = toolBlock.input as { prompts: Array<{ shotId: string; prompt: VideoPromptJson }> };
  return raw.prompts ?? [];
}
