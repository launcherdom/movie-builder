import { NextRequest } from "next/server";
import type { QualityTier, Character, Shot, VisualStyle } from "@/types/movie";
import { getImageProvider } from "@/lib/providers/registry";
import { buildKeyframePrompt, serializeImagePrompt } from "@/lib/generation/prompt-builder";

export async function POST(request: NextRequest) {
  try {
    const { shots, sceneDescription, characters, qualityTier, visualStyle, aspectRatio, styleAnalysis } =
      await request.json() as {
        shots: Shot[];
        sceneDescription: string;
        characters: Character[];
        qualityTier: QualityTier;
        visualStyle: VisualStyle;
        aspectRatio: string;
        styleAnalysis?: string;
      };

    const provider = getImageProvider(qualityTier);
    const scene = { description: sceneDescription };

    const results = await Promise.all(
      shots.map(async (shot) => {
        const structured = buildKeyframePrompt(shot, scene, characters, visualStyle, styleAnalysis);
        const prompt = serializeImagePrompt(structured);

        const images = await provider.generateImages({
          prompt,
          num_images: 1,
          aspect_ratio: aspectRatio,
          output_format: "png",
          resolution: "1K",
        });

        return {
          shotId: shot.id,
          keyframe: images[0] ?? null,
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
