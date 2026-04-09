import { NextRequest } from "next/server";
import type { Character, Shot, Scene, VisualStyle } from "@/types/movie";
import { getImageProvider } from "@/lib/providers/registry";
import { buildStoryboardPrompt, serializeImagePrompt } from "@/lib/generation/prompt-builder";

// Generates all shots in a scene in parallel, using character sheets as reference images
// for visual consistency (replaces the unreliable grid-split approach).
export async function POST(request: NextRequest) {
  try {
    const { scene, characters, visualStyle, aspectRatio, referenceImageUrl, styleAnalysis, previousPanelUrl } =
      await request.json() as {
        scene: Scene;
        characters: Character[];
        visualStyle: VisualStyle;
        aspectRatio: string;
        referenceImageUrl?: string;
        styleAnalysis?: string;
        previousPanelUrl?: string; // last panel of the previous scene for visual continuity
        projectId?: string;
      };

    const shots: Shot[] = scene.shots;
    if (!shots || shots.length === 0) return Response.json({ results: [] });

    const provider = getImageProvider();

    // Character sheets of characters appearing in this scene as visual anchors
    const sceneCharacters = characters.filter((c) => scene.characterIds.includes(c.id));
    const characterSheetUrls = sceneCharacters
      .filter((c) => c.characterSheet?.url?.startsWith("http"))
      .map((c) => c.characterSheet!.url);

    // Style reference + previous scene's last panel + character sheets as image_urls
    // previousPanelUrl comes first so the model anchors to the visual continuity frame
    const refUrls = [
      ...(previousPanelUrl && previousPanelUrl.startsWith("http") ? [previousPanelUrl] : []),
      ...(referenceImageUrl && referenceImageUrl.startsWith("http") ? [referenceImageUrl] : []),
      ...characterSheetUrls,
    ];

    // Generate all shots in parallel
    const results = await Promise.all(
      shots.map(async (shot) => {
        const structured = buildStoryboardPrompt(shot, scene, characters, visualStyle, styleAnalysis);
        const prompt = serializeImagePrompt(structured);
        try {
          const images = await provider.generateImages({
            prompt,
            num_images: 1,
            aspect_ratio: aspectRatio,
            output_format: "png",
            resolution: "1K",
            image_urls: refUrls.length > 0 ? refUrls : undefined,
          });
          return { shotId: shot.id, panel: images[0] ?? null, prompt };
        } catch {
          return { shotId: shot.id, panel: null, prompt };
        }
      })
    );

    return Response.json({ results });
  } catch (error) {
    console.error("Storyboard generation error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate storyboard" },
      { status: 500 }
    );
  }
}
