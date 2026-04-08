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
    endpoint: "bytedance/seedance-2.0/fast/image-to-video",
    name: "Seedance 2.0 Fast (480p)",
    costPerSecond: 0.03,
    maxDuration: 15,
    supportsAudio: true,
    supportsReferenceImages: true,
  },
  standard: {
    endpoint: "bytedance/seedance-2.0/fast/image-to-video",
    name: "Seedance 2.0 Fast (720p)",
    costPerSecond: 0.05,
    maxDuration: 15,
    supportsAudio: true,
    supportsReferenceImages: true,
  },
  premium: {
    endpoint: "bytedance/seedance-2.0/fast/image-to-video",
    name: "Seedance 2.0 Fast (720p + audio)",
    costPerSecond: 0.05,
    maxDuration: 15,
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
