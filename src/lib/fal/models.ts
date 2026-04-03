import type { QualityTier } from "@/types/movie";

export interface ImageModelConfig {
  endpoint: string;
  name: string;
  costPerImage: number;
}

export interface VideoModelConfig {
  endpoint: string;
  name: string;
  costPerSecond: number;
  maxDuration: number;
  supportsAudio: boolean;
  supportsReferenceImages: boolean;
}

export const IMAGE_MODELS: Record<QualityTier, ImageModelConfig> = {
  draft: {
    endpoint: "fal-ai/nano-banana-pro",
    name: "Nano Banana Pro",
    costPerImage: 0.01,
  },
  standard: {
    endpoint: "fal-ai/flux-2",
    name: "Flux 2",
    costPerImage: 0.04,
  },
  premium: {
    endpoint: "fal-ai/flux-2-pro",
    name: "Flux 2 Pro",
    costPerImage: 0.06,
  },
};

export const VIDEO_MODELS: Record<QualityTier, VideoModelConfig> = {
  draft: {
    endpoint: "fal-ai/ltx-video/image-to-video",
    name: "LTX Video",
    costPerSecond: 0.03,
    maxDuration: 20,
    supportsAudio: true,
    supportsReferenceImages: false,
  },
  standard: {
    endpoint: "fal-ai/kling-video/v2.1/standard/image-to-video",
    name: "Kling 2.1 Standard",
    costPerSecond: 0.029,
    maxDuration: 10,
    supportsAudio: false,
    supportsReferenceImages: true,
  },
  premium: {
    endpoint: "fal-ai/veo3.1/image-to-video",
    name: "Veo 3.1",
    costPerSecond: 0.20,
    maxDuration: 8,
    supportsAudio: true,
    supportsReferenceImages: true,
  },
};

export function getImageModel(tier: QualityTier): ImageModelConfig {
  return IMAGE_MODELS[tier];
}

export function getVideoModel(tier: QualityTier): VideoModelConfig {
  return VIDEO_MODELS[tier];
}
