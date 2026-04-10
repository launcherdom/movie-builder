"use client";

import { create, createStore } from "zustand";
import { nanoid } from "nanoid";
import type {
  Project,
  ProjectState,
  PipelineStep,
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
  StoryQualityScores,
  SeriesConfig,
} from "@/types/movie";

interface ProjectActions {
  setCurrentStep: (step: PipelineStep) => void;
  initProject: (partial: Omit<Project, "id" | "story" | "currentStep" | "createdAt" | "updatedAt">) => void;
  loadProject: (id: string) => Promise<void>;
  saveProject: () => Promise<void>;
  setStory: (story: Story) => void;
  addCharacter: () => void;
  removeCharacter: (id: string) => void;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  updateCharacterSheet: (id: string, sheet: GeneratedImage) => void;
  setCharacterPreview: (id: string, image: GeneratedImage | null, status: GenerationStatus) => void;
  setCharacterFaceImage: (id: string, image: GeneratedImage) => void;
  updateScene: (sceneId: string, patch: Partial<import("@/types/movie").Scene>) => void;
  updateShotField: (shotId: string, patch: Partial<Shot>) => void;
  setShotImageStatus: (shotId: string, status: GenerationStatus) => void;
  setShotPanel: (shotId: string, panel: GeneratedImage, prompt: string) => void;
  setShotKeyframeStatus: (shotId: string, status: GenerationStatus) => void;
  setShotKeyframe: (shotId: string, image: GeneratedImage, prompt: string) => void;
  setShotVideoStatus: (shotId: string, status: GenerationStatus) => void;
  setShotVideo: (shotId: string, video: GeneratedVideo) => void;
  setShotVideoPromptJson: (shotId: string, json: VideoPromptJson) => void;
  setScenePanel: (sceneId: string, panel: GeneratedImage) => void;
  setScenePanelStatus: (sceneId: string, status: GenerationStatus) => void;
  setSceneVideoStatus: (sceneId: string, status: GenerationStatus) => void;
  setSceneVideo: (sceneId: string, video: GeneratedVideo) => void;
  setStyleReference: (image: GeneratedImage, analysis: string) => void;
  addScene: (afterIndex: number) => void;
  removeScene: (sceneId: string) => void;
  reorderScene: (sceneId: string, newIndex: number) => void;
  addShot: (sceneId: string, afterIndex: number) => void;
  removeShot: (shotId: string) => void;
  reorderShot: (shotId: string, newIndex: number) => void;
  duplicateShot: (shotId: string) => void;
  saveVersion: (label?: string) => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
  setActiveScene: (id: string | null) => void;
  setActiveShot: (id: string | null) => void;
  setGenerating: (generating: boolean, progress?: { current: number; total: number }) => void;
  setStoryQuality: (scores: StoryQualityScores) => void;
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
  story: null,
  currentStep: "prompt",
  series: undefined,
  createdAt: "",
  updatedAt: "",
  activeSceneId: null,
  activeShotId: null,
  isGenerating: false,
  generationProgress: null,
  storyQuality: null,
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
          story: state.story,
          currentStep: state.currentStep,
        }),
      });
    },

    setStory: (story) => set({ story, currentStep: "story" }),

    addCharacter: () =>
      set((state) => {
        if (!state.story) return {};
        const newChar: Character = {
          id: nanoid(),
          name: "New Character",
          description: "",
          personality: "",
        };
        return { story: { ...state.story, characters: [...state.story.characters, newChar] } };
      }),

    removeCharacter: (id) =>
      set((state) => {
        if (!state.story) return {};
        return { story: { ...state.story, characters: state.story.characters.filter((c) => c.id !== id) } };
      }),

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

    setCharacterPreview: (id, image, status) =>
      set((state) => {
        if (!state.story) return {};
        return {
          story: {
            ...state.story,
            characters: state.story.characters.map((c) =>
              c.id === id ? { ...c, previewImage: image ?? undefined, previewStatus: status } : c
            ),
          },
        };
      }),

    setCharacterFaceImage: (id, image) =>
      set((state) => {
        if (!state.story) return {};
        return {
          story: {
            ...state.story,
            characters: state.story.characters.map((c) =>
              c.id === id ? { ...c, faceImage: image } : c
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

    setScenePanel: (sceneId, panel) =>
      set((state) => {
        if (!state.story) return {};
        return {
          story: {
            ...state.story,
            scenes: state.story.scenes.map((sc) =>
              sc.id === sceneId ? { ...sc, scenePanel: panel, scenePanelStatus: "done" } : sc
            ),
          },
        };
      }),

    setScenePanelStatus: (sceneId, status) =>
      set((state) => {
        if (!state.story) return {};
        return {
          story: {
            ...state.story,
            scenes: state.story.scenes.map((sc) =>
              sc.id === sceneId ? { ...sc, scenePanelStatus: status } : sc
            ),
          },
        };
      }),

    setSceneVideoStatus: (sceneId, status) =>
      set((state) => {
        if (!state.story) return {};
        return {
          story: {
            ...state.story,
            scenes: state.story.scenes.map((sc) =>
              sc.id === sceneId ? { ...sc, sceneVideoStatus: status } : sc
            ),
          },
        };
      }),

    setSceneVideo: (sceneId, video) =>
      set((state) => {
        if (!state.story) return {};
        return {
          story: {
            ...state.story,
            scenes: state.story.scenes.map((sc) =>
              sc.id === sceneId ? { ...sc, sceneVideoClip: video, sceneVideoStatus: "done" } : sc
            ),
          },
        };
      }),

    setStyleReference: (image, analysis) => set({ styleReferenceImage: image, styleAnalysis: analysis }),

    addScene: (afterIndex) =>
      set((state) => {
        if (!state.story) return {};
        const newScene: import("@/types/movie").Scene = {
          id: nanoid(),
          orderIndex: afterIndex + 1,
          heading: "NEW SCENE",
          location: "Location",
          timeOfDay: "DAY",
          description: "Scene description",
          characterIds: [],
          shots: [
            {
              id: nanoid(),
              sceneId: "",
              orderIndex: 0,
              shotType: "MS",
              description: "Shot description",
              duration: 4,
              imageStatus: "idle",
              keyframeStatus: "idle",
              videoStatus: "idle",
            },
          ],
          transitionTo: "cut",
        };
        newScene.shots[0].sceneId = newScene.id;
        const scenes = [...state.story.scenes];
        scenes.splice(afterIndex + 1, 0, newScene);
        return { story: { ...state.story, scenes: scenes.map((sc, i) => ({ ...sc, orderIndex: i })) } };
      }),

    removeScene: (sceneId) =>
      set((state) => {
        if (!state.story || state.story.scenes.length <= 1) return {};
        return {
          story: {
            ...state.story,
            scenes: state.story.scenes
              .filter((sc) => sc.id !== sceneId)
              .map((sc, i) => ({ ...sc, orderIndex: i })),
          },
        };
      }),

    reorderScene: (sceneId, newIndex) =>
      set((state) => {
        if (!state.story) return {};
        const scenes = [...state.story.scenes];
        const oldIndex = scenes.findIndex((sc) => sc.id === sceneId);
        if (oldIndex === -1) return {};
        const [removed] = scenes.splice(oldIndex, 1);
        scenes.splice(Math.max(0, Math.min(newIndex, scenes.length)), 0, removed);
        return { story: { ...state.story, scenes: scenes.map((sc, i) => ({ ...sc, orderIndex: i })) } };
      }),

    addShot: (sceneId, afterIndex) =>
      set((state) => {
        if (!state.story) return {};
        const newShot: import("@/types/movie").Shot = {
          id: nanoid(),
          sceneId,
          orderIndex: afterIndex + 1,
          shotType: "MS",
          description: "Shot description",
          duration: 4,
          imageStatus: "idle",
          keyframeStatus: "idle",
          videoStatus: "idle",
        };
        return {
          story: {
            ...state.story,
            scenes: state.story.scenes.map((sc) => {
              if (sc.id !== sceneId) return sc;
              const shots = [...sc.shots];
              shots.splice(afterIndex + 1, 0, newShot);
              return { ...sc, shots: shots.map((sh, i) => ({ ...sh, orderIndex: i })) };
            }),
          },
        };
      }),

    removeShot: (shotId) =>
      set((state) => {
        if (!state.story) return {};
        return {
          story: {
            ...state.story,
            scenes: state.story.scenes.map((sc) => {
              if (!sc.shots.some((sh) => sh.id === shotId)) return sc;
              if (sc.shots.length <= 1) return sc; // keep at least 1 shot per scene
              return {
                ...sc,
                shots: sc.shots
                  .filter((sh) => sh.id !== shotId)
                  .map((sh, i) => ({ ...sh, orderIndex: i })),
              };
            }),
          },
        };
      }),

    reorderShot: (shotId, newIndex) =>
      set((state) => {
        if (!state.story) return {};
        return {
          story: {
            ...state.story,
            scenes: state.story.scenes.map((sc) => {
              const oldIndex = sc.shots.findIndex((sh) => sh.id === shotId);
              if (oldIndex === -1) return sc;
              const shots = [...sc.shots];
              const [removed] = shots.splice(oldIndex, 1);
              shots.splice(Math.max(0, Math.min(newIndex, shots.length)), 0, removed);
              return { ...sc, shots: shots.map((sh, i) => ({ ...sh, orderIndex: i })) };
            }),
          },
        };
      }),

    duplicateShot: (shotId) =>
      set((state) => {
        if (!state.story) return {};
        return {
          story: {
            ...state.story,
            scenes: state.story.scenes.map((sc) => {
              const idx = sc.shots.findIndex((sh) => sh.id === shotId);
              if (idx === -1) return sc;
              const original = sc.shots[idx];
              const duplicate: import("@/types/movie").Shot = {
                ...original,
                id: nanoid(),
                imageStatus: "idle",
                keyframeStatus: "idle",
                videoStatus: "idle",
                storyboardPanel: undefined,
                keyframeImage: undefined,
                videoClip: undefined,
              };
              const shots = [...sc.shots];
              shots.splice(idx + 1, 0, duplicate);
              return { ...sc, shots: shots.map((sh, i) => ({ ...sh, orderIndex: i })) };
            }),
          },
        };
      }),

    saveVersion: async (label?: string) => {
      const state = get();
      if (!state.id || !state.story) return;
      await fetch(`/api/projects/${state.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot: state.story, label }),
      });
    },

    restoreVersion: async (versionId: string) => {
      const state = get();
      if (!state.id) return;
      const res = await fetch(`/api/projects/${state.id}/versions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      if (!res.ok) return;
      const { story } = await res.json() as { story: Story };
      set({ story });
    },

    setActiveScene: (id) => set({ activeSceneId: id }),
    setActiveShot: (id) => set({ activeShotId: id }),

    setGenerating: (generating, progress) => set({
      isGenerating: generating,
      generationProgress: progress ?? null,
    }),

    setStoryQuality: (scores) => set({ storyQuality: scores }),

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
