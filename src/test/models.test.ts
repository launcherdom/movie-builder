import { describe, it, expect } from "vitest";
import { getImageModel, getVideoModel } from "@/lib/fal/models";
import { buildCharacterSheetPrompt } from "@/lib/fal/prompts";
import type { Character } from "@/types/movie";

describe("getImageModel", () => {
  it("returns nano-banana-pro for draft", () => {
    expect(getImageModel("draft").endpoint).toBe("fal-ai/nano-banana-pro");
  });
  it("returns flux-2 for standard", () => {
    expect(getImageModel("standard").endpoint).toBe("fal-ai/flux-2");
  });
  it("returns flux-2-pro for premium", () => {
    expect(getImageModel("premium").endpoint).toBe("fal-ai/flux-2-pro");
  });
});

describe("getVideoModel", () => {
  it("returns ltx for draft", () => {
    expect(getVideoModel("draft").endpoint).toContain("ltx");
  });
  it("returns kling for standard", () => {
    expect(getVideoModel("standard").endpoint).toContain("kling");
  });
});

describe("buildCharacterSheetPrompt", () => {
  const char: Character = {
    id: "c1",
    name: "Kim Jisu",
    description: "28yo Korean woman, black bob, red leather jacket",
    personality: "Determined detective",
  };

  it("inserts character description into template", () => {
    const prompt = buildCharacterSheetPrompt(char);
    expect(prompt).toContain("28yo Korean woman, black bob, red leather jacket");
    expect(prompt).not.toContain("{CHARACTER_DESCRIPTION}");
  });
});
