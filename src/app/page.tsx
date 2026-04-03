import Link from "next/link";

export default function HomePage() {
  return (
    <div
      className="dot-grid"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        textAlign: "center",
      }}
    >
      <span style={{ fontSize: 48 }}>🎬</span>
      <h1
        className="font-display"
        style={{ fontSize: 72, color: "var(--text-display)", lineHeight: 1, letterSpacing: "-0.02em" }}
      >
        MOVIE BUILDER
      </h1>
      <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
        AI SHORT FILM STUDIO
      </p>
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
          padding: "12px 32px",
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        START BUILDING
      </Link>
    </div>
  );
}
