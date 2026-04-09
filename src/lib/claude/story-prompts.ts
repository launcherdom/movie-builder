import Anthropic from "@anthropic-ai/sdk";
import type { Story, Genre, Tone, AspectRatio, VisualStyle, VideoPromptJson } from "@/types/movie";
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

export function buildStorySystemPrompt(
  genre: Genre,
  tone: Tone,
  targetDuration: number,
  aspectRatio: AspectRatio,
  visualStyle: VisualStyle
): string {
  const shotCount = Math.round(targetDuration / 4);
  const sceneCount = Math.max(2, Math.round(shotCount / 4));
  return `You are a professional screenplay writer specializing in short-form drama.
Write a ${genre} short film with a ${tone} tone.
Target duration: ${targetDuration} seconds (~${sceneCount} scenes, ~${shotCount} shots, 3-6 seconds each).
Aspect ratio: ${aspectRatio} (${aspectRatio === "9:16" ? "vertical/mobile" : "cinematic widescreen"}).
Visual style: ${visualStyle}.
Always use the create_screenplay tool to output your response as structured JSON.
Keep character descriptions detailed and visual — they will be used as image generation prompts.
Include age and gender for every character.
Shot durations must be between 4 and 15 seconds (API minimum is 4s).

Camera direction rules (use exact film terminology — these map directly to Seedance camera movements):
- Use: "dolly shot", "tracking shot", "orbit shot", "crane shot", "handheld", "slow zoom", "tilt", "static camera", "over-the-shoulder (OTS)", "slow pan"
- Vary camera movements across shots — avoid repeating the same movement more than twice in a row.

Character description rules (critical for visual consistency across shots):
- Include 3-5 fixed visual anchors: specific clothing colors/style, hair color/style, and 1-2 distinguishing features.
- Example: "Young woman, mid-20s, long black hair in a bun, wearing a red silk qipao with gold trim, sharp cheekbones."
- These anchors must be identical every time the character appears.

Dialogue rules:
- Include dialogue for speaking shots with speakerId matching the character's id.
- Keep lines short (under 10 words) — they will be used for lip-sync guidance.`;
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

  return {
    title: raw.title as string,
    logline: raw.logline as string,
    synopsis: raw.synopsis as string,
    characters,
    scenes,
    totalDuration: raw.totalDuration as number,
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

For EACH shot, write a rich, immersive cinematic prompt that:
1. Opens with camera framing (e.g. "A tight close-up", "An extreme wide shot", "A low-angle shot")
2. Describes the setting with vivid sensory details (lighting, atmosphere, textures)
3. Names characters with their exact visual anchors (hair, clothing, distinguishing features)
4. Describes action in cinematic present tense with motion details
5. Includes technical cinematography (film grain, lens characteristics, color grading)
6. For dialogue shots: describes mouth movement and emotional expression

Write prompts for AI video generation — they must be concrete, visual, and motion-focused.
Avoid abstract concepts. Describe what the camera SEES, not what characters FEEL.

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
