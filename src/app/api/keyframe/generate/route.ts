import { fal } from "@fal-ai/client";
import { NextRequest } from "next/server";
import type { QualityTier, Character, Shot } from "@/types/movie";
import { getImageModel } from "@/lib/fal/models";

fal.config({ credentials: process.env.FAL_KEY });

const STYLE_PREFIX: Record<string, string> = {
  realistic: "Photorealistic cinematic film frame, 35mm film, shallow depth of field, film grain.",
  cinematic: "Cinematic film frame, anamorphic lens, dramatic lighting, film grain.",
  anime: "High quality anime frame, studio quality, detailed cel shading, vibrant colors.",
  comic: "High quality comic book frame, vivid colors, detailed artwork, professional illustration.",
};

function buildKeyframePrompt(
  shot: Shot,
  sceneDescription: string,
  characters: Character[],
  visualStyle: string
): string {
  const stylePrefix = STYLE_PREFIX[visualStyle] ?? STYLE_PREFIX.realistic;
  const shotChars = characters.filter((c) =>
    shot.description.toLowerCase().includes(c.name.toLowerCase())
  );
  const charDescs = (shotChars.length > 0 ? shotChars : characters)
    .map((c) => c.description)
    .join(", ");

  return `${stylePrefix} ${shot.shotType} shot. ${shot.description}. ${sceneDescription}. Characters: ${charDescs}. High quality, detailed.`;
}

export async function POST(request: NextRequest) {
  try {
    const { shots, sceneDescription, characters, qualityTier, visualStyle, aspectRatio } =
      await request.json() as {
        shots: Shot[];
        sceneDescription: string;
        characters: Character[];
        qualityTier: QualityTier;
        visualStyle: string;
        aspectRatio: string;
      };

    const model = getImageModel(qualityTier);

    // Reference images: character sheets + storyboard panels for composition guidance
    const characterRefs = characters
      .filter((c) => c.characterSheet?.url)
      .map((c) => c.characterSheet!.url);

    const results = await Promise.all(
      shots.map(async (shot) => {
        const prompt = buildKeyframePrompt(shot, sceneDescription, characters, visualStyle);

        // Include storyboard panel as composition reference if available
        const refImages = shot.storyboardPanel?.url
          ? [...characterRefs, shot.storyboardPanel.url]
          : characterRefs;

        const input: Record<string, unknown> = {
          prompt,
          num_images: 1,
          aspect_ratio: aspectRatio,
          output_format: "png",
          resolution: "1K",
        };
        if (refImages.length > 0) {
          input.image_urls = refImages;
        }

        const result = await fal.subscribe(model.endpoint, { input });
        const data = result.data as { images: Array<{ url: string; width: number; height: number }> };

        return {
          shotId: shot.id,
          keyframe: data.images?.[0]
            ? { url: data.images[0].url, width: data.images[0].width, height: data.images[0].height }
            : null,
          prompt,
        };
      })
    );

    return Response.json({ results });
  } catch (error) {
    console.error("Keyframe generation error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate keyframe" },
      { status: 500 }
    );
  }
}
