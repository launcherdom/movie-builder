/**
 * Persists a fal.ai temporary URL to Vercel Blob and records it in the DB.
 * Returns the permanent blob URL, or the original URL if persistence fails
 * (so generation continues even if blob upload fails).
 */
export async function persistAsset(params: {
  url: string;
  projectId: string;
  shotId: string;
  assetType: "storyboard" | "keyframe" | "character_sheet" | "video";
}): Promise<string> {
  try {
    const res = await fetch("/api/assets/persist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) return params.url;
    const { blobUrl } = await res.json() as { blobUrl: string };
    return blobUrl ?? params.url;
  } catch {
    return params.url;
  }
}
