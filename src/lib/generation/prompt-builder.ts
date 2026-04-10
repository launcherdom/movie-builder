import type { Shot, Scene, Character, VisualStyle, ImagePromptJson, VideoPromptJson } from "@/types/movie";

const STYLE_CINEMATIC_PREFIX: Record<VisualStyle, string> = {
  realistic: "Photorealistic cinematic film frame, 35mm film, shallow depth of field, natural film grain.",
  cinematic: "Cinematic film frame, anamorphic lens, dramatic lighting, film grain, widescreen.",
  anime: "High-quality anime frame, studio quality, detailed cel shading, vibrant colors, expressive.",
  comic: "High-quality comic book illustration, vivid colors, bold lines, detailed artwork.",
};

const STORYBOARD_PREFIX = "Black and white manga panel, crisp ink lines, high contrast, dramatic shadows, clean composition, no color, no text, no dialogue bubbles, no captions.";

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

  return {
    composition: `${STORYBOARD_PREFIX} ${shot.shotType} shot. ${shot.description}.`,
    subject: relevant.map((c) => c.description).join(". "),
    environment: scene.description,
    cinematography: "High contrast ink shadows, dramatic black and white tones, manga-style shading.",
    negative: "color, text, speech bubbles, captions, watermark, blur, low quality, grayscale gradient without contrast",
  };
}

/**
 * Build a single manga page prompt covering all shots in a scene.
 * Generates one image with multiple panel layout representing every cut.
 */
export function buildSceneMangaPrompt(
  scene: Scene | { description: string; shots: Shot[] },
  characters: Character[],
  referenceLabels?: string[], // e.g. ["Image1 = Maya", "Image2 = John"]
): ImagePromptJson {
  const shots = "shots" in scene ? scene.shots : [];
  const panelDescriptions = shots
    .map((sh, i) => {
      const label = `Panel ${i + 1} [${sh.shotType} shot]`;
      const action = sh.description;
      return `${label}: ${action}`;
    })
    .join(". ");

  const sceneDesc = "description" in scene ? scene.description : "";

  const refBlock = referenceLabels && referenceLabels.length > 0
    ? `Reference images: ${referenceLabels.join(", ")}. Draw only these characters — no other people.`
    : "";

  return {
    composition: `${STORYBOARD_PREFIX} Full manga page layout with ${shots.length} sequential panels arranged naturally. ${panelDescriptions}.`,
    subject: refBlock,
    environment: sceneDesc,
    cinematography: "High contrast ink shadows, dramatic black and white tones, manga-style shading, dynamic panel borders.",
    negative: "color, text, speech bubbles, captions, watermark, blur, low quality, single panel",
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
 * Follows awesome-seedance validated structure:
 *   Style → [00-Ns] timestamped shot block → Subject+Action → Dialogue lip-sync → Audio → Technical
 *
 * The start frame already defines the visual scene, so focus on MOTION, CAMERA, and SOUND.
 */
export function serializeVideoPrompt(p: VideoPromptJson, duration?: number, visualStyle?: VisualStyle): string {
  const parts: string[] = [];

  // 1. Style declaration (Seedance reads this first)
  const stylePrefix = visualStyle ? STYLE_CINEMATIC_PREFIX[visualStyle] : null;
  const styleTokens = [
    p.cinematography.tone && p.cinematography.tone !== "dramatic" ? p.cinematography.tone : "cinematic",
    p.cinematography.lighting,
  ].filter(Boolean);
  parts.push(`Style: ${stylePrefix ? stylePrefix + " " : ""}${styleTokens.join(", ")}.`);

  // 2. Timestamped shot block — Seedance optimized format
  const dur = duration ?? 5;
  const cameraTokens = [
    p.shot.composition,
    p.shot.camera_movement && p.shot.camera_movement !== "static camera"
      ? p.shot.camera_movement
      : null,
    p.shot.lens && p.shot.lens !== "standard cinematic lens" ? p.shot.lens : null,
  ].filter(Boolean);
  parts.push(`[00-${dur}s] ${cameraTokens.join(", ")}.`);

  // 3. Action only — character appearance delegated to reference images (@Image1, @Image2, ...)
  if (p.visual_details.action && p.visual_details.action !== p.subject.description) {
    parts.push(p.visual_details.action + ".");
  } else if (p.subject.description) {
    parts.push(p.subject.description + ".");
  }

  // 4. Dialogue lip-sync guidance (awesome-seedance: critical for mouth movement accuracy)
  if (p.dialogue && p.dialogue.trim()) {
    parts.push(`【Dialogue lip-sync】"${p.dialogue.trim()}"`);
  }

  // 5. Special effects / motion details
  if (p.visual_details.special_effects && p.visual_details.special_effects !== "none") {
    parts.push(p.visual_details.special_effects + ".");
  }
  if (
    p.visual_details.hair_clothing_motion &&
    p.visual_details.hair_clothing_motion !== "natural" &&
    p.visual_details.hair_clothing_motion !== "natural fabric motion"
  ) {
    parts.push(p.visual_details.hair_clothing_motion + ".");
  }

  // 6. Audio (Seedance 2.0 native audio generation)
  const audioTokens = [
    p.audio.music && p.audio.music !== "background score" ? p.audio.music : null,
    p.audio.ambient && p.audio.ambient !== "natural ambience" ? p.audio.ambient : null,
    p.audio.sound_effects && p.audio.sound_effects !== "none" ? p.audio.sound_effects : null,
  ].filter(Boolean);
  if (audioTokens.length) parts.push("Audio: " + audioTokens.join(", ") + ".");

  // 7. Technical: color palette (only non-default)
  if (p.cinematography.color_palette && p.cinematography.color_palette !== "natural tones") {
    parts.push(`Technical: ${p.cinematography.color_palette}.`);
  }

  // 8. Scene location (brief — image already shows scene)
  if (p.scene.location && p.scene.location !== "as described in scene") {
    parts.push(`${p.scene.location}, ${p.scene.time_of_day}.`);
  }

  return parts.join(" ");
}

/**
 * Serialize multiple shots from a single scene into a multi-timestamp prompt for Seedance 2.0.
 * Used for scene-level video generation where all cuts are combined into one clip.
 *
 * Format:
 *   Style: cinematic, natural lighting.
 *   [00-04s] CU shot, dolly. Subject description. Action. 【Dialogue lip-sync】"Line"
 *   [04-09s] MS shot, tracking. Subject. Action.
 *   Audio: music, ambient. Technical: color.
 *   Location, timeOfDay.
 */
export function serializeSceneVideoPrompt(
  shots: Array<{ prompt: VideoPromptJson; startTime: number; endTime: number }>,
  scene: { location: string; timeOfDay: string },
  visualStyle?: VisualStyle
): string {
  if (shots.length === 0) return "";

  const parts: string[] = [];
  const first = shots[0].prompt;

  // 1. Style declaration (from first shot — same across scene)
  const stylePrefix = visualStyle ? STYLE_CINEMATIC_PREFIX[visualStyle] : null;
  const styleTokens = [
    first.cinematography.tone && first.cinematography.tone !== "dramatic"
      ? first.cinematography.tone
      : "cinematic",
    first.cinematography.lighting,
  ].filter(Boolean);
  parts.push(`Style: ${stylePrefix ? stylePrefix + " " : ""}${styleTokens.join(", ")}.`);

  // 2. Per-shot timestamp blocks
  for (const { prompt: p, startTime, endTime } of shots) {
    const start = String(Math.round(startTime)).padStart(2, "0");
    const end = String(Math.round(endTime)).padStart(2, "0");

    const cameraTokens = [
      p.shot.composition,
      p.shot.camera_movement && p.shot.camera_movement !== "static camera"
        ? p.shot.camera_movement
        : null,
      p.shot.lens && p.shot.lens !== "standard cinematic lens" ? p.shot.lens : null,
    ].filter(Boolean);

    const blockParts = [`[${start}-${end}s] ${cameraTokens.join(", ")}.`];

    // Action only per shot — appearance from reference images
    if (p.visual_details.action && p.visual_details.action !== p.subject.description) {
      blockParts.push(p.visual_details.action + ".");
    } else if (p.subject.description) {
      blockParts.push(p.subject.description + ".");
    }
    if (p.dialogue && p.dialogue.trim()) {
      blockParts.push(`【Dialogue lip-sync】"${p.dialogue.trim()}"`);
    }

    parts.push(blockParts.join(" "));
  }

  // 3. Audio (from first shot)
  const audioTokens = [
    first.audio.music && first.audio.music !== "background score" ? first.audio.music : null,
    first.audio.ambient && first.audio.ambient !== "natural ambience" ? first.audio.ambient : null,
    first.audio.sound_effects && first.audio.sound_effects !== "none"
      ? first.audio.sound_effects
      : null,
  ].filter(Boolean);
  if (audioTokens.length) parts.push("Audio: " + audioTokens.join(", ") + ".");

  // 4. Technical: color palette
  if (first.cinematography.color_palette && first.cinematography.color_palette !== "natural tones") {
    parts.push(`Technical: ${first.cinematography.color_palette}.`);
  }

  // 5. Scene location
  if (scene.location) parts.push(`${scene.location}, ${scene.timeOfDay}.`);

  return parts.join(" ");
}
