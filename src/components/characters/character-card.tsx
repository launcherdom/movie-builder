"use client";
import { useState } from "react";
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
  const { updateCharacter, updateCharacterSheet, setCharacterFaceImage, id: projectId } = useProjectStore();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSheet = async () => {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/characters/sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as {
        characterSheet: { url: string; width: number; height: number };
        faceImage: { url: string; width: number; height: number } | null;
      };
      const { characterSheet, faceImage } = data;
      updateCharacterSheet(character.id, characterSheet);
      if (faceImage) {
        setCharacterFaceImage(character.id, faceImage);
      }
      // Persist to Vercel Blob in background
      if (projectId) {
        persistAsset({ url: characterSheet.url, projectId, shotId: character.id, assetType: "character_sheet" })
          .then((blobUrl) => { if (blobUrl !== characterSheet.url) updateCharacterSheet(character.id, { ...characterSheet, url: blobUrl }); })
          .catch(() => {});
        if (faceImage) {
          persistAsset({ url: faceImage.url, projectId, shotId: `${character.id}_face`, assetType: "character_sheet" })
            .then((blobUrl) => { if (blobUrl !== faceImage.url) setCharacterFaceImage(character.id, { ...faceImage, url: blobUrl }); })
            .catch(() => {});
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sheet generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      style={{
        border: "1px solid var(--border-visible)",
        borderRadius: "var(--radius-card)",
        overflow: "hidden",
        marginBottom: 24,
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 12, letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
          CHARACTER {String(index + 1).padStart(2, "0")}
        </span>
        <button
          onClick={handleGenerateSheet}
          disabled={generating}
          style={{
            fontFamily: "var(--font-space-mono), monospace",
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            background: "transparent",
            border: "1px solid var(--border-visible)",
            borderRadius: "var(--radius-btn)",
            color: generating ? "var(--text-disabled)" : "var(--text-primary)",
            padding: "6px 16px",
            cursor: generating ? "not-allowed" : "pointer",
          }}
        >
          {generating ? "[GENERATING...]" : character.characterSheet ? "↺ REGENERATE SHEET" : "GENERATE SHEET"}
        </button>
      </div>

      <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 32px" }}>
        <div>
          <label style={labelStyle}>Name</label>
          <input
            value={character.name}
            onChange={(e) => updateCharacter(character.id, { name: e.target.value })}
            style={fieldInput}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Age</label>
            <input
              value={character.age ?? ""}
              onChange={(e) => updateCharacter(character.id, { age: e.target.value })}
              style={fieldInput}
            />
          </div>
          <div>
            <label style={labelStyle}>Gender</label>
            <input
              value={character.gender ?? ""}
              onChange={(e) => updateCharacter(character.id, { gender: e.target.value })}
              style={fieldInput}
            />
          </div>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Appearance</label>
          <textarea
            value={character.description}
            onChange={(e) => updateCharacter(character.id, { description: e.target.value })}
            rows={3}
            style={{
              ...fieldInput,
              resize: "vertical",
              borderBottom: "none",
              border: "1px solid var(--border-visible)",
              borderRadius: 4,
              padding: 8,
            }}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Personality</label>
          <input
            value={character.personality}
            onChange={(e) => updateCharacter(character.id, { personality: e.target.value })}
            style={fieldInput}
          />
        </div>
      </div>

      {error && (
        <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "var(--accent)", padding: "0 20px 12px" }}>
          [ERROR: {error}]
        </p>
      )}

      {generating && (
        <div style={{ padding: "0 20px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12 }}>
            <div>
              <label style={{ ...labelStyle, marginBottom: 8 }}>Face Reference</label>
              <Skeleton width={120} height={160} borderRadius={8} />
            </div>
            <div>
              <label style={{ ...labelStyle, marginBottom: 8 }}>Character Sheet</label>
              <Skeleton width="100%" height={240} borderRadius={8} />
            </div>
          </div>
        </div>
      )}

      {!generating && (character.characterSheet || character.faceImage) && (
        <div style={{ padding: "0 20px 20px" }}>
          {character.faceImage && character.characterSheet ? (
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12 }}>
              <div>
                <label style={{ ...labelStyle, marginBottom: 8 }}>Face Reference</label>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={character.faceImage.url}
                  alt={`${character.name} face close-up`}
                  style={{ width: 120, borderRadius: 8, border: "1px solid var(--border)" }}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, marginBottom: 8 }}>Character Sheet</label>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={character.characterSheet.url}
                  alt={`${character.name} character sheet`}
                  style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)" }}
                />
              </div>
            </div>
          ) : character.characterSheet ? (
            <>
              <label style={{ ...labelStyle, marginBottom: 8 }}>Character Sheet</label>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={character.characterSheet.url}
                alt={`${character.name} character sheet`}
                style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)" }}
              />
            </>
          ) : character.faceImage ? (
            <>
              <label style={{ ...labelStyle, marginBottom: 8 }}>Face Reference</label>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={character.faceImage.url}
                alt={`${character.name} face close-up`}
                style={{ width: 120, borderRadius: 8, border: "1px solid var(--border)" }}
              />
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
