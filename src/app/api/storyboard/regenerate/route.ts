import { fal } from "@fal-ai/client";
import { NextRequest } from "next/server";
import type { QualityTier, Character } from "@/types/movie";
import { getImageModel } from "@/lib/fal/models";

fal.config({ credentials: process.env.FAL_KEY });

export async function POST(request: NextRequest) {
  try {
    const { prompt, qualityTier, aspectRatio, characters } =
      await request.json() as {
        prompt: string;
        qualityTier: QualityTier;
        aspectRatio: string;
        characters: Character[];
      };

    if (!prompt) {
      return Response.json({ error: "prompt is required" }, { status: 400 });
    }

    const model = getImageModel(qualityTier);
    const referenceImages = characters
      .filter((c) => c.characterSheet?.url)
      .map((c) => c.characterSheet!.url);

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

    if (!data.images?.length) {
      return Response.json({ error: "No image returned" }, { status: 500 });
    }

    return Response.json({
      panel: {
        url: data.images[0].url,
        width: data.images[0].width,
        height: data.images[0].height,
        falRequestId: result.requestId,
      },
    });
  } catch (error) {
    console.error("Panel regeneration error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to regenerate panel" },
      { status: 500 }
    );
  }
}
