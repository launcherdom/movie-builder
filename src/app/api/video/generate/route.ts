import { NextRequest } from "next/server";
import type { QualityTier, VideoPromptJson } from "@/types/movie";
import { getVideoProvider } from "@/lib/providers/registry";
import { VIDEO_MODELS } from "@/lib/fal/models";
import { serializeVideoPrompt } from "@/lib/generation/prompt-builder";

export async function POST(request: NextRequest) {
  try {
    const { shotId, referenceImageUrls, videoPromptJson, duration, qualityTier, aspectRatio, projectId } =
      await request.json() as {
        shotId: string;
        referenceImageUrls: string[];   // storyboard/keyframe + character sheets + transition ref
        videoPromptJson: VideoPromptJson;
        duration: number;
        qualityTier: QualityTier;
        aspectRatio?: string;
        projectId?: string;
      };

    if (!referenceImageUrls?.length || !videoPromptJson) {
      return Response.json({ error: "referenceImageUrls and videoPromptJson are required" }, { status: 400 });
    }

    const provider = getVideoProvider(qualityTier);
    const model = VIDEO_MODELS[qualityTier];
    const prompt = serializeVideoPrompt(videoPromptJson, duration);

    // Seedance tier mapping: draft=480p, standard/premium=720p with audio
    const resolution = qualityTier === "draft" ? "480p" : "720p";
    const generate_audio = model.supportsAudio && qualityTier !== "draft";

    // Filter out data: URLs (base64) — fal.ai only accepts http(s) URLs
    // Clamp to 9 (API max for reference-to-video)
    const validRefs = referenceImageUrls
      .filter((u) => u && u.startsWith("http"))
      .slice(0, 9);

    if (validRefs.length === 0) {
      return Response.json({ error: "No valid http reference image URLs provided" }, { status: 400 });
    }

    const { requestId, endpoint } = await provider.submitVideo({
      prompt,
      reference_image_urls: validRefs,
      duration,
      maxDuration: model.maxDuration,
      aspect_ratio: aspectRatio ?? "9:16",
      resolution,
      generate_audio,
      end_user_id: projectId,
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
