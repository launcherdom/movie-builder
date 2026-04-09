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

    // Character sheets + style reference as supporting refs (not the i2i base)
    const supportingRefs = [
      ...(referenceImageUrl && referenceImageUrl.startsWith("http") ? [referenceImageUrl] : []),
      ...characterSheetUrls,
    ];

    // Generate shots sequentially: each shot uses the previous shot's output as i2i base
    // This chains visual continuity through the whole scene (and across scenes via previousPanelUrl)
    const results: Array<{ shotId: string; panel: { url: string; width: number; height: number } | null; prompt: string }> = [];
    let prevImageUrl: string | undefined = previousPanelUrl?.startsWith("http") ? previousPanelUrl : undefined;

    for (const shot of shots) {
      const structured = buildStoryboardPrompt(shot, scene, characters, visualStyle, styleAnalysis);
      const prompt = serializeImagePrompt(structured);
      try {
        const images = await provider.generateImages({
          prompt,
          num_images: 1,
          aspect_ratio: aspectRatio,
          output_format: "png",
          resolution: "1K",
          // i2i: use previous panel as source image for continuity
          ...(prevImageUrl
            ? { i2i_image_url: prevImageUrl, i2i_strength: 0.75, image_urls: supportingRefs.length > 0 ? supportingRefs : undefined }
            : { image_urls: supportingRefs.length > 0 ? supportingRefs : undefined }
          ),
        });
        const panel = images[0] ?? null;
        results.push({ shotId: shot.id, panel, prompt });
        if (panel?.url) prevImageUrl = panel.url;
      } catch {
        results.push({ shotId: shot.id, panel: null, prompt });
      }
    }

    return Response.json({ results });
  } catch (error) {
    console.error("Storyboard generation error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate storyboard" },
      { status: 500 }
    );
  }
}
