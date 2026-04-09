import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import {
  SCREENPLAY_TOOL,
  EVALUATE_SCREENPLAY_TOOL,
  buildStorySystemPrompt,
  buildEvaluationPrompt,
  parseStoryResponse,
  parseEvaluationResponse,
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

        // Phase C: Evaluate screenplay quality
        controller.enqueue(send({ status: "evaluating", message: "Evaluating screenplay quality..." }));

        let evaluatedStory = story;
        let attempt = 0;
        while (attempt < 2) {
          const evalPrompt = buildEvaluationPrompt(evaluatedStory, genre);
          const evalResponse = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 1024,
            tools: [EVALUATE_SCREENPLAY_TOOL],
            tool_choice: { type: "tool", name: "evaluate_screenplay" },
            messages: [{ role: "user", content: evalPrompt }],
          });

          const scores = parseEvaluationResponse(evalResponse as Parameters<typeof parseEvaluationResponse>[0]);

          if (!scores) break;

          controller.enqueue(send({ status: "quality", scores }));

          // Auto-regenerate once if quality below threshold (first attempt only)
          if (attempt === 0 && scores.overallScore < 7 && scores.suggestions.length > 0) {
            controller.enqueue(send({ status: "thinking", message: "Improving screenplay..." }));
            const improveMessages = [
              { role: "user" as const, content: `Write a short film screenplay based on this concept: "${concept}"` },
              { role: "assistant" as const, content: finalMessage.content },
              {
                role: "user" as const,
                content: `The screenplay scored ${scores.overallScore}/10. Please improve it based on these suggestions:\n${scores.suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
              },
            ];

            const improvedStream = client.messages.stream({
              model: "claude-sonnet-4-6",
              max_tokens: 8192,
              system: systemPrompt,
              tools: [SCREENPLAY_TOOL],
              tool_choice: { type: "tool", name: "create_screenplay" },
              messages: improveMessages,
            });

            const improvedFinal = await improvedStream.finalMessage();
            evaluatedStory = parseStoryResponse(improvedFinal as Parameters<typeof parseStoryResponse>[0]);
            attempt++;
            continue;
          }
          break;
        }

        controller.enqueue(send({ status: "done", story: evaluatedStory }));
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
