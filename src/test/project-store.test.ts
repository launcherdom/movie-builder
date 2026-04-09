import { describe, it, expect, beforeEach } from "vitest";
import { createProjectStore } from "@/stores/project-store";
import type { Story } from "@/types/movie";

describe("project store", () => {
  let store: ReturnType<typeof createProjectStore>;

  beforeEach(() => {
    store = createProjectStore();
  });

  it("initializes with defaults", () => {
    const s = store.getState();
    expect(s.currentStep).toBe("prompt");
    expect(s.story).toBeNull();
  });

  it("setCurrentStep updates step", () => {
    store.getState().setCurrentStep("story");
    expect(store.getState().currentStep).toBe("story");
  });

  it("setStory persists story and advances to characters", () => {
    const story: Story = {
      title: "Test",
      logline: "A logline",
      synopsis: "Synopsis",
      characters: [],
      scenes: [],
      totalDuration: 60,
    };
    store.getState().setStory(story);
    expect(store.getState().story?.title).toBe("Test");
    expect(store.getState().currentStep).toBe("characters");
  });

  it("updateCharacterSheet sets characterSheet on character", () => {
    const story: Story = {
      title: "T",
      logline: "L",
      synopsis: "S",
      characters: [{ id: "c1", name: "Hero", description: "tall", personality: "brave" }],
      scenes: [],
      totalDuration: 30,
    };
    store.getState().setStory(story);
    store.getState().updateCharacterSheet("c1", { url: "http://x.com/img.png", width: 1280, height: 720 });
    const char = store.getState().story!.characters.find((c) => c.id === "c1");
    expect(char?.characterSheet?.url).toBe("http://x.com/img.png");
  });

  it("reset returns to initial state", () => {
    store.getState().setCurrentStep("video");
    store.getState().reset();
    expect(store.getState().currentStep).toBe("prompt");
  });
});
