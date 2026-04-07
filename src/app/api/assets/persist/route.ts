import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/db/index";
import { generatedAssets } from "@/db/schema";
import { nanoid } from "nanoid";

type AssetType = "storyboard" | "keyframe" | "character_sheet" | "video";

export async function POST(request: NextRequest) {
  try {
    const { url, projectId, shotId, assetType } = await request.json() as {
      url: string;
      projectId: string;
      shotId: string;
      assetType: AssetType;
    };

    if (!url || !projectId || !shotId || !assetType) {
      return Response.json({ error: "url, projectId, shotId, assetType are required" }, { status: 400 });
    }

    // Download from fal.ai temp URL
    const sourceRes = await fetch(url);
    if (!sourceRes.ok) {
      return Response.json({ error: "Failed to fetch source asset" }, { status: 502 });
    }

    const buffer = await sourceRes.arrayBuffer();
    const contentType = sourceRes.headers.get("content-type") ?? "application/octet-stream";
    const ext = contentType.includes("video") ? "mp4" : "png";
    const filename = `${projectId}/${assetType}/${shotId}-${nanoid(6)}.${ext}`;

    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      access: "public",
      contentType,
    });

    // Record in DB
    await db.insert(generatedAssets).values({
      id: nanoid(),
      projectId,
      shotId,
      assetType,
      blobUrl: blob.url,
      metadata: { originalUrl: url, contentType },
    });

    return Response.json({ blobUrl: blob.url });
  } catch (error) {
    console.error("Asset persist error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to persist asset" },
      { status: 500 }
    );
  }
}
