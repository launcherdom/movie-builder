import { NextRequest } from "next/server";
import { burnSubtitles } from "@/lib/subtitles/burn";
import type { BurnOptions } from "@/lib/subtitles/burn";

export const maxDuration = 300; // 5 min — FFmpeg can take a while

export async function POST(request: NextRequest) {
  try {
    const { videoUrl, srtContent, projectId, fontStyle } = await request.json() as {
      videoUrl: string;
      srtContent: string;
      projectId?: string;
      fontStyle?: BurnOptions;
    };

    if (!videoUrl || !srtContent) {
      return Response.json({ error: "videoUrl and srtContent are required" }, { status: 400 });
    }

    const url = await burnSubtitles(videoUrl, srtContent, projectId, fontStyle ?? {});
    return Response.json({ url });
  } catch (error) {
    console.error("Video compose error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to burn subtitles" },
      { status: 500 }
    );
  }
}
