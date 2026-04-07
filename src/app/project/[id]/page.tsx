"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { MovieApp } from "@/components/movie-app";
import { useProjectStore } from "@/stores/project-store";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const loadProject = useProjectStore((s) => s.loadProject);
  const storeId = useProjectStore((s) => s.id);

  useEffect(() => {
    // Load from DB only when navigating to an existing project (not freshly created)
    if (id && id !== "new" && id !== storeId) {
      loadProject(id);
    }
  }, [id, storeId, loadProject]);

  return <MovieApp />;
}
