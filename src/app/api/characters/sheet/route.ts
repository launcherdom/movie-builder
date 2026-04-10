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
    const hasPreview = previewImageUrl?.startsWith("http");

    const prompt = hasPreview
      ? `Character reference sheet in the style of: ${style}. Pure white seamless background. Consistent studio lighting throughout.

@Image1 is the character. Create a full character reference sheet using @Image1's exact face, hair, and appearance.

Left side — three full-body views of @Image1:
1. Front: standing naturally, arms at sides, full body head to toe
2. Side (left profile): same pose, full body
3. Back: full body showing hair and outfit from behind

Upper-right — six face/head references of @Image1:
- Large front-facing portrait (dominant)
- Slight downward angle
- Back of head showing hairstyle
- Left profile
- 3/4 angle portrait
- Extreme close-up of face filling the frame

Lower-right — six detail close-ups:
- Upper garment texture
- Lower body clothing
- Waist / belt detail
- Hands or arm detail
- Eye and facial feature close-up
- Footwear

Output: Landscape composition, white background, full layout visible, no cropping, no text labels, no watermarks.`
      : buildCharacterSheetPrompt(character, style);

    const sheetImages = await provider.generateImages({
      prompt,
      num_images: 1,
      aspect_ratio: "16:9",
      output_format: "png",
      resolution: "2K",
      ...(hasPreview && { image_urls: [previewImageUrl!] }),
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
