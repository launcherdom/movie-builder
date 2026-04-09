import { NextRequest } from "next/server";
import type { QualityTier, VideoPromptJson } from "@/types/movie";
import { getVideoProvider } from "@/lib/providers/registry";
import { VIDEO_MODELS } from "@/lib/fal/models";
import { serializeVideoPrompt, serializeSceneVideoPrompt } from "@/lib/generation/prompt-builder";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      // Shot mode (legacy)
      shotId?: string;
      referenceImageUrls: string[];
      videoPromptJson?: VideoPromptJson;
      duration?: number;
      // Scene mode
      sceneId?: string;
      shots?: Array<{ prompt: VideoPromptJson; startTime: number; endTime: number }>;
      totalDuration?: number;
      scene?: { location: string; timeOfDay: string };
      // Common
      qualityTier: QualityTier;
      aspectRatio?: string;
      projectId?: string;
    };

    const { referenceImageUrls, qualityTier, aspectRatio, projectId } = body;

    if (!referenceImageUrls?.length) {
      return Response.json({ error: "referenceImageUrls are required" }, { status: 400 });
    }

    const provider = getVideoProvider(qualityTier);
    const model = VIDEO_MODELS[qualityTier];

    // Filter out data: URLs (base64) — fal.ai only accepts http(s) URLs. Clamp to 9 max.
    const validRefs = referenceImageUrls
      .filter((u) => u && u.startsWith("http"))
      .slice(0, 9);

    if (validRefs.length === 0) {
      return Response.json({ error: "No valid http reference image URLs provided" }, { status: 400 });
    }

    let prompt: string;
    let duration: number;
    let id: string;

    if (body.sceneId && body.shots && body.shots.length > 0) {
      // Scene mode: multi-timestamp prompt
      const totalDuration = body.totalDuration ?? body.shots.reduce((s, sh) => s + (sh.endTime - sh.startTime), 0);
      duration = Math.min(Math.round(totalDuration), 15);
      prompt = serializeSceneVideoPrompt(body.shots, body.scene ?? { location: "", timeOfDay: "day" });
      id = body.sceneId;
      console.log("[video/generate] SCENE mode prompt:", prompt);
    } else if (body.shotId && body.videoPromptJson && body.duration) {
      // Shot mode (legacy individual shot)
      duration = body.duration;
      prompt = serializeVideoPrompt(body.videoPromptJson, duration);
      id = body.shotId;
    } else {
      return Response.json({ error: "Provide either sceneId+shots or shotId+videoPromptJson+duration" }, { status: 400 });
    }

    const { requestId, endpoint } = await provider.submitVideo({
      prompt,
      reference_image_urls: validRefs,
      duration,
      maxDuration: model.maxDuration,
      aspect_ratio: aspectRatio ?? "9:16",
      resolution: "720p",
      generate_audio: true,
      end_user_id: projectId,
    });

    return Response.json({ id, requestId, endpoint });
  } catch (error) {
    console.error("Video generation error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate video" },
      { status: 500 }
    );
  }
}
