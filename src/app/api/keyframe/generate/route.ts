import { fal } from "@fal-ai/client";
import { NextRequest } from "next/server";
import type { QualityTier, Character, Shot, VisualStyle } from "@/types/movie";
import { getImageModel } from "@/lib/fal/models";
import { buildKeyframePrompt, serializeImagePrompt } from "@/lib/generation/prompt-builder";

fal.config({ credentials: process.env.FAL_KEY });

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

    const model = getImageModel(qualityTier);
    const scene = { description: sceneDescription };

    const results = await Promise.all(
      shots.map(async (shot) => {
        const structured = buildKeyframePrompt(shot, scene, characters, visualStyle, styleAnalysis);
        const prompt = serializeImagePrompt(structured);

        const input: Record<string, unknown> = {
          prompt,
          num_images: 1,
          aspect_ratio: aspectRatio,
          output_format: "png",
          resolution: "1K",
        };

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
