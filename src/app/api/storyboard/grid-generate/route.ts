import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import type { QualityTier, Character, Shot, Scene, VisualStyle } from "@/types/movie";
import { getImageProvider } from "@/lib/providers/registry";
import { computeGridLayout, buildGridPrompt, splitGridImage } from "@/lib/generation/grid-split";
import { buildStoryboardPrompt, serializeImagePrompt } from "@/lib/generation/prompt-builder";

const MAX_GRID = 9; // max panels per grid call

export async function POST(request: NextRequest) {
  try {
    const { scene, characters, qualityTier, visualStyle, aspectRatio, referenceImageUrl, styleAnalysis, projectId } =
      await request.json() as {
        scene: Scene;
        characters: Character[];
        qualityTier: QualityTier;
        visualStyle: VisualStyle;
        aspectRatio: string;
        referenceImageUrl?: string;
        styleAnalysis?: string;
        projectId?: string;
      };

    const shots: Shot[] = scene.shots;

    if (!shots || shots.length === 0) {
      return Response.json({ results: [] });
    }

    // Fallback: single shot → regular storyboard prompt (no grid overhead)
    if (shots.length === 1) {
      const provider = getImageProvider(qualityTier);
      const shot = shots[0];
      const structured = buildStoryboardPrompt(shot, scene, characters, visualStyle, styleAnalysis);
      const prompt = serializeImagePrompt(structured);
      const characterRefs = characters.filter((c) => c.characterSheet?.url).map((c) => c.characterSheet!.url);
      const allRefs = referenceImageUrl ? [referenceImageUrl, ...characterRefs] : characterRefs;
      const images = await provider.generateImages({
        prompt,
        num_images: 1,
        aspect_ratio: aspectRatio,
        output_format: "png",
        resolution: "1K",
        image_urls: allRefs.length > 0 ? allRefs : undefined,
      });
      const panel = images[0] ?? null;
      return Response.json({ results: [{ shotId: shot.id, panel, prompt }] });
    }

    // For large scenes, split into sub-groups ≤ MAX_GRID
    const groups: Shot[][] = [];
    for (let i = 0; i < shots.length; i += MAX_GRID) {
      groups.push(shots.slice(i, i + MAX_GRID));
    }

    const provider = getImageProvider(qualityTier);
    const characterRefs = characters.filter((c) => c.characterSheet?.url).map((c) => c.characterSheet!.url);
    const allRefs = referenceImageUrl ? [referenceImageUrl, ...characterRefs] : characterRefs;

    const results: Array<{ shotId: string; panel: { url: string; width: number; height: number } | null; prompt: string }> = [];

    for (const group of groups) {
      const { cols, rows } = computeGridLayout(group.length);
      const gridPrompt = buildGridPrompt(group, scene, characters, visualStyle, styleAnalysis);

      // Grid always generated at 2K for better split quality
      const images = await provider.generateImages({
        prompt: gridPrompt,
        num_images: 1,
        aspect_ratio: aspectRatio,
        output_format: "png",
        resolution: "2K",
        image_urls: allRefs.length > 0 ? allRefs : undefined,
      });

      const gridImage = images[0];
      if (!gridImage) {
        for (const shot of group) results.push({ shotId: shot.id, panel: null, prompt: gridPrompt });
        continue;
      }

      // Fetch the grid image buffer
      const gridRes = await fetch(gridImage.url);
      const gridBuffer = Buffer.from(await gridRes.arrayBuffer());

      // Split grid into individual panels
      const cells = await splitGridImage(gridBuffer, cols, rows, group.length);

      // Upload each cell to Vercel Blob
      for (let i = 0; i < group.length; i++) {
        const shot = group[i];
        const cell = cells[i];
        if (!cell) {
          results.push({ shotId: shot.id, panel: null, prompt: gridPrompt });
          continue;
        }

        const filename = `${projectId ?? "project"}/storyboard/${shot.id}-${nanoid(6)}.png`;
        const blob = await put(filename, cell, { access: "public", contentType: "image/png" });

        // Estimate individual cell dimensions
        const cellW = Math.floor(gridImage.width / cols);
        const cellH = Math.floor(gridImage.height / rows);

        results.push({
          shotId: shot.id,
          panel: { url: blob.url, width: cellW, height: cellH },
          prompt: gridPrompt,
        });
      }
    }

    return Response.json({ results });
  } catch (error) {
    console.error("Grid storyboard generation error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate grid storyboard" },
      { status: 500 }
    );
  }
}
