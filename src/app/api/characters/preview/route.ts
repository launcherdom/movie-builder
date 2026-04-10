import { NextRequest } from "next/server";
import { getCharacterSheetProvider } from "@/lib/providers/registry";
import type { Character } from "@/types/movie";

function buildPreviewPrompt(character: Character, visualStyle: string): string {
  const style = visualStyle === "anime"
    ? "high-quality anime art, detailed cel shading"
    : visualStyle === "comic"
    ? "comic book illustration, bold lines, vivid colors"
    : visualStyle === "cinematic"
    ? "cinematic portrait, dramatic lighting, film grain"
    : "photorealistic portrait, natural lighting";

  const extra = character.imagePrompt?.trim() ? ` ${character.imagePrompt.trim()}.` : "";

  return `${style}. Portrait of ${character.description}.${extra} Full face visible, expressive eyes, white or neutral background, no text, no watermark. High detail, sharp focus.`;
}

export async function POST(request: NextRequest) {
  try {
    const { character, visualStyle, referenceImageUrl } = await request.json() as {
      character: Character;
      visualStyle?: string;
      referenceImageUrl?: string;
    };

    if (!character?.description) {
      return Response.json({ error: "character.description is required" }, { status: 400 });
    }

    const provider = getCharacterSheetProvider();
    const style = visualStyle ?? "cinematic";
    const prompt = buildPreviewPrompt(character, style);

    const images = await provider.generateImages({
      prompt,
      num_images: 1,
      aspect_ratio: "9:16",
      output_format: "png",
      resolution: "1K",
      ...(referenceImageUrl?.startsWith("http") && { image_urls: [referenceImageUrl] }),
    });

    if (!images.length) {
      return Response.json({ error: "No preview image returned" }, { status: 500 });
    }

    return Response.json({ previewImage: images[0] });
  } catch (error) {
    console.error("Character preview error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate preview" },
      { status: 500 }
    );
  }
}
