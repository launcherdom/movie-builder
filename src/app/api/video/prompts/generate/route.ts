import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import {
  VIDEO_PROMPT_TOOL,
  buildVideoPromptSystemPrompt,
  parseVideoPromptsResponse,
} from "@/lib/claude/story-prompts";
import type { Story, VisualStyle, AspectRatio } from "@/types/movie";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { story, visualStyle, aspectRatio } = await request.json() as {
      story: Story;
      visualStyle: VisualStyle;
      aspectRatio: AspectRatio;
    };

    if (!story) {
      return Response.json({ error: "story is required" }, { status: 400 });
    }

    const systemPrompt = buildVideoPromptSystemPrompt(story, visualStyle, aspectRatio);

    // Build user message with full shot list
    const shotList = story.scenes.flatMap((scene, si) =>
      scene.shots.map((shot, shi) => {
        const sceneChars = story.characters.filter((c) => scene.characterIds.includes(c.id));
        return [
          `Scene ${si + 1}: ${scene.heading} (${scene.location}, ${scene.timeOfDay})`,
          `Shot ${shi + 1} [${shot.shotType}] ${shot.duration}s — shotId: ${shot.id}`,
          `Description: ${shot.description}`,
          shot.cameraDirection ? `Camera: ${shot.cameraDirection}` : null,
          shot.dialogue ? `Dialogue: "${shot.dialogue}" (speaker: ${story.characters.find((c) => c.id === shot.speakerId)?.name ?? "unknown"})` : null,
          sceneChars.length > 0 ? `Characters in scene: ${sceneChars.map((c) => c.name).join(", ")}` : null,
        ].filter(Boolean).join("\n");
      })
    ).join("\n\n");

    const userMessage = `Generate rich cinematic video prompts for all ${story.scenes.flatMap((s) => s.shots).length} shots below.

${shotList}

Use the create_video_prompts tool. Return ALL shots — one prompt per shotId.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      tools: [VIDEO_PROMPT_TOOL],
      tool_choice: { type: "tool", name: "create_video_prompts" },
      messages: [{ role: "user", content: userMessage }],
    });

    const prompts = parseVideoPromptsResponse(response);

    if (prompts.length === 0) {
      return Response.json({ error: "Claude returned no prompts" }, { status: 500 });
    }

    console.log(`[video/prompts/generate] Generated ${prompts.length} prompts for "${story.title}"`);
    return Response.json({ prompts });
  } catch (error) {
    console.error("Video prompt generation error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate prompts" },
      { status: 500 }
    );
  }
}
