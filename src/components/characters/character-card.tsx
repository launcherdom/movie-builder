"use client";
import { useState, useRef } from "react";
import { useProjectStore } from "@/stores/project-store";
import { persistAsset } from "@/lib/assets/persist";
import { Skeleton } from "@/components/ui/skeleton";
import type { Character } from "@/types/movie";

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-space-mono), monospace",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "var(--text-secondary)",
  display: "block",
  marginBottom: 4,
};

const fieldInput: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  borderBottom: "1px solid var(--border-visible)",
  color: "var(--text-primary)",
  fontFamily: "var(--font-space-grotesk), sans-serif",
  fontSize: 15,
  padding: "6px 0",
  outline: "none",
};

interface CharacterCardProps {
  character: Character;
  index: number;
}

export function CharacterCard({ character, index }: CharacterCardProps) {
  const { updateCharacter, updateCharacterSheet, setCharacterPreview, id: projectId, visualStyle } = useProjectStore();
  const [generatingSheet, setGeneratingSheet] = useState(false);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [referenceUploading, setReferenceUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasPreview = !!character.previewImage?.url;
  const hasSheet = !!character.characterSheet?.url;

  const handleReferenceFile = async (file: File) => {
    setReferenceUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/assets/reference", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json() as { url: string };
        setReferenceImageUrl(url);
      }
    } catch {
      // silently ignore upload errors — reference is optional
    } finally {
      setReferenceUploading(false);
    }
  };

  const handleGeneratePreview = async () => {
    setError(null);
    setGeneratingPreview(true);
    setCharacterPreview(character.id, null, "generating");
    try {
      const res = await fetch("/api/characters/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character,
          visualStyle,
          ...(referenceImageUrl && { referenceImageUrl }),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { previewImage } = await res.json() as { previewImage: { url: string; width: number; height: number } };
      setCharacterPreview(character.id, previewImage, "done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview generation failed");
      setCharacterPreview(character.id, null, "error");
    } finally {
      setGeneratingPreview(false);
    }
  };

  const handleGenerateSheet = async () => {
    setError(null);
    setGeneratingSheet(true);
    try {
      const res = await fetch("/api/characters/sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character, visualStyle }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { characterSheet } = await res.json() as { characterSheet: { url: string; width: number; height: number } };
      updateCharacterSheet(character.id, characterSheet);
      if (projectId) {
        persistAsset({ url: characterSheet.url, projectId, shotId: character.id, assetType: "character_sheet" })
          .then((blobUrl) => { if (blobUrl !== characterSheet.url) updateCharacterSheet(character.id, { ...characterSheet, url: blobUrl }); })
          .catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sheet generation failed");
    } finally {
      setGeneratingSheet(false);
    }
  };

  return (
    <div style={{ border: "1px solid var(--border-visible)", borderRadius: "var(--radius-card)", overflow: "hidden", marginBottom: 24, background: "var(--surface)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 12, letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
          CHARACTER {String(index + 1).padStart(2, "0")}
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {hasSheet && (
            <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "var(--success)" }}>[SHEET READY]</span>
          )}
        </div>
      </div>

      {/* Form fields */}
      <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 32px" }}>
        <div>
          <label style={labelStyle}>Name</label>
          <input value={character.name} onChange={(e) => updateCharacter(character.id, { name: e.target.value })} style={fieldInput} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Age</label>
            <input value={character.age ?? ""} onChange={(e) => updateCharacter(character.id, { age: e.target.value })} style={fieldInput} />
          </div>
          <div>
            <label style={labelStyle}>Gender</label>
            <input value={character.gender ?? ""} onChange={(e) => updateCharacter(character.id, { gender: e.target.value })} style={fieldInput} />
          </div>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Appearance</label>
          <textarea
            value={character.description}
            onChange={(e) => updateCharacter(character.id, { description: e.target.value })}
            rows={3}
            style={{ ...fieldInput, resize: "vertical", borderBottom: "none", border: "1px solid var(--border-visible)", borderRadius: 4, padding: 8 }}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Image Prompt <span style={{ color: "var(--text-disabled)", textTransform: "none", letterSpacing: 0 }}>(extra generation hint)</span></label>
          <input
            value={character.imagePrompt ?? ""}
            onChange={(e) => updateCharacter(character.id, { imagePrompt: e.target.value })}
            placeholder="e.g. soft rim lighting, cyberpunk neon backdrop"
            style={fieldInput}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Personality</label>
          <input value={character.personality} onChange={(e) => updateCharacter(character.id, { personality: e.target.value })} style={fieldInput} />
        </div>
      </div>

      {/* Reference image + Preview controls */}
      <div style={{ padding: "0 20px 20px", display: "flex", gap: 16, alignItems: "flex-end" }}>
        {/* Reference image upload */}
        <div>
          <label style={{ ...labelStyle, marginBottom: 6 }}>Reference Image <span style={{ color: "var(--text-disabled)", textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) handleReferenceFile(f); }}
            style={{
              width: 64, height: 64,
              border: "1px dashed var(--border-visible)",
              borderRadius: 4,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {referenceUploading ? (
              <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 9, color: "var(--text-disabled)" }}>...</span>
            ) : referenceImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={referenceImageUrl} alt="ref" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 20, color: "var(--text-disabled)" }}>+</span>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReferenceFile(f); }} />
        </div>

        {/* Preview button */}
        <div style={{ flex: 1 }}>
          <button
            onClick={handleGeneratePreview}
            disabled={generatingPreview || !character.description}
            style={{
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: "transparent",
              border: "1px solid var(--border-visible)",
              borderRadius: "var(--radius-btn)",
              color: generatingPreview || !character.description ? "var(--text-disabled)" : "var(--text-primary)",
              padding: "8px 20px",
              cursor: generatingPreview || !character.description ? "not-allowed" : "pointer",
              width: "100%",
            }}
          >
            {generatingPreview ? "[GENERATING PREVIEW...]" : hasPreview ? "↺ RE-PREVIEW" : "▶ PREVIEW"}
          </button>
        </div>
      </div>

      {error && (
        <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--accent)", padding: "0 20px 12px" }}>
          [ERROR: {error}]
        </p>
      )}

      {/* Preview image */}
      {(generatingPreview || hasPreview) && (
        <div style={{ padding: "0 20px 20px" }}>
          <label style={{ ...labelStyle, marginBottom: 8 }}>Preview</label>
          {generatingPreview ? (
            <Skeleton width={200} height={300} borderRadius={4} />
          ) : (
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={character.previewImage!.url}
                alt={`${character.name} preview`}
                style={{ width: 200, borderRadius: 4, border: "1px solid var(--border)" }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "var(--text-secondary)", marginBottom: 4 }}>
                  LOOKS GOOD? CONFIRM TO GENERATE FULL CHARACTER SHEET.
                </p>
                <button
                  onClick={handleGenerateSheet}
                  disabled={generatingSheet}
                  style={{
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    background: generatingSheet ? "var(--border)" : "var(--text-display)",
                    color: generatingSheet ? "var(--text-disabled)" : "var(--black)",
                    border: "none",
                    borderRadius: "var(--radius-btn)",
                    padding: "8px 16px",
                    cursor: generatingSheet ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {generatingSheet ? "[GENERATING SHEET...]" : hasSheet ? "↺ REGENERATE SHEET" : "✓ CONFIRM & GENERATE SHEET"}
                </button>
                {hasSheet && (
                  <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "var(--success)" }}>
                    [SHEET COMPLETE]
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full character sheet */}
      {!generatingSheet && hasSheet && (
        <div style={{ padding: "0 20px 20px" }}>
          <label style={{ ...labelStyle, marginBottom: 8 }}>Character Sheet</label>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={character.characterSheet!.url}
            alt={`${character.name} character sheet`}
            style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)" }}
          />
        </div>
      )}

      {generatingSheet && (
        <div style={{ padding: "0 20px 20px" }}>
          <label style={{ ...labelStyle, marginBottom: 8 }}>Character Sheet</label>
          <Skeleton width="100%" height={240} borderRadius={8} />
        </div>
      )}
    </div>
  );
}
