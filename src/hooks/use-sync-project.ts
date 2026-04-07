"use client";

import { useEffect, useRef } from "react";
import { useProjectStore } from "@/stores/project-store";

const DEBOUNCE_MS = 800;

// Auto-saves project state to DB 800ms after any change.
// Must be mounted in a component that has an active project (id set).
export function useSyncProject() {
  const saveProject = useProjectStore((s) => s.saveProject);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let prevSnapshot = "";

    const unsub = useProjectStore.subscribe((state) => {
      if (!state.id) return;

      const snapshot = JSON.stringify({
        id: state.id,
        concept: state.concept,
        genre: state.genre,
        tone: state.tone,
        targetDuration: state.targetDuration,
        aspectRatio: state.aspectRatio,
        visualStyle: state.visualStyle,
        qualityTier: state.qualityTier,
        story: state.story,
        currentStep: state.currentStep,
      });

      if (snapshot === prevSnapshot) return;
      prevSnapshot = snapshot;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        saveProject();
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [saveProject]);
}
