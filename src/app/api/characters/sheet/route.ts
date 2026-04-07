import { NextRequest } from "next/server";
import { buildCharacterSheetPrompt } from "@/lib/fal/prompts";
import { getCharacterSheetProvider } from "@/lib/providers/registry";
import type { Character } from "@/types/movie";

export async function POST(request: NextRequest) {
  try {
    const { character } = await request.json() as { character: Character };

    if (!character?.description) {
      return Response.json({ error: "character.description is required" }, { status: 400 });
    }

    const prompt = buildCharacterSheetPrompt(character);
    const provider = getCharacterSheetProvider();

    const images = await provider.generateImages({
      prompt,
      num_images: 1,
      aspect_ratio: "16:9",
      output_format: "png",
      resolution: "2K",
    });

    if (!images.length) {
      return Response.json({ error: "No image returned from provider" }, { status: 500 });
    }

    return Response.json({ characterSheet: images[0] });
  } catch (error) {
    console.error("Character sheet error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate character sheet" },
      { status: 500 }
    );
  }
}
