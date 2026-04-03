import { fal } from "@fal-ai/client";
import { NextRequest } from "next/server";
import { buildCharacterSheetPrompt } from "@/lib/fal/prompts";
import type { Character } from "@/types/movie";

fal.config({ credentials: process.env.FAL_KEY });

export async function POST(request: NextRequest) {
  try {
    const { character } = await request.json() as { character: Character };

    if (!character?.description) {
      return Response.json({ error: "character.description is required" }, { status: 400 });
    }

    const prompt = buildCharacterSheetPrompt(character);

    const result = await fal.subscribe("fal-ai/nano-banana-2", {
      input: {
        prompt,
        num_images: 1,
        aspect_ratio: "16:9",
        output_format: "png",
        resolution: "2K",
      },
    });

    const data = result.data as { images: Array<{ url: string; width: number; height: number }> };

    if (!data.images?.length) {
      return Response.json({ error: "No image returned from fal.ai" }, { status: 500 });
    }

    return Response.json({
      characterSheet: {
        url: data.images[0].url,
        width: data.images[0].width,
        height: data.images[0].height,
        falRequestId: result.requestId,
      },
    });
  } catch (error) {
    console.error("Character sheet error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate character sheet" },
      { status: 500 }
    );
  }
}
