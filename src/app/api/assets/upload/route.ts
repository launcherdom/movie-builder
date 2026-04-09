import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json() as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["video/mp4", "image/png", "image/jpeg", "image/webp"],
        maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
        allowOverwrite: true,
      }),
      onUploadCompleted: async () => {},
    });
    return Response.json(jsonResponse);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }
}
