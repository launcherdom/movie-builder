import type { Story } from "@/types/movie";
import { IMAGE_MODEL, VIDEO_MODEL } from "@/lib/fal/models";

export interface CostBreakdown {
  characterSheets: { count: number; costEach: number; total: number };
  storyboardPanels: { count: number; costEach: number; total: number };
  keyframes: { count: number; costEach: number; total: number };
  videoClips: { count: number; secondsEach: number; costPerSecond: number; total: number };
  grandTotal: number;
}

export function estimateCost(story: Story): CostBreakdown {
  const imageModel = IMAGE_MODEL;
  const videoModel = VIDEO_MODEL;

  const characterCount = story.characters.length;
  const allShots = story.scenes.flatMap((sc) => sc.shots);
  const shotCount = allShots.length;
  const avgDuration = allShots.reduce((sum, sh) => sum + sh.duration, 0) / Math.max(shotCount, 1);

  const characterCost = imageModel.costPerImage;
  const storyboardCost = imageModel.costPerImage;
  const keyframeCost = imageModel.costPerImage;
  const videoSecondCost = videoModel.costPerSecond;

  return {
    characterSheets: {
      count: characterCount,
      costEach: characterCost,
      total: characterCount * characterCost,
    },
    storyboardPanels: {
      count: shotCount,
      costEach: storyboardCost,
      total: shotCount * storyboardCost,
    },
    keyframes: {
      count: shotCount,
      costEach: keyframeCost,
      total: shotCount * keyframeCost,
    },
    videoClips: {
      count: shotCount,
      secondsEach: avgDuration,
      costPerSecond: videoSecondCost,
      total: shotCount * avgDuration * videoSecondCost,
    },
    get grandTotal() {
      return (
        this.characterSheets.total +
        this.storyboardPanels.total +
        this.keyframes.total +
        this.videoClips.total
      );
    },
  };
}

export function formatCost(usd: number): string {
  if (usd < 0.01) return "< $0.01";
  return `$${usd.toFixed(2)}`;
}
