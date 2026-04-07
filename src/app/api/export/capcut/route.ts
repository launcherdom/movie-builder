import { NextRequest } from "next/server";
import { zipSync } from "fflate";
import { buildCapcutDraft } from "@/lib/export/capcut";
import type { Story, AspectRatio } from "@/types/movie";

export async function POST(request: NextRequest) {
  try {
    const { story, aspectRatio } = await request.json() as {
      story: Story;
      aspectRatio: AspectRatio;
    };

    if (!story) {
      return Response.json({ error: "story is required" }, { status: 400 });
    }

    const draft = buildCapcutDraft(story, aspectRatio ?? "9:16");

    // Download all assets concurrently
    const assetEntries = Object.entries(draft.assets);
    const downloadedAssets = await Promise.allSettled(
      assetEntries.map(async ([filename, url]) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${filename}: ${res.status}`);
        const buffer = await res.arrayBuffer();
        return { filename, data: new Uint8Array(buffer) };
      })
    );

    // Build ZIP file map
    const zipFiles: Record<string, Uint8Array> = {};

    // Add draft JSON files
    zipFiles["draft_content.json"] = new TextEncoder().encode(
      JSON.stringify(draft.draft_content, null, 2)
    );
    zipFiles["draft_meta_info.json"] = new TextEncoder().encode(
      JSON.stringify(draft.draft_meta_info, null, 2)
    );

    // Add successfully downloaded assets
    for (const result of downloadedAssets) {
      if (result.status === "fulfilled") {
        zipFiles[result.value.filename] = result.value.data;
      }
    }

    const zipped = zipSync(zipFiles, { level: 0 }); // level 0 = store (fast, media already compressed)

    const draftName = story.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();

    return new Response(zipped.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${draftName}_capcut.zip"`,
        "Content-Length": String(zipped.byteLength),
      },
    });
  } catch (error) {
    console.error("CapCut export error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}
