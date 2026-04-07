"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PipelineStep, Story } from "@/types/movie";

interface ProjectCard {
  id: string;
  concept: string;
  storyJson: Story | null;
  currentStep: PipelineStep;
  createdAt: string;
  updatedAt: string;
}

const STEP_ORDER: PipelineStep[] = ["prompt", "story", "characters", "storyboard", "video"];

function StepDots({ current }: { current: PipelineStep }) {
  const idx = STEP_ORDER.indexOf(current);
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {STEP_ORDER.map((_, i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            background: i <= idx ? "var(--text-display)" : "var(--border)",
          }}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  const [projectList, setProjectList] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        setProjectList((d.projects ?? []).reverse());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjectList((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div
      className="dot-grid"
      style={{ minHeight: "100vh", padding: "48px 24px" }}
    >
      {/* Header */}
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 48 }}>
          <div>
            <h1
              className="font-display"
              style={{ fontSize: 48, color: "var(--text-display)", lineHeight: 1, letterSpacing: "-0.02em" }}
            >
              MOVIE BUILDER
            </h1>
            <p style={{
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "var(--text-secondary)",
              marginTop: 8,
            }}>
              AI SHORT FILM STUDIO
            </p>
          </div>
          <Link
            href="/project/new"
            style={{
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 12,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: "var(--text-display)",
              color: "var(--black)",
              borderRadius: "var(--radius-btn)",
              padding: "10px 28px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            + NEW PROJECT
          </Link>
        </div>

        {/* Project Grid */}
        {loading ? (
          <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 12, color: "var(--text-disabled)" }}>
            [LOADING...]
          </p>
        ) : projectList.length === 0 ? (
          <div style={{
            border: "1px dashed var(--border-visible)",
            borderRadius: 8,
            padding: 64,
            textAlign: "center",
          }}>
            <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 12, color: "var(--text-disabled)", marginBottom: 24 }}>
              NO PROJECTS YET
            </p>
            <Link
              href="/project/new"
              style={{
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 11,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text-secondary)",
                textDecoration: "underline",
              }}
            >
              Start your first film
            </Link>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}>
            {projectList.map((project) => {
              const title = project.storyJson?.title ?? project.concept;
              const date = new Date(project.updatedAt).toLocaleDateString("en", {
                month: "short", day: "numeric", year: "numeric",
              });
              return (
                <Link
                  key={project.id}
                  href={`/project/${project.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      border: "1px solid var(--border-visible)",
                      borderRadius: 8,
                      padding: 20,
                      background: "var(--surface)",
                      cursor: "pointer",
                      transition: "border-color 0.15s",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--text-secondary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-visible)")}
                  >
                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(project.id, e)}
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-disabled)",
                        fontSize: 14,
                        lineHeight: 1,
                        padding: 4,
                      }}
                      title="Delete project"
                    >
                      ×
                    </button>

                    <p style={{
                      fontFamily: "var(--font-space-mono), monospace",
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      color: "var(--accent)",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}>
                      {project.currentStep}
                    </p>

                    <p style={{
                      fontFamily: "var(--font-space-grotesk), sans-serif",
                      fontSize: 15,
                      color: "var(--text-display)",
                      marginBottom: 12,
                      lineHeight: 1.3,
                      paddingRight: 24,
                    }}>
                      {title.length > 60 ? title.slice(0, 60) + "…" : title}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
                      <StepDots current={project.currentStep} />
                      <span style={{
                        fontFamily: "var(--font-space-mono), monospace",
                        fontSize: 10,
                        color: "var(--text-disabled)",
                      }}>
                        {date}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
