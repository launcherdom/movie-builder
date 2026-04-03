import { describe, it, expect } from "vitest";
import { parseStoryResponse, buildStorySystemPrompt } from "@/lib/claude/story-prompts";

describe("buildStorySystemPrompt", () => {
  it("includes genre, tone, duration in prompt", () => {
    const prompt = buildStorySystemPrompt("drama", "serious", 60, "9:16", "realistic");
    expect(prompt).toContain("drama");
    expect(prompt).toContain("serious");
    expect(prompt).toContain("60");
  });
});

describe("parseStoryResponse", () => {
  it("returns story from tool_use block", () => {
    const mockResponse = {
      content: [
        {
          type: "tool_use",
          name: "create_screenplay",
          input: {
            title: "Test Film",
            logline: "A story about hope.",
            synopsis: "Short synopsis.",
            characters: [
              { id: "c1", name: "Hero", description: "Tall, dark hair", personality: "Brave", age: "30", gender: "M" }
            ],
            scenes: [],
            totalDuration: 60,
          },
        },
      ],
    };
    const story = parseStoryResponse(mockResponse as Parameters<typeof parseStoryResponse>[0]);
    expect(story.title).toBe("Test Film");
    expect(story.characters).toHaveLength(1);
    expect(story.characters[0].age).toBe("30");
  });

  it("throws when no tool_use block", () => {
    expect(() => parseStoryResponse({ content: [{ type: "text", text: "hi" }] } as Parameters<typeof parseStoryResponse>[0]))
      .toThrow("No tool_use block");
  });
});
