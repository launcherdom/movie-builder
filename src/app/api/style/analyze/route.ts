import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "file is required" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const contentType = file.type || "image/jpeg";

    // Upload to Vercel Blob for persistence
    const blob = await put(`style-references/${nanoid()}.${contentType.split("/")[1] ?? "jpg"}`, buffer, {
      access: "public",
      contentType,
    });

    // Analyze style with Claude Vision
    const base64 = Buffer.from(buffer).toString("base64");
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: contentType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: base64,
              },
            },
            {
              type: "text",
              text: `Analyze the visual style of this image. Describe in 1-2 concise sentences the following for use as a prompt addition in image generation:
- Color palette and tones
- Lighting quality and direction
- Overall mood and atmosphere
- Any distinctive visual characteristics

Be specific and technical, like a cinematographer's style guide. Output only the style description, no preamble.`,
            },
          ],
        },
      ],
    });

    const styleAnalysis = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join(" ")
      .trim();

    return Response.json({
      blobUrl: blob.url,
      styleAnalysis,
    });
  } catch (error) {
    console.error("Style analyze error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to analyze style" },
      { status: 500 }
    );
  }
}
