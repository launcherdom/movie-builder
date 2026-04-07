"use client";

import { useState, useEffect } from "react";
import { useProjectStore } from "@/stores/project-store";

interface Version {
  id: string;
  versionNumber: number;
  label: string;
  createdAt: string;
}

export function VersionDrawer() {
  const { id: projectId, saveVersion, restoreVersion, story } = useProjectStore();
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState("");

  const fetchVersions = async () => {
    if (!projectId) return;
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/versions`);
    if (res.ok) {
      const { versions: v } = await res.json() as { versions: Version[] };
      setVersions(v);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchVersions();
  }, [open, projectId]);

  const handleSave = async () => {
    setSaving(true);
    await saveVersion(label.trim() || undefined);
    setLabel("");
    await fetchVersions();
    setSaving(false);
  };

  const handleRestore = async (versionId: string) => {
    await restoreVersion(versionId);
    setOpen(false);
  };

  if (!story) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          fontFamily: "var(--font-space-mono), monospace",
          fontSize: 11,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: "transparent",
          border: "1px solid var(--border-visible)",
          borderRadius: "var(--radius-btn)",
          color: "var(--text-secondary)",
          padding: "6px 14px",
          cursor: "pointer",
        }}
      >
        VERSIONS
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100 }}
          />

          {/* Drawer */}
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: 340,
              height: "100vh",
              background: "var(--black)",
              borderLeft: "1px solid var(--border-visible)",
              zIndex: 101,
              display: "flex",
              flexDirection: "column",
              padding: 24,
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 13, letterSpacing: "0.08em", color: "var(--text-display)" }}>
                VERSION HISTORY
              </span>
              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 18 }}
              >
                ×
              </button>
            </div>

            {/* Save current */}
            <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid var(--border)" }}>
              <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-secondary)", marginBottom: 8 }}>
                SAVE SNAPSHOT
              </p>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Version label (optional)"
                style={{
                  width: "100%",
                  background: "var(--surface)",
                  border: "1px solid var(--border-visible)",
                  borderRadius: 4,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-space-grotesk), sans-serif",
                  fontSize: 13,
                  padding: "8px 10px",
                  outline: "none",
                  marginBottom: 8,
                }}
              />
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  width: "100%",
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  background: saving ? "var(--border)" : "var(--text-display)",
                  color: "var(--black)",
                  border: "none",
                  borderRadius: "var(--radius-btn)",
                  padding: "8px",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "[SAVING...]" : "SAVE VERSION"}
              </button>
            </div>

            {/* Version list */}
            {loading ? (
              <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-disabled)" }}>[LOADING...]</p>
            ) : versions.length === 0 ? (
              <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--text-disabled)" }}>No versions saved yet</p>
            ) : (
              versions.map((v) => (
                <div key={v.id} style={{ marginBottom: 12, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 12, color: "var(--text-display)" }}>
                        v{v.versionNumber} — {v.label}
                      </p>
                      <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "var(--text-disabled)", marginTop: 2 }}>
                        {new Date(v.createdAt).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestore(v.id)}
                      style={{
                        fontFamily: "var(--font-space-mono), monospace",
                        fontSize: 10,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        background: "transparent",
                        border: "1px solid var(--border-visible)",
                        borderRadius: "var(--radius-btn)",
                        color: "var(--text-secondary)",
                        padding: "4px 10px",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      RESTORE
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </>
  );
}
