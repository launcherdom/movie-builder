import { describe, it, expect } from "vitest";
import { getImageModel, getVideoModel } from "@/lib/fal/models";
import { buildCharacterSheetPrompt } from "@/lib/fal/prompts";
import type { Character } from "@/types/movie";

describe("getImageModel", () => {
  it("returns nano-banana-2 endpoint", () => {
    expect(getImageModel().endpoint).toBe("fal-ai/nano-banana-2");
  });
});

describe("getVideoModel", () => {
  it("returns seedance endpoint", () => {
    expect(getVideoModel().endpoint).toContain("seedance");
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
