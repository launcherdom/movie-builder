import { fal } from "@fal-ai/client";
import { NextRequest } from "next/server";

fal.config({ credentials: process.env.FAL_KEY });

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get("requestId");
  const endpoint = searchParams.get("endpoint");

  if (!requestId || !endpoint) {
    return Response.json({ error: "requestId and endpoint are required" }, { status: 400 });
  }

  try {
    const status = await fal.queue.status(endpoint, {
      requestId,
      logs: false,
    });

    if (status.status === "COMPLETED") {
      const result = await fal.queue.result(endpoint, { requestId });
      const data = result.data as {
        video?: { url: string; width: number; height: number; duration: number };
      };

      if (!data.video) {
        return Response.json({ status: "error", error: "No video in result" });
      }

      return Response.json({
        status: "COMPLETED",
        video: {
          url: data.video.url,
          duration: data.video.duration,
          width: data.video.width,
          height: data.video.height,
          falRequestId: requestId,
        },
      });
    }

    return Response.json({ status: status.status });
  } catch (error) {
    console.error("Status check error:", error);
    return Response.json(
      { status: "error", error: error instanceof Error ? error.message : "Status check failed" },
      { status: 500 }
    );
  }
}
