import { IMAGE_MODEL, VIDEO_MODEL } from "@/lib/fal/models";
import { FalImageProvider, FalVideoProvider } from "./fal";
import type { ImageProvider, VideoProvider } from "./types";

export function getImageProvider(): ImageProvider {
  return new FalImageProvider(IMAGE_MODEL.endpoint);
}

export function getVideoProvider(): VideoProvider {
  return new FalVideoProvider(VIDEO_MODEL.endpoint);
}

export function getCharacterSheetProvider(): ImageProvider {
  return new FalImageProvider(IMAGE_MODEL.endpoint);
}

export function getVideoProviderByEndpoint(endpoint: string): VideoProvider {
  return new FalVideoProvider(endpoint);
}
