"use client";

import { create, createStore } from "zustand";
import { nanoid } from "nanoid";
import type {
  Project,
  ProjectState,
  PipelineStep,
  QualityTier,
  Story,
  Character,
  Shot,
  GeneratedImage,
  GeneratedVideo,
  VideoPromptJson,
  GenerationStatus,
} from "@/types/movie";

interface ProjectActions {
  setCurrentStep: (step: PipelineStep) => void;
  initProject: (partial: Omit<Project, "id" | "story" | "currentStep" | "createdAt" | "updatedAt">) => void;
  setStory: (story: Story) => void;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  updateCharacterSheet: (id: string, sheet: GeneratedImage) => void;
  setShotImageStatus: (shotId: string, status: GenerationStatus) => void;
  setShotPanel: (shotId: string, panel: GeneratedImage, prompt: string) => void;
  setShotKeyframeStatus: (shotId: string, status: GenerationStatus) => void;
  setShotKeyframe: (shotId: string, image: GeneratedImage, prompt: string) => void;
  setShotVideoStatus: (shotId: string, status: GenerationStatus) => void;
  setShotVideo: (shotId: string, video: GeneratedVideo) => void;
  setShotVideoPromptJson: (shotId: string, json: VideoPromptJson) => void;
  setQualityTier: (tier: QualityTier) => void;
  setActiveScene: (id: string | null) => void;
  setActiveShot: (id: string | null) => void;
  setGenerating: (generating: boolean, progress?: { current: number; total: number }) => void;
  reset: () => void;
}

export type ProjectStore = ProjectState & ProjectActions;

const initialState: ProjectState = {
  id: "",
  concept: "",
  genre: "drama",
  tone: "serious",
  targetDuration: 60,
  aspectRatio: "9:16",
  visualStyle: "realistic",
  qualityTier: "draft",
  story: null,
  currentStep: "prompt",
  createdAt: "",
  updatedAt: "",
  activeSceneId: null,
  activeShotId: null,
  isGenerating: false,
  generationProgress: null,
};

function updateShot(state: ProjectState, shotId: string, patch: Partial<Shot>): Partial<ProjectStore> {
  if (!state.story) return {};
  return {
    story: {
      ...state.story,
      scenes: state.story.scenes.map((sc) => ({
        ...sc,
        shots: sc.shots.map((sh) => sh.id === shotId ? { ...sh, ...patch } : sh),
      })),
    },
  };
}

function buildActions(set: (partial: Partial<ProjectStore> | ((state: ProjectStore) => Partial<ProjectStore>)) => void): ProjectActions {
  return {
    setCurrentStep: (step) => set({ currentStep: step }),

    initProject: (partial) => set({
      ...partial,
      id: nanoid(),
      story: null,
      currentStep: "prompt",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),

    setStory: (story) => set({ story, currentStep: "story" }),

    updateCharacter: (id, patch) =>
      set((state) => {
        if (!state.story) return {};
        return {
          story: {
            ...state.story,
            characters: state.story.characters.map((c) => c.id === id ? { ...c, ...patch } : c),
          },
        };
      }),

    updateCharacterSheet: (id, sheet) =>
      set((state) => {
        if (!state.story) return {};
        return {
          story: {
            ...state.story,
            characters: state.story.characters.map((c) =>
              c.id === id ? { ...c, characterSheet: sheet } : c
            ),
          },
        };
      }),

    setShotImageStatus: (shotId, status) =>
      set((state) => updateShot(state, shotId, { imageStatus: status })),

    setShotPanel: (shotId, panel, prompt) =>
      set((state) => updateShot(state, shotId, {
        storyboardPanel: panel,
        imageStatus: "done",
        imagePrompt: prompt,
      })),

    setShotKeyframeStatus: (shotId, status) =>
      set((state) => updateShot(state, shotId, { keyframeStatus: status })),

    setShotKeyframe: (shotId, image, prompt) =>
      set((state) => updateShot(state, shotId, {
        keyframeImage: image,
        keyframeStatus: "done",
        keyframePrompt: prompt,
      })),

    setShotVideoStatus: (shotId, status) =>
      set((state) => updateShot(state, shotId, { videoStatus: status })),

    setShotVideo: (shotId, video) =>
      set((state) => updateShot(state, shotId, { videoClip: video, videoStatus: "done" })),

    setShotVideoPromptJson: (shotId, json) =>
      set((state) => updateShot(state, shotId, { videoPromptJson: json })),

    setQualityTier: (tier) => set({ qualityTier: tier }),
    setActiveScene: (id) => set({ activeSceneId: id }),
    setActiveShot: (id) => set({ activeShotId: id }),

    setGenerating: (generating, progress) => set({
      isGenerating: generating,
      generationProgress: progress ?? null,
    }),

    reset: () => set(initialState),
  };
}

export function createProjectStore() {
  return createStore<ProjectStore>()((set) => ({
    ...initialState,
    ...buildActions(set),
  }));
}

export const useProjectStore = create<ProjectStore>()((set) => ({
  ...initialState,
  ...buildActions(set),
}));
