import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;
    const folder = (formData.get("folder") as string | null) ?? "assets";

    if (!file) {
      return Response.json({ error: "file is required" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "mp4";
    const filename = `${folder}/${projectId ?? "unknown"}/${nanoid(10)}.${ext}`;

    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type || "video/mp4",
    });

    return Response.json({ url: blob.url });
  } catch (error) {
    console.error("Asset upload error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
