"use client";
import { useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { useLangStore } from "@/stores/lang-store";
import { CharacterCard } from "@/components/characters/character-card";
import type { Character } from "@/types/movie";

export function CharactersStep() {
  const { story, setCurrentStep, visualStyle } = useProjectStore();
  const { t } = useLangStore();
  const [generatingAll, setGeneratingAll] = useState(false);

  if (!story) {
    return (
      <p style={{ fontFamily: "var(--font-space-mono), monospace", color: "var(--text-secondary)", fontSize: 13 }}>
        {t.characters.noStory}
      </p>
    );
  }

  const allSheetsGenerated = story.characters.every((c) => !!c.characterSheet);

  const handleGenerateAll = async () => {
    setGeneratingAll(true);
    const pending = story.characters.filter((c) => !c.characterSheet);
    await Promise.all(
      pending.map(async (char) => {
        try {
          const res = await fetch("/api/characters/sheet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ character: char, visualStyle }),
          });
          if (res.ok) {
            const { characterSheet } = await res.json();
            useProjectStore.getState().updateCharacterSheet(char.id, characterSheet);
          }
        } catch {
          // continue with other characters
        }
      })
    );
    setGeneratingAll(false);
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 36, color: "var(--text-display)", marginBottom: 4 }}>
            {t.characters.heading}
          </h1>
          <p style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 11, letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
            {t.characters.all} — {story.characters.length}
          </p>
        </div>
        <button
          onClick={handleGenerateAll}
          disabled={generatingAll || allSheetsGenerated}
          style={{
            fontFamily: "var(--font-space-mono), monospace",
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            background: "transparent",
            border: "1px solid var(--border-visible)",
            borderRadius: "var(--radius-btn)",
            color: (generatingAll || allSheetsGenerated) ? "var(--text-disabled)" : "var(--text-primary)",
            padding: "8px 20px",
            cursor: (generatingAll || allSheetsGenerated) ? "not-allowed" : "pointer",
          }}
        >
          {generatingAll ? t.characters.generating : allSheetsGenerated ? t.characters.allDone : t.characters.generateAll}
        </button>
      </div>

      <div style={{ borderTop: "1px solid var(--border-visible)", paddingTop: 24 }}>
        {story.characters.map((char: Character, i) => (
          <CharacterCard key={char.id} character={char} index={i} />
        ))}
      </div>

      <button
        onClick={() => setCurrentStep("storyboard")}
        style={{
          marginTop: 16,
          fontFamily: "var(--font-space-mono), monospace",
          fontSize: 12,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: "var(--text-display)",
          color: "var(--black)",
          border: "none",
          borderRadius: "var(--radius-btn)",
          padding: "12px 32px",
          cursor: "pointer",
        }}
      >
        {t.characters.next}
      </button>
    </div>
  );
}
