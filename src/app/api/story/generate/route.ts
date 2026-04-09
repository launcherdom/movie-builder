import Anthropic, { APIError } from "@anthropic-ai/sdk";
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

const PHASES = [
  { threshold: 0.1, message: "Building characters..." },
  { threshold: 0.3, message: "Writing scenes..." },
  { threshold: 0.6, message: "Composing shots..." },
  { threshold: 0.9, message: "Finalizing screenplay..." },
];

async function streamScreenplay(
  params: Anthropic.MessageStreamParams,
  onProgress: (msg: string) => void,
  maxAttempts = 4
): Promise<{ finalMessage: Anthropic.Message; inputTokens: number; outputTokens: number }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const msgStream = client.messages.stream(params);

      let inputTokens = 0;
      let outputTokens = 0;
      let phaseIdx = 0;

      msgStream.on("message", (msg) => {
        inputTokens = msg.usage.input_tokens;
        outputTokens = msg.usage.output_tokens;
      });

      msgStream.on("text", (_, snapshot) => {
        const progress = snapshot.length / 8000;
        while (phaseIdx < PHASES.length && progress >= PHASES[phaseIdx].threshold) {
          onProgress(PHASES[phaseIdx].message);
          phaseIdx++;
        }
      });

      const finalMessage = await msgStream.finalMessage();
      return { finalMessage, inputTokens, outputTokens };
    } catch (err) {
      const isOverloaded = err instanceof APIError && (err as APIError).status === 529;
      if (isOverloaded && attempt < maxAttempts) {
        const delaySec = Math.min(2 * 2 ** (attempt - 1), 16);
        onProgress(`API busy, retrying in ${delaySec}s... (${attempt}/${maxAttempts - 1})`);
        await new Promise((r) => setTimeout(r, delaySec * 1000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("unreachable");
}

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

        const { finalMessage, inputTokens, outputTokens } = await streamScreenplay(
          {
            model: "claude-sonnet-4-6",
            max_tokens: 8192,
            system: systemPrompt,
            tools: [SCREENPLAY_TOOL],
            tool_choice: { type: "tool", name: "create_screenplay" },
            messages: [{ role: "user", content: `Write a short film screenplay based on this concept: "${concept}"` }],
          },
          (msg) => controller.enqueue(send({ status: "thinking", message: msg }))
        );

        controller.enqueue(send({
          status: "thinking",
          message: `Tokens used: ${inputTokens} in / ${outputTokens} out`,
        }));

        const story = parseStoryResponse(finalMessage as Parameters<typeof parseStoryResponse>[0]);

        // Evaluate screenplay quality
        controller.enqueue(send({ status: "evaluating", message: "Evaluating screenplay quality..." }));

        let evaluatedStory = story;
        let attempt = 0;
        while (attempt < 2) {
          const evalPrompt = buildEvaluationPrompt(evaluatedStory, genre);
          let evalResponse: Anthropic.Message;
          try {
            evalResponse = await client.messages.create({
              model: "claude-sonnet-4-6",
              max_tokens: 1024,
              tools: [EVALUATE_SCREENPLAY_TOOL],
              tool_choice: { type: "tool", name: "evaluate_screenplay" },
              messages: [{ role: "user", content: evalPrompt }],
            });
          } catch (evalErr) {
            // Evaluation failure is non-critical — skip it
            console.warn("Evaluation failed, skipping:", evalErr);
            break;
          }

          const scores = parseEvaluationResponse(evalResponse as Parameters<typeof parseEvaluationResponse>[0]);

          if (!scores) break;

          controller.enqueue(send({ status: "quality", scores }));

          // Auto-regenerate once if quality below threshold (first attempt only)
          if (attempt === 0 && scores.overallScore < 7 && scores.suggestions.length > 0) {
            controller.enqueue(send({ status: "thinking", message: "Improving screenplay..." }));
            const improveSystem = systemPrompt +
              `\n\nImprove upon a previous draft. Key issues to fix:\n` +
              scores.suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n");

            const { finalMessage: improvedFinal } = await streamScreenplay(
              {
                model: "claude-sonnet-4-6",
                max_tokens: 8192,
                system: improveSystem,
                tools: [SCREENPLAY_TOOL],
                tool_choice: { type: "tool", name: "create_screenplay" },
                messages: [{ role: "user", content: `Write an improved screenplay based on this concept: "${concept}"` }],
              },
              (msg) => controller.enqueue(send({ status: "thinking", message: msg }))
            );
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
