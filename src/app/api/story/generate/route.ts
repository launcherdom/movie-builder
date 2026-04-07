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

  const encoder = new TextEncoder();
  const send = (obj: object) => encoder.encode(`data: ${JSON.stringify(obj)}\n\n`);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(send({ status: "thinking", message: "Analyzing concept..." }));

        // Use streaming to get live progress
        const msgStream = client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 8192,
          system: systemPrompt,
          tools: [SCREENPLAY_TOOL],
          tool_choice: { type: "tool", name: "create_screenplay" },
          messages: [{ role: "user", content: `Write a short film screenplay based on this concept: "${concept}"` }],
        });

        let inputTokens = 0;
        let outputTokens = 0;

        msgStream.on("message", (msg) => {
          inputTokens = msg.usage.input_tokens;
          outputTokens = msg.usage.output_tokens;
        });

        // Emit progress events at milestones
        const phases = [
          { threshold: 0.1, message: "Building characters..." },
          { threshold: 0.3, message: "Writing scenes..." },
          { threshold: 0.6, message: "Composing shots..." },
          { threshold: 0.9, message: "Finalizing screenplay..." },
        ];
        let phaseIdx = 0;

        msgStream.on("text", (_, snapshot) => {
          const progress = snapshot.length / 8000; // rough estimate
          while (phaseIdx < phases.length && progress >= phases[phaseIdx].threshold) {
            controller.enqueue(send({ status: "thinking", message: phases[phaseIdx].message }));
            phaseIdx++;
          }
        });

        const finalMessage = await msgStream.finalMessage();

        controller.enqueue(send({
          status: "thinking",
          message: `Tokens used: ${inputTokens} in / ${outputTokens} out`,
        }));

        const story = parseStoryResponse(finalMessage as Parameters<typeof parseStoryResponse>[0]);
        controller.enqueue(send({ status: "done", story }));
      } catch (error) {
        controller.enqueue(send({
          status: "error",
          error: error instanceof Error ? error.message : "Failed to generate story",
        }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
