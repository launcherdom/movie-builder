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

export const IMAGE_MODEL: ImageModelConfig = {
  endpoint: "fal-ai/nano-banana-2",
  name: "Nano Banana 2",
  costPerImage: 0.02,
};

export const VIDEO_MODEL: VideoModelConfig = {
  endpoint: "bytedance/seedance-2.0/fast/reference-to-video",
  name: "Seedance 2.0 Fast Reference (720p)",
  costPerSecond: 0.05,
  maxDuration: 15,
  supportsAudio: true,
  supportsReferenceImages: true,
};

export function getImageModel(): ImageModelConfig {
  return IMAGE_MODEL;
}

export function getVideoModel(): VideoModelConfig {
  return VIDEO_MODEL;
}
