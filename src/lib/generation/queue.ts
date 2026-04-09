/**
 * Client-side generation queue with per-type concurrency limits.
 * Adapted from ArcReel's per-provider concurrency pool concept.
 * Runs in the browser — drives sequential/parallel generation from the UI.
 */

export type TaskType = "image" | "video";

export interface QueueTask<T = unknown> {
  type: TaskType;
  run: () => Promise<T>;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
}

interface PoolState {
  running: number;
  queue: Array<() => void>;
}

const CONCURRENCY: Record<TaskType, number> = {
  image: 3,
  video: 1, // 1 at a time — each scene uses the previous scene's video as reference
};

class GenerationQueue {
  private pools: Record<TaskType, PoolState> = {
    image: { running: 0, queue: [] },
    video: { running: 0, queue: [] },
  };

  private progressCallbacks: Set<(stats: QueueStats) => void> = new Set();
  private pending = 0;
  private completed = 0;
  private failed = 0;

  private acquire(type: TaskType): Promise<void> {
    const pool = this.pools[type];
    if (pool.running < CONCURRENCY[type]) {
      pool.running++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      pool.queue.push(resolve);
    });
  }

  private release(type: TaskType): void {
    const pool = this.pools[type];
    pool.running--;
    const next = pool.queue.shift();
    if (next) {
      pool.running++;
      next();
    }
    this.emitProgress();
  }

  private emitProgress(): void {
    const stats = this.getStats();
    this.progressCallbacks.forEach((cb) => cb(stats));
  }

  getStats(): QueueStats {
    return {
      pending: this.pending,
      completed: this.completed,
      failed: this.failed,
      imageRunning: this.pools.image.running,
      videoRunning: this.pools.video.running,
      imageQueued: this.pools.image.queue.length,
      videoQueued: this.pools.video.queue.length,
    };
  }

  onProgress(callback: (stats: QueueStats) => void): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  async enqueue<T>(task: QueueTask<T>): Promise<T> {
    this.pending++;
    this.emitProgress();

    await this.acquire(task.type);
    try {
      const result = await task.run();
      this.completed++;
      this.pending--;
      task.onSuccess?.(result);
      return result;
    } catch (err) {
      this.failed++;
      this.pending--;
      const error = err instanceof Error ? err : new Error(String(err));
      task.onError?.(error);
      throw error;
    } finally {
      this.release(task.type);
    }
  }

  // Convenience: enqueue an image generation task
  enqueueImage<T>(run: () => Promise<T>, callbacks?: { onSuccess?: (r: T) => void; onError?: (e: Error) => void }): Promise<T> {
    return this.enqueue({ type: "image", run, ...callbacks });
  }

  // Convenience: enqueue a video generation task
  enqueueVideo<T>(run: () => Promise<T>, callbacks?: { onSuccess?: (r: T) => void; onError?: (e: Error) => void }): Promise<T> {
    return this.enqueue({ type: "video", run, ...callbacks });
  }

  reset(): void {
    this.pending = 0;
    this.completed = 0;
    this.failed = 0;
    this.emitProgress();
  }
}

export interface QueueStats {
  pending: number;
  completed: number;
  failed: number;
  imageRunning: number;
  videoRunning: number;
  imageQueued: number;
  videoQueued: number;
}

// Singleton queue shared across the app
export const generationQueue = new GenerationQueue();
