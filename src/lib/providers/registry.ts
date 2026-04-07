import type { QualityTier } from "@/types/movie";
import { IMAGE_MODELS, VIDEO_MODELS } from "@/lib/fal/models";
import { FalImageProvider, FalVideoProvider } from "./fal";
import type { ImageProvider, VideoProvider } from "./types";

// Character sheets always use the draft-tier image model
const CHARACTER_ENDPOINT = IMAGE_MODELS.draft.endpoint;

export function getImageProvider(tier: QualityTier): ImageProvider {
  return new FalImageProvider(IMAGE_MODELS[tier].endpoint);
}

export function getVideoProvider(tier: QualityTier): VideoProvider {
  return new FalVideoProvider(VIDEO_MODELS[tier].endpoint);
}

export function getCharacterSheetProvider(): ImageProvider {
  return new FalImageProvider(CHARACTER_ENDPOINT);
}

/**
 * Detect the correct VideoProvider from an endpoint string.
 * Used by the status-polling route which only knows the endpoint, not the tier.
 */
export function getVideoProviderByEndpoint(endpoint: string): VideoProvider {
  // Find matching tier endpoint or fall back to a raw FalVideoProvider
  const match = Object.values(VIDEO_MODELS).find((m) => m.endpoint === endpoint);
  if (match) return new FalVideoProvider(match.endpoint);
  // Unknown endpoint — still works as long as it's a fal.ai endpoint
  return new FalVideoProvider(endpoint);
}
