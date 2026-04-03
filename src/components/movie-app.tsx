"use client";
import { useProjectStore } from "@/stores/project-store";
import type { PipelineStep } from "@/types/movie";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PromptStep } from "@/components/steps/prompt-step";
import { StoryStep } from "@/components/steps/story-step";
import { CharactersStep } from "@/components/steps/characters-step";
import { StoryboardStep } from "@/components/steps/storyboard-step";
import { VideoStep } from "@/components/steps/video-step";

const STEPS: { key: PipelineStep; label: string; num: string }[] = [
  { key: "prompt",     label: "CONCEPT",    num: "01" },
  { key: "story",      label: "STORY",      num: "02" },
  { key: "characters", label: "CHARACTERS", num: "03" },
  { key: "storyboard", label: "BOARD",      num: "04" },
  { key: "video",      label: "VIDEO",      num: "05" },
];

function canGoToStep(current: PipelineStep, target: PipelineStep, hasStory: boolean, allSheetsGenerated: boolean): boolean {
  const order: PipelineStep[] = ["prompt", "story", "characters", "storyboard", "video"];
  const cur = order.indexOf(current);
  const tgt = order.indexOf(target);
  if (tgt <= cur) return true;
  if (target === "characters" && !hasStory) return false;
  if (target === "storyboard" && !allSheetsGenerated) return false;
  if (target === "video" && !allSheetsGenerated) return false;
  return tgt <= cur + 1;
}

export function MovieApp() {
  const { currentStep, story, setCurrentStep } = useProjectStore();

  const hasStory = !!story;
  const allSheetsGenerated =
    hasStory &&
    story.characters.length > 0 &&
    story.characters.every((c) => !!c.characterSheet);

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
          🎬 MOVIE BUILDER
        </span>

        <nav style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {STEPS.map(({ key, label, num }) => {
            const allowed = canGoToStep(currentStep, key, hasStory, allSheetsGenerated);
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
                {num} {label}
              </button>
            );
          })}
        </nav>

        <ThemeToggle />
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
