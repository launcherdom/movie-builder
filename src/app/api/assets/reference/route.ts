import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return Response.json({ error: "file is required" }, { status: 400 });

    const ext = file.type.split("/")[1] ?? "jpg";
    const blob = await put(`character-references/${nanoid()}.${ext}`, await file.arrayBuffer(), {
      access: "public",
      contentType: file.type || "image/jpeg",
    });

    return Response.json({ url: blob.url });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 });
  }
}
