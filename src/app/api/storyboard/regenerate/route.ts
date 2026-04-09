import { NextRequest } from "next/server";
import type { Character } from "@/types/movie";
import { getImageProvider } from "@/lib/providers/registry";

export async function POST(request: NextRequest) {
  try {
    const { prompt, aspectRatio, characters } =
      await request.json() as {
        prompt: string;
        aspectRatio: string;
        characters: Character[];
      };

    if (!prompt) {
      return Response.json({ error: "prompt is required" }, { status: 400 });
    }

    const provider = getImageProvider();
    const referenceImages = characters
      .filter((c) => c.characterSheet?.url)
      .map((c) => c.characterSheet!.url);

    const images = await provider.generateImages({
      prompt,
      num_images: 1,
      aspect_ratio: aspectRatio,
      output_format: "png",
      resolution: "1K",
      image_urls: referenceImages.length > 0 ? referenceImages : undefined,
    });

    if (!images.length) {
      return Response.json({ error: "No image returned" }, { status: 500 });
    }

    return Response.json({ panel: images[0] });
  } catch (error) {
    console.error("Panel regeneration error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to regenerate panel" },
      { status: 500 }
    );
  }
}
