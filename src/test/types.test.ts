import { describe, it, expect } from "vitest";
import { isValidProject, isValidShot } from "@/types/movie";

describe("isValidProject", () => {
  it("returns true for a minimal valid project", () => {
    expect(isValidProject({
      id: "abc",
      concept: "two friends meet",
      genre: "drama",
      tone: "serious",
      targetDuration: 60,
      aspectRatio: "9:16",
      visualStyle: "realistic",
      qualityTier: "draft",
      story: null,
      currentStep: "prompt",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    })).toBe(true);
  });

  it("returns false when required field missing", () => {
    expect(isValidProject({ id: "abc" })).toBe(false);
  });
});

describe("isValidShot", () => {
  it("returns true for a valid shot", () => {
    expect(isValidShot({
      id: "s1",
      sceneId: "sc1",
      orderIndex: 0,
      shotType: "MS",
      description: "Character enters",
      duration: 5,
      imageStatus: "idle",
      videoStatus: "idle",
    })).toBe(true);
  });
});
