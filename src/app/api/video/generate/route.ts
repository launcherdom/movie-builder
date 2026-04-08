import { NextRequest } from "next/server";
import type { QualityTier, VideoPromptJson } from "@/types/movie";
import { getVideoProvider } from "@/lib/providers/registry";
import { VIDEO_MODELS } from "@/lib/fal/models";

export async function POST(request: NextRequest) {
  try {
    const { shotId, imageUrl, videoPromptJson, duration, qualityTier, aspectRatio } =
      await request.json() as {
        shotId: string;
        imageUrl: string;
        videoPromptJson: VideoPromptJson;
        duration: number;
        qualityTier: QualityTier;
        aspectRatio?: string;
      };

    if (!imageUrl || !videoPromptJson) {
      return Response.json({ error: "imageUrl and videoPromptJson are required" }, { status: 400 });
    }

    const provider = getVideoProvider(qualityTier);
    const model = VIDEO_MODELS[qualityTier];
    const prompt = JSON.stringify(videoPromptJson);

    // Seedance tier mapping: draft=480p no-audio, standard/premium=720p with-audio
    const resolution = qualityTier === "draft" ? "480p" : "720p";
    const generate_audio = model.supportsAudio && qualityTier !== "draft";

    const { requestId, endpoint } = await provider.submitVideo({
      prompt,
      image_url: imageUrl,
      duration,
      maxDuration: model.maxDuration,
      aspect_ratio: aspectRatio ?? "9:16",
      resolution,
      generate_audio,
    });

    return Response.json({ shotId, requestId, endpoint });
  } catch (error) {
    console.error("Video generation error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate video" },
      { status: 500 }
    );
  }
}
