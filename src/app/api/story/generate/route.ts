import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import {
  SCREENPLAY_TOOL,
  buildStorySystemPrompt,
  parseStoryResponse,
} from "@/lib/claude/story-prompts";
import type { Genre, Tone, AspectRatio, VisualStyle } from "@/types/movie";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { concept, genre, tone, targetDuration, aspectRatio, visualStyle } =
      await request.json() as {
        concept: string;
        genre: Genre;
        tone: Tone;
        targetDuration: number;
        aspectRatio: AspectRatio;
        visualStyle: VisualStyle;
      };

    if (!concept) {
      return Response.json({ error: "concept is required" }, { status: 400 });
    }

    const systemPrompt = buildStorySystemPrompt(genre, tone, targetDuration, aspectRatio, visualStyle);

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      tools: [SCREENPLAY_TOOL],
      tool_choice: { type: "any" },
      messages: [
        {
          role: "user",
          content: `Write a short film screenplay based on this concept: "${concept}"`,
        },
      ],
    });

    const story = parseStoryResponse(response as Parameters<typeof parseStoryResponse>[0]);
    return Response.json({ story });
  } catch (error) {
    console.error("Story generation error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate story" },
      { status: 500 }
    );
  }
}
