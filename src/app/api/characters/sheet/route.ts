import { NextRequest } from "next/server";
import { buildCharacterSheetPrompt, buildFaceImagePrompt } from "@/lib/fal/prompts";
import { getCharacterSheetProvider } from "@/lib/providers/registry";
import type { Character } from "@/types/movie";

export async function POST(request: NextRequest) {
  try {
    const { character } = await request.json() as { character: Character };

    if (!character?.description) {
      return Response.json({ error: "character.description is required" }, { status: 400 });
    }

    const provider = getCharacterSheetProvider();

    // Generate character sheet and face image in parallel
    const [sheetImages, faceImages] = await Promise.all([
      provider.generateImages({
        prompt: buildCharacterSheetPrompt(character),
        num_images: 1,
        aspect_ratio: "16:9",
        output_format: "png",
        resolution: "2K",
      }),
      provider.generateImages({
        prompt: buildFaceImagePrompt(character),
        num_images: 1,
        aspect_ratio: "9:16",
        output_format: "png",
        resolution: "2K",
      }),
    ]);

    if (!sheetImages.length) {
      return Response.json({ error: "No character sheet returned from provider" }, { status: 500 });
    }

    return Response.json({
      characterSheet: sheetImages[0],
      faceImage: faceImages[0] ?? null,
    });
  } catch (error) {
    console.error("Character sheet error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate character sheet" },
      { status: 500 }
    );
  }
}
