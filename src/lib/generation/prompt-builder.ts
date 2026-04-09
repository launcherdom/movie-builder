import type { Shot, Scene, Character, VisualStyle, ImagePromptJson, VideoPromptJson } from "@/types/movie";

const STYLE_CINEMATIC_PREFIX: Record<VisualStyle, string> = {
  realistic: "Photorealistic cinematic film frame, 35mm film, shallow depth of field, natural film grain.",
  cinematic: "Cinematic film frame, anamorphic lens, dramatic lighting, film grain, widescreen.",
  anime: "High-quality anime frame, studio quality, detailed cel shading, vibrant colors, expressive.",
  comic: "High-quality comic book illustration, vivid colors, bold lines, detailed artwork.",
};

const STYLE_STORYBOARD_PREFIX: Record<VisualStyle, string> = {
  realistic: "Cinematic storyboard panel, rough sketch style, clear composition.",
  cinematic: "Professional storyboard panel, dramatic composition, clear staging.",
  anime: "Anime storyboard panel, expressive linework, dynamic poses.",
  comic: "Comic panel storyboard, bold panels, clear action beats.",
};

function resolveCharacters(shot: Shot, characters: Character[]): Character[] {
  const shotChars = characters.filter((c) =>
    shot.description.toLowerCase().includes(c.name.toLowerCase())
  );
  return shotChars.length > 0 ? shotChars : characters;
}

/**
 * Build a structured image prompt for storyboard panel generation.
 */
export function buildStoryboardPrompt(
  shot: Shot,
  scene: Scene | { description: string },
  characters: Character[],
  visualStyle: VisualStyle,
  styleAnalysis?: string
): ImagePromptJson {
  const relevant = resolveCharacters(shot, characters);
  const stylePrefix = STYLE_STORYBOARD_PREFIX[visualStyle] ?? STYLE_STORYBOARD_PREFIX.realistic;

  return {
    composition: `${stylePrefix} ${shot.shotType} shot. ${shot.description}.`,
    subject: relevant.map((c) => c.description).join(". "),
    environment: scene.description,
    cinematography: styleAnalysis
      ? `Cinematic lighting. ${styleAnalysis}`
      : "Cinematic lighting, balanced exposure.",
    negative: "blur, watermark, text overlay, low quality, distorted faces",
  };
}

/**
 * Build a structured image prompt for keyframe (photorealistic) generation.
 */
export function buildKeyframePrompt(
  shot: Shot,
  scene: Scene | { description: string },
  characters: Character[],
  visualStyle: VisualStyle,
  styleAnalysis?: string
): ImagePromptJson {
  const relevant = resolveCharacters(shot, characters);
  const stylePrefix = STYLE_CINEMATIC_PREFIX[visualStyle] ?? STYLE_CINEMATIC_PREFIX.realistic;

  return {
    composition: `${stylePrefix} ${shot.shotType} shot. ${shot.description}.`,
    subject: relevant.map((c) => c.description).join(". "),
    environment: scene.description,
    cinematography: styleAnalysis
      ? styleAnalysis
      : "Natural cinematic lighting, professional color grading.",
    negative: "cartoon, illustration, storyboard, sketch, watermark, blur, text overlay, low quality",
  };
}

/**
 * Serialize an ImagePromptJson to a flat string for fal.ai.
 */
export function serializeImagePrompt(prompt: ImagePromptJson): string {
  return [
    prompt.composition,
    prompt.subject,
    prompt.environment,
    prompt.cinematography,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Serialize a VideoPromptJson to natural language for Seedance 2.0.
 *
 * Seedance recommended structure: Subject + Action + Camera + Style + Audio
 * The start frame already defines the visual scene, so the prompt should
 * focus on MOTION, CAMERA WORK, and SOUND — not repeat the image content.
 *
 * Reference: fal.ai Seedance 2.0 prompt guide
 */
export function serializeVideoPrompt(p: VideoPromptJson): string {
  const parts: string[] = [];

  // Subject & action
  if (p.subject.description) parts.push(p.subject.description + ".");
  if (p.visual_details.action && p.visual_details.action !== p.subject.description) {
    parts.push(p.visual_details.action + ".");
  }
  if (p.subject.wardrobe && p.subject.wardrobe !== "as described in scene") {
    parts.push(`Wearing ${p.subject.wardrobe}.`);
  }

  // Camera work (Seedance recognizes cinematic vocabulary)
  const cameraTokens = [
    p.shot.composition,
    p.shot.camera_movement && p.shot.camera_movement !== "static"
      ? p.shot.camera_movement
      : null,
    p.shot.lens && p.shot.lens !== "standard cinematic lens" ? p.shot.lens : null,
  ].filter(Boolean);
  if (cameraTokens.length) parts.push(cameraTokens.join(", ") + ".");

  // Scene & environment (brief — image already shows the scene)
  if (p.scene.location && p.scene.location !== "as described in scene") {
    parts.push(`${p.scene.location}, ${p.scene.time_of_day}.`);
  }

  // Visual style / cinematography
  const cinTokens = [
    p.cinematography.lighting,
    p.cinematography.color_palette !== "natural tones" ? p.cinematography.color_palette : null,
    p.cinematography.tone,
  ].filter(Boolean);
  if (cinTokens.length) parts.push(cinTokens.join(", ") + ".");

  // Special effects / motion details
  if (p.visual_details.special_effects && p.visual_details.special_effects !== "none") {
    parts.push(p.visual_details.special_effects + ".");
  }
  if (p.visual_details.hair_clothing_motion && p.visual_details.hair_clothing_motion !== "natural") {
    parts.push(p.visual_details.hair_clothing_motion + ".");
  }

  // Audio (Seedance 2.0 native audio generation)
  const audioTokens = [
    p.audio.music && p.audio.music !== "background score" ? p.audio.music : null,
    p.audio.ambient && p.audio.ambient !== "natural ambience" ? p.audio.ambient : null,
    p.audio.sound_effects && p.audio.sound_effects !== "none" ? p.audio.sound_effects : null,
  ].filter(Boolean);
  if (audioTokens.length) parts.push("Audio: " + audioTokens.join(", ") + ".");

  return parts.join(" ");
}
