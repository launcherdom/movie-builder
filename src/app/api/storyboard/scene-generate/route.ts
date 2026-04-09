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

    // Character sheets as visual anchors
    const sceneCharacters = characters.filter((c) => scene.characterIds.includes(c.id));
    const characterSheetUrls = sceneCharacters
      .filter((c) => c.characterSheet?.url?.startsWith("http"))
      .map((c) => c.characterSheet!.url);

    const structured = buildSceneMangaPrompt(scene, sceneCharacters.length > 0 ? sceneCharacters : characters);
    const prompt = serializeImagePrompt(structured);

    const images = await provider.generateImages({
      prompt,
      num_images: 1,
      aspect_ratio: aspectRatio,
      output_format: "png",
      resolution: "1K",
      ...(characterSheetUrls.length > 0 && { image_urls: characterSheetUrls }),
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
