import type { Scene, Shot } from "@/types/movie";

export interface ShotTask {
  shotId: string;
  sceneId: string;
  shot: Shot;
  scene: Scene;
  previousShotId: string | null; // shotId whose panel to use as reference
}

export type DependencyBatch = ShotTask[];

/**
 * Builds an ordered list of generation batches for storyboard panels.
 *
 * Strategy (adapted from ArcReel's build_storyboard_dependency_plan):
 * - Within a scene: shots are generated sequentially so each shot can
 *   reference the previous shot's panel for visual continuity.
 * - Across scenes: the first shot of each scene runs in parallel (batch 0),
 *   then subsequent shots within each scene form their own sequential chain.
 *
 * Result: an array of batches. Each batch can be executed in parallel.
 * Batch N must complete before Batch N+1 starts.
 */
export function buildDependencyPlan(scenes: Scene[]): DependencyBatch[] {
  if (!scenes.length) return [];

  // Determine max shots across all scenes
  const maxShots = Math.max(...scenes.map((sc) => sc.shots.length));

  const batches: DependencyBatch[] = [];

  for (let shotIndex = 0; shotIndex < maxShots; shotIndex++) {
    const batch: DependencyBatch = [];

    for (const scene of scenes) {
      const shot = scene.shots[shotIndex];
      if (!shot) continue;

      const previousShot = shotIndex > 0 ? scene.shots[shotIndex - 1] : null;

      batch.push({
        shotId: shot.id,
        sceneId: scene.id,
        shot,
        scene,
        previousShotId: previousShot?.id ?? null,
      });
    }

    if (batch.length > 0) {
      batches.push(batch);
    }
  }

  return batches;
}
