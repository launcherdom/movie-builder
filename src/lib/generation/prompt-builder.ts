import type { Shot, Scene, Character, VisualStyle, ImagePromptJson } from "@/types/movie";

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
