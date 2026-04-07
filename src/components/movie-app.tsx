"use client";
import { useProjectStore } from "@/stores/project-store";
import { useLangStore } from "@/stores/lang-store";
import type { PipelineStep } from "@/types/movie";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PromptStep } from "@/components/steps/prompt-step";
import { StoryStep } from "@/components/steps/story-step";
import { CharactersStep } from "@/components/steps/characters-step";
import { StoryboardStep } from "@/components/steps/storyboard-step";
import { VideoStep } from "@/components/steps/video-step";
import { useSyncProject } from "@/hooks/use-sync-project";
import { VersionDrawer } from "@/components/ui/version-drawer";

const STEP_KEYS: PipelineStep[] = ["prompt", "story", "characters", "storyboard", "video"];
const STEP_NUMS: Record<PipelineStep, string> = {
  prompt: "01", story: "02", characters: "03", storyboard: "04", video: "05",
};

function canGoToStep(current: PipelineStep, target: PipelineStep, hasStory: boolean): boolean {
  const order: PipelineStep[] = ["prompt", "story", "characters", "storyboard", "video"];
  const cur = order.indexOf(current);
  const tgt = order.indexOf(target);
  if (tgt <= cur) return true;
  if (target === "characters" && !hasStory) return false;
  if (target === "storyboard" && !hasStory) return false;
  if (target === "video" && !hasStory) return false;
  return tgt <= cur + 1;
}

export function MovieApp() {
  const { currentStep, story, setCurrentStep } = useProjectStore();
  const { locale, t, setLocale } = useLangStore();
  useSyncProject();

  const hasStory = !!story;

  return (
    <div style={{ minHeight: "100vh", background: "var(--black)" }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: 56,
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          background: "var(--black)",
          zIndex: 50,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-space-mono), monospace",
            fontSize: 13,
            letterSpacing: "0.06em",
            color: "var(--text-display)",
          }}
        >
          🎬 {t.appTitle}
        </span>

        <nav style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {STEP_KEYS.map((key) => {
            const allowed = canGoToStep(currentStep, key, hasStory);
            const isActive = currentStep === key;
            return (
              <button
                key={key}
                onClick={() => allowed && setCurrentStep(key)}
                style={{
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 12,
                  letterSpacing: "0.06em",
                  background: "none",
                  border: "none",
                  borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                  paddingBottom: 4,
                  cursor: allowed ? "pointer" : "not-allowed",
                  color: isActive
                    ? "var(--text-display)"
                    : allowed
                    ? "var(--text-secondary)"
                    : "var(--text-disabled)",
                }}
              >
                {STEP_NUMS[key]} {t.steps[key]}
              </button>
            );
          })}
        </nav>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <VersionDrawer />
          {/* Lang toggle */}
          <div
            style={{
              display: "flex",
              border: "1px solid var(--border-visible)",
              borderRadius: "var(--radius-btn)",
              overflow: "hidden",
              height: 32,
            }}
          >
            {(["en", "ko"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                style={{
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "0 14px",
                  cursor: "pointer",
                  border: "none",
                  background: locale === l ? "var(--text-display)" : "transparent",
                  color: locale === l ? "var(--black)" : "var(--text-secondary)",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <ThemeToggle />
        </div>
      </header>

      <main style={{ padding: "40px 24px", maxWidth: 1200, margin: "0 auto" }}>
        {currentStep === "prompt"     && <PromptStep />}
        {currentStep === "story"      && <StoryStep />}
        {currentStep === "characters" && <CharactersStep />}
        {currentStep === "storyboard" && <StoryboardStep />}
        {currentStep === "video"      && <VideoStep />}
      </main>
    </div>
  );
}
