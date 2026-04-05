import Anthropic from "@anthropic-ai/sdk";
import type { Story, Genre, Tone, AspectRatio, VisualStyle } from "@/types/movie";
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
Shot durations must be between 3 and 8 seconds.`;
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
