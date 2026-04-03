import { fal } from "@fal-ai/client";
import { NextRequest } from "next/server";
import type { QualityTier, Character, Shot } from "@/types/movie";
import { getImageModel } from "@/lib/fal/models";

fal.config({ credentials: process.env.FAL_KEY });

function buildPanelPrompt(
  shot: Shot,
  sceneDescription: string,
  characters: Character[],
  visualStyle: string
): string {
  const shotChars = characters.filter((c) => shot.description.toLowerCase().includes(c.name.toLowerCase()));
  const charDescs = shotChars.length > 0
    ? shotChars.map((c) => c.description).join(", ")
    : characters.map((c) => c.description).join(", ");

  return `${visualStyle} style film storyboard panel. ${shot.shotType} shot. ${shot.description}. ${sceneDescription}. Characters: ${charDescs}. Cinematic lighting, high quality.`;
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
    const referenceImages = characters
      .filter((c) => c.characterSheet?.url)
      .map((c) => c.characterSheet!.url);

    const results = await Promise.all(
      shots.map(async (shot) => {
        const prompt = buildPanelPrompt(shot, sceneDescription, characters, visualStyle);
        const input: Record<string, unknown> = {
          prompt,
          num_images: 1,
          aspect_ratio: aspectRatio,
          output_format: "png",
          resolution: "1K",
        };
        if (referenceImages.length > 0) {
          input.image_urls = referenceImages;
        }

        const result = await fal.subscribe(model.endpoint, { input });
        const data = result.data as { images: Array<{ url: string; width: number; height: number }> };

        return {
          shotId: shot.id,
          panel: data.images?.[0]
            ? { url: data.images[0].url, width: data.images[0].width, height: data.images[0].height }
            : null,
          prompt,
        };
      })
    );

    return Response.json({ results });
  } catch (error) {
    console.error("Storyboard generation error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate storyboard" },
      { status: 500 }
    );
  }
}
