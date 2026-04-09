import type { Story } from "@/types/movie";

function formatSrtTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

export function buildSrtFromStory(story: Story): string {
  const entries: string[] = [];
  let idx = 1;
  let timeOffset = 0;

  for (const scene of story.scenes) {
    for (const shot of scene.shots) {
      const shotDuration = shot.videoClip?.duration ?? shot.duration;

      if (shot.dialogue && shot.dialogue.trim()) {
        const start = timeOffset;
        // Subtitle display for 80% of shot duration (min 1s, max 5s)
        const displayDuration = Math.max(1, Math.min(5, shotDuration * 0.8));
        const end = start + displayDuration;

        const line = shot.dialogue.trim();

        entries.push(
          `${idx}\n${formatSrtTimestamp(start)} --> ${formatSrtTimestamp(end)}\n${line}`
        );
        idx++;
      }

      timeOffset += shotDuration;
    }
  }

  return entries.join("\n\n");
}
