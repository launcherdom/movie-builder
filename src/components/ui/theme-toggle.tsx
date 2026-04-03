"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div style={{ width: 120, height: 32 }} />;

  return (
    <div
      style={{
        display: "flex",
        border: "1px solid var(--border-visible)",
        borderRadius: "var(--radius-btn)",
        overflow: "hidden",
        height: 32,
      }}
    >
      {(["dark", "light"] as const).map((t) => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          style={{
            fontFamily: "var(--font-space-mono), monospace",
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: "0 16px",
            cursor: "pointer",
            border: "none",
            background: theme === t ? "var(--text-display)" : "transparent",
            color: theme === t ? "var(--black)" : "var(--text-secondary)",
            transition: "background 0.15s, color 0.15s",
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
