// ─── Primitives ─────────────────────────────────────────
export type QualityTier = "draft" | "standard" | "premium";
export type AspectRatio = "9:16" | "16:9";
export type VisualStyle = "realistic" | "anime" | "comic" | "cinematic";
export type Genre = "drama" | "comedy" | "thriller" | "romance" | "scifi" | "fantasy" | "horror";
export type Tone = "serious" | "light" | "dark" | "whimsical";
export type ShotType = "CU" | "MCU" | "MS" | "MWS" | "WS" | "EWS" | "OTS" | "POV" | "HIGH" | "LOW";
export type TransitionType = "cut" | "dissolve" | "fade-black";
export type PipelineStep = "prompt" | "story" | "characters" | "storyboard" | "video";
export type GenerationStatus = "idle" | "generating" | "queued" | "done" | "error";

// ─── Assets ─────────────────────────────────────────────
export interface GeneratedImage {
  url: string;
  width: number;
  height: number;
  falRequestId?: string;
}

export interface GeneratedVideo {
  url: string;
  duration: number;
  width: number;
  height: number;
  falRequestId?: string;
  hasAudio: boolean;
}

// ─── Video Prompt JSON ───────────────────────────────────
export interface VideoPromptJson {
  shot: {
    composition: string;
    lens: string;
    camera_movement: string;
  };
  subject: {
    description: string;
    wardrobe: string;
    props: string;
  };
  scene: {
    location: string;
    time_of_day: string;
    environment: string;
  };
  visual_details: {
    action: string;
    special_effects: string;
    hair_clothing_motion: string;
  };
  cinematography: {
    lighting: string;
    color_palette: string;
    tone: string;
  };
  audio: {
    music: string;
    ambient: string;
    sound_effects: string;
    mix_level: string;
  };
}

// ─── Character ──────────────────────────────────────────
export interface Character {
  id: string;
  name: string;
  age?: string;
  gender?: string;
  description: string;        // visual appearance (used in prompts)
  personality: string;        // personality for script generation
  characterSheet?: GeneratedImage; // landscape turnaround sheet from nano-banana-2
}

// ─── Shot ───────────────────────────────────────────────
export interface Shot {
  id: string;
  sceneId: string;
  orderIndex: number;
  shotType: ShotType;
  description: string;
  dialogue?: string;
  speakerId?: string;
  cameraDirection?: string;
  duration: number;
  storyboardPanel?: GeneratedImage;
  keyframeImage?: GeneratedImage;
  videoClip?: GeneratedVideo;
  imageStatus: GenerationStatus;
  keyframeStatus: GenerationStatus;
  videoStatus: GenerationStatus;
  imagePrompt?: string;
  keyframePrompt?: string;
  videoPromptJson?: VideoPromptJson;
}

// ─── Scene ──────────────────────────────────────────────
export interface Scene {
  id: string;
  orderIndex: number;
  heading: string;
  location: string;
  timeOfDay: string;
  description: string;
  characterIds: string[];
  shots: Shot[];
  transitionTo: TransitionType;
}

// ─── Story ──────────────────────────────────────────────
export interface Story {
  title: string;
  logline: string;
  synopsis: string;
  scenes: Scene[];
  characters: Character[];
  totalDuration: number;
}

// ─── Project ────────────────────────────────────────────
export interface Project {
  id: string;
  concept: string;
  genre: Genre;
  tone: Tone;
  targetDuration: number;
  aspectRatio: AspectRatio;
  visualStyle: VisualStyle;
  qualityTier: QualityTier;
  story: Story | null;
  currentStep: PipelineStep;
  createdAt: string;
  updatedAt: string;
}

// ─── Runtime State ──────────────────────────────────────
export type ProjectState = Project & {
  activeSceneId: string | null;
  activeShotId: string | null;
  isGenerating: boolean;
  generationProgress: { current: number; total: number } | null;
};

// ─── Validators ─────────────────────────────────────────
const REQUIRED_PROJECT_KEYS: (keyof Project)[] = [
  "id", "concept", "genre", "tone", "targetDuration",
  "aspectRatio", "visualStyle", "qualityTier", "story",
  "currentStep", "createdAt", "updatedAt",
];

export function isValidProject(value: unknown): value is Project {
  if (typeof value !== "object" || value === null) return false;
  return REQUIRED_PROJECT_KEYS.every((k) => k in (value as object));
}

export function isValidShot(value: unknown): value is Shot {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.sceneId === "string" &&
    typeof s.orderIndex === "number" &&
    typeof s.shotType === "string" &&
    typeof s.description === "string" &&
    typeof s.duration === "number" &&
    typeof s.imageStatus === "string" &&
    typeof s.videoStatus === "string" &&
    typeof s.keyframeStatus === "string"
  );
}
