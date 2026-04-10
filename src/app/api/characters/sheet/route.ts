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

    // For realistic/cinematic styles, generate a stylized semi-realistic sheet so it passes
    // Seedance 2.0 content policy (which blocks photorealistic human faces as references).
    // Preview stays photorealistic; the sheet is the policy-safe reference used for video.
    const isSemiRealStyle = style === "realistic" || style === "cinematic";
    const styleDirective = isSemiRealStyle
      ? `Stylized semi-realistic illustration style character reference sheet. Clean defined lines, slightly stylized proportions, soft cel-shading effect, subtle painterly quality. NOT photorealistic — clearly an artistic illustration while maintaining recognizable likeness to the reference image.`
      : `Character reference sheet in the style of: ${style}.`;

    const prompt = hasPreview
      ? `${styleDirective} Pure white seamless background. Consistent studio lighting throughout.

The character is shown in the reference image. Reproduce the character's exact face, hair color, hair style, skin tone, and clothing from the reference image with perfect consistency across all panels.

FACE PRIORITY: The character's facial features must be identical to the reference image across every panel — same eye shape, eye color, nose, lips, jawline, skin tone, brow shape, and hair. Facial consistency is non-negotiable.

Left side — three full-body views of the character:
1. Front: standing naturally, arms at sides, full body head to toe
2. Side (left profile): same pose, full body
3. Back: full body showing hair and outfit from behind
All three figures must be the exact same character with identical features, matching the reference image.

Upper-right — six face/head references of the same character:
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
      // When preview exists: use i2i /edit endpoint so the model edits from the preview
      ...(hasPreview && { i2i_image_url: previewImageUrl! }),
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
