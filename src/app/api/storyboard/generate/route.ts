import { NextRequest } from "next/server";
import type { Character, Shot, VisualStyle } from "@/types/movie";
import { getImageProvider } from "@/lib/providers/registry";
import { buildStoryboardPrompt, serializeImagePrompt } from "@/lib/generation/prompt-builder";

export async function POST(request: NextRequest) {
  try {
    const { shots, sceneDescription, characters, visualStyle, aspectRatio, referenceImageUrl, styleAnalysis } =
      await request.json() as {
        shots: Shot[];
        sceneDescription: string;
        characters: Character[];
        visualStyle: VisualStyle;
        aspectRatio: string;
        referenceImageUrl?: string;
        styleAnalysis?: string;
      };

    const provider = getImageProvider();
    const scene = { description: sceneDescription };

    const characterRefs = characters
      .filter((c) => c.characterSheet?.url)
      .map((c) => c.characterSheet!.url);
    const allRefs = referenceImageUrl
      ? [referenceImageUrl, ...characterRefs]
      : characterRefs;

    const results = await Promise.all(
      shots.map(async (shot) => {
        const structured = buildStoryboardPrompt(shot, scene, characters, visualStyle, styleAnalysis);
        const prompt = serializeImagePrompt(structured);

        const images = await provider.generateImages({
          prompt,
          num_images: 1,
          aspect_ratio: aspectRatio,
          output_format: "png",
          resolution: "1K",
          image_urls: allRefs.length > 0 ? allRefs : undefined,
        });

        return {
          shotId: shot.id,
          panel: images[0] ?? null,
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
