import { NextRequest } from "next/server";
import type { Story } from "@/types/movie";
import { buildSrtFromStory } from "@/lib/subtitles/srt-builder";

export async function POST(request: NextRequest) {
  try {
    const { story } = await request.json() as { story: Story };
    if (!story) {
      return Response.json({ error: "story is required" }, { status: 400 });
    }
    const srt = buildSrtFromStory(story);
    return Response.json({ srt });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate SRT" },
      { status: 500 }
    );
  }
}
