import { NextRequest } from "next/server";
import { getVideoProviderByEndpoint } from "@/lib/providers/registry";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get("requestId");
  const endpoint = searchParams.get("endpoint");

  if (!requestId || !endpoint) {
    return Response.json({ error: "requestId and endpoint are required" }, { status: 400 });
  }

  try {
    const provider = getVideoProviderByEndpoint(endpoint);
    const result = await provider.getStatus(requestId);
    return Response.json(result);
  } catch (error) {
    console.error("Status check error:", error);
    return Response.json(
      { status: "error", error: error instanceof Error ? error.message : "Status check failed" },
      { status: 500 }
    );
  }
}
