import { fal } from "@fal-ai/client";
import type {
  ImageProvider,
  ImageGenerateParams,
  GeneratedImage,
  VideoProvider,
  VideoSubmitParams,
  VideoSubmitResult,
  VideoStatusResult,
} from "./types";

fal.config({ credentials: process.env.FAL_KEY });

export class FalImageProvider implements ImageProvider {
  constructor(private readonly falEndpoint: string) {}

  async generateImages(params: ImageGenerateParams): Promise<GeneratedImage[]> {
    const input: Record<string, unknown> = {
      prompt: params.prompt,
      num_images: params.num_images ?? 1,
      aspect_ratio: params.aspect_ratio,
      output_format: params.output_format ?? "png",
      resolution: params.resolution ?? "1K",
    };
    if (params.image_urls && params.image_urls.length > 0) {
      input.image_urls = params.image_urls;
    }

    const result = await fal.subscribe(this.falEndpoint, { input });
    const data = result.data as { images: Array<{ url: string; width: number; height: number }> };

    return (data.images ?? []).map((img) => ({
      url: img.url,
      width: img.width,
      height: img.height,
    }));
  }
}

export class FalVideoProvider implements VideoProvider {
  constructor(public readonly endpoint: string) {}

  async submitVideo(params: VideoSubmitParams): Promise<VideoSubmitResult> {
    const clampedDuration = Math.min(Math.round(params.duration), params.maxDuration);
    // Seedance-family models take duration as a string enum ("auto" | "4".."15")
    const durationValue = String(clampedDuration) as string;

    const { request_id } = await fal.queue.submit(this.endpoint, {
      input: {
        prompt: params.prompt,
        image_url: params.image_url,
        duration: durationValue,
        aspect_ratio: params.aspect_ratio ?? "9:16",
        ...(params.resolution && { resolution: params.resolution }),
        ...(params.generate_audio !== undefined && { generate_audio: params.generate_audio }),
        ...(params.end_user_id && { end_user_id: params.end_user_id }),
      },
    });

    return { requestId: request_id, endpoint: this.endpoint };
  }

  async getStatus(requestId: string): Promise<VideoStatusResult> {
    const status = await fal.queue.status(this.endpoint, { requestId, logs: false });

    if (status.status === "COMPLETED") {
      const result = await fal.queue.result(this.endpoint, { requestId });
      const data = result.data as {
        video?: { url: string; width?: number; height?: number; duration?: number; file_size?: number; content_type?: string };
      };

      if (!data.video?.url) {
        return { status: "error", error: "No video in result" };
      }

      return {
        status: "COMPLETED",
        video: {
          url: data.video.url,
          width: data.video.width ?? 0,
          height: data.video.height ?? 0,
          duration: data.video.duration ?? 0,
          falRequestId: requestId,
        },
      };
    }

    return { status: status.status as "IN_QUEUE" | "IN_PROGRESS" };
  }
}
