import { NextRequest } from "next/server";
import type { Character, Scene } from "@/types/movie";
import { getImageProvider } from "@/lib/providers/registry";
import { buildSceneMangaPrompt, serializeImagePrompt } from "@/lib/generation/prompt-builder";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";

// Generates a single manga page image for an entire scene (all shots in one image).
export async function POST(request: NextRequest) {
  try {
    const { scene, characters, aspectRatio, projectId } =
      await request.json() as {
        scene: Scene;
        characters: Character[];
        aspectRatio: string;
        projectId?: string;
      };

    if (!scene.shots || scene.shots.length === 0) {
      return Response.json({ error: "Scene has no shots" }, { status: 400 });
    }

    const provider = getImageProvider();

    // Only use characters who physically appear in this scene
    const sceneCharacters = characters.filter((c) => scene.characterIds.includes(c.id));
    const activeChars = sceneCharacters.length > 0 ? sceneCharacters : [];

    // Build reference image list with labels (Image1 = Name, ...)
    const references: { url: string; name: string }[] = activeChars
      .map((c) => {
        const url = c.characterSheet?.url?.startsWith("http")
          ? c.characterSheet.url
          : c.previewImage?.url?.startsWith("http")
            ? c.previewImage.url
            : null;
        return url ? { url, name: c.name } : null;
      })
      .filter((r): r is { url: string; name: string } => r !== null)
      .slice(0, 4);

    const referenceUrls = references.map((r) => r.url);
    const referenceLabels = references.map((r, i) => `Image${i + 1} = ${r.name}`);

    const structured = buildSceneMangaPrompt(scene, activeChars, referenceLabels.length > 0 ? referenceLabels : undefined);
    const prompt = serializeImagePrompt(structured);

    // Use /edit endpoint when character references are available (nano-banana-2/edit accepts image_urls)
    const images = await provider.generateImages({
      prompt,
      num_images: 1,
      aspect_ratio: aspectRatio,
      output_format: "png",
      resolution: "1K",
      ...(referenceUrls.length > 0 && {
        i2i_image_url: referenceUrls[0],           // triggers /edit endpoint
        image_urls: referenceUrls,                  // all refs passed as image_urls
      }),
    });

    const image = images[0];
    if (!image) return Response.json({ error: "No image generated" }, { status: 500 });

    // Persist to Vercel Blob
    let finalUrl = image.url;
    try {
      const imgRes = await fetch(image.url);
      if (imgRes.ok) {
        const blob = await put(
          `${projectId ?? "project"}/storyboard/scene-${scene.id}-${nanoid(6)}.png`,
          await imgRes.arrayBuffer(),
          { access: "public", contentType: "image/png" }
        );
        finalUrl = blob.url;
      }
    } catch {
      // fallback to original URL if blob upload fails
    }

    return Response.json({ panel: { url: finalUrl, width: image.width, height: image.height } });
  } catch (error) {
    console.error("Scene manga generation error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate scene panel" },
      { status: 500 }
    );
  }
}
