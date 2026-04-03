import { fal } from "@fal-ai/client";
import { NextRequest } from "next/server";
import type { QualityTier, VideoPromptJson } from "@/types/movie";
import { getVideoModel } from "@/lib/fal/models";

fal.config({ credentials: process.env.FAL_KEY });

export async function POST(request: NextRequest) {
  try {
    const { shotId, imageUrl, videoPromptJson, duration, qualityTier } =
      await request.json() as {
        shotId: string;
        imageUrl: string;
        videoPromptJson: VideoPromptJson;
        duration: number;
        qualityTier: QualityTier;
      };

    if (!imageUrl || !videoPromptJson) {
      return Response.json({ error: "imageUrl and videoPromptJson are required" }, { status: 400 });
    }

    const model = getVideoModel(qualityTier);
    const prompt = JSON.stringify(videoPromptJson);

    const result = await fal.subscribe(model.endpoint, {
      input: {
        prompt,
        image_url: imageUrl,
        duration: Math.min(duration, model.maxDuration),
      },
    });

    const data = result.data as {
      video?: { url: string; width: number; height: number; duration: number };
    };

    if (!data.video) {
      return Response.json({ error: "No video returned from fal.ai" }, { status: 500 });
    }

    return Response.json({
      shotId,
      video: {
        url: data.video.url,
        duration: data.video.duration,
        width: data.video.width,
        height: data.video.height,
        falRequestId: result.requestId,
        hasAudio: model.supportsAudio,
      },
    });
  } catch (error) {
    console.error("Video generation error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate video" },
      { status: 500 }
    );
  }
}
