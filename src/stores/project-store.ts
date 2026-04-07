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
  Genre,
  Tone,
  AspectRatio,
  VisualStyle,
} from "@/types/movie";

interface ProjectActions {
  setCurrentStep: (step: PipelineStep) => void;
  initProject: (partial: Omit<Project, "id" | "story" | "currentStep" | "createdAt" | "updatedAt">) => void;
  loadProject: (id: string) => Promise<void>;
  saveProject: () => Promise<void>;
  setStory: (story: Story) => void;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  updateCharacterSheet: (id: string, sheet: GeneratedImage) => void;
  updateScene: (sceneId: string, patch: Partial<import("@/types/movie").Scene>) => void;
  updateShotField: (shotId: string, patch: Partial<Shot>) => void;
  setShotImageStatus: (shotId: string, status: GenerationStatus) => void;
  setShotPanel: (shotId: string, panel: GeneratedImage, prompt: string) => void;
  setShotKeyframeStatus: (shotId: string, status: GenerationStatus) => void;
  setShotKeyframe: (shotId: string, image: GeneratedImage, prompt: string) => void;
  setShotVideoStatus: (shotId: string, status: GenerationStatus) => void;
  setShotVideo: (shotId: string, video: GeneratedVideo) => void;
  setShotVideoPromptJson: (shotId: string, json: VideoPromptJson) => void;
  setStyleReference: (image: GeneratedImage, analysis: string) => void;
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

function buildActions(set: (partial: Partial<ProjectStore> | ((state: ProjectStore) => Partial<ProjectStore>)) => void, get: () => ProjectStore): ProjectActions {
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

    loadProject: async (id: string) => {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) return;
      const { project } = await res.json() as {
        project: {
          id: string;
          concept: string;
          genre: Genre;
          tone: Tone;
          targetDuration: number;
          aspectRatio: AspectRatio;
          visualStyle: VisualStyle;
          qualityTier: QualityTier;
          storyJson: Story | null;
          currentStep: PipelineStep;
          createdAt: string;
          updatedAt: string;
        }
      };
      set({
        id: project.id,
        concept: project.concept,
        genre: project.genre,
        tone: project.tone,
        targetDuration: project.targetDuration,
        aspectRatio: project.aspectRatio,
        visualStyle: project.visualStyle,
        qualityTier: project.qualityTier,
        story: project.storyJson ?? null,
        currentStep: project.currentStep,
        createdAt: typeof project.createdAt === "string"
          ? project.createdAt
          : new Date(project.createdAt).toISOString(),
        updatedAt: typeof project.updatedAt === "string"
          ? project.updatedAt
          : new Date(project.updatedAt).toISOString(),
      });
    },

    saveProject: async () => {
      const state = get();
      if (!state.id) return;
      await fetch(`/api/projects/${state.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: state.concept,
          genre: state.genre,
          tone: state.tone,
          targetDuration: state.targetDuration,
          aspectRatio: state.aspectRatio,
          visualStyle: state.visualStyle,
          qualityTier: state.qualityTier,
          story: state.story,
          currentStep: state.currentStep,
        }),
      });
    },

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

    updateScene: (sceneId, patch) =>
      set((state) => {
        if (!state.story) return {};
        return {
          story: {
            ...state.story,
            scenes: state.story.scenes.map((sc) => sc.id === sceneId ? { ...sc, ...patch } : sc),
          },
        };
      }),

    updateShotField: (shotId, patch) =>
      set((state) => updateShot(state, shotId, patch)),

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

    setStyleReference: (image, analysis) => set({ styleReferenceImage: image, styleAnalysis: analysis }),

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
  return createStore<ProjectStore>()((set, get) => ({
    ...initialState,
    ...buildActions(set, get),
  }));
}

export const useProjectStore = create<ProjectStore>()((set, get) => ({
  ...initialState,
  ...buildActions(set, get),
}));
