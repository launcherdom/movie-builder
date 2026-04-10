import { NextRequest } from "next/server";
import { buildCharacterSheetPrompt } from "@/lib/fal/prompts";
import { getCharacterSheetProvider } from "@/lib/providers/registry";
import type { Character } from "@/types/movie";

export async function POST(request: NextRequest) {
  try {
    const { character, visualStyle, previewImageUrl } = await request.json() as {
      character: Character;
      visualStyle?: string;
      previewImageUrl?: string;
    };

    if (!character?.description) {
      return Response.json({ error: "character.description is required" }, { status: 400 });
    }

    const provider = getCharacterSheetProvider();
    const style = visualStyle ?? "cinematic";

    const sheetImages = await provider.generateImages({
      prompt: buildCharacterSheetPrompt(character, style),
      num_images: 1,
      aspect_ratio: "16:9",
      output_format: "png",
      resolution: "2K",
      // Use preview image as face reference for consistency
      ...(previewImageUrl?.startsWith("http") && { image_urls: [previewImageUrl] }),
    });

    if (!sheetImages.length) {
      return Response.json({ error: "No character sheet returned from provider" }, { status: 500 });
    }

    return Response.json({
      characterSheet: sheetImages[0],
    });
  } catch (error) {
    console.error("Character sheet error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate character sheet" },
      { status: 500 }
    );
  }
}
