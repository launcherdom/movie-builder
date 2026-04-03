"use client";
import { useProjectStore } from "@/stores/project-store";
import type { VideoPromptJson } from "@/types/movie";

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-space-mono), monospace",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "var(--text-secondary)",
  display: "block",
  marginBottom: 2,
  minWidth: 140,
};

const fieldInput: React.CSSProperties = {
  flex: 1,
  background: "transparent",
  border: "none",
  borderBottom: "1px solid var(--border)",
  color: "var(--text-primary)",
  fontFamily: "var(--font-space-grotesk), sans-serif",
  fontSize: 13,
  padding: "4px 0",
  outline: "none",
};

function FieldRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 8 }}>
      <label style={labelStyle}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} style={fieldInput} />
    </div>
  );
}

interface VideoPromptEditorProps {
  shotId: string;
  json: VideoPromptJson;
}

export function VideoPromptEditor({ shotId, json }: VideoPromptEditorProps) {
  const { setShotVideoPromptJson } = useProjectStore();

  const update = (path: string[], value: string) => {
    const next = JSON.parse(JSON.stringify(json)) as VideoPromptJson;
    let obj: Record<string, unknown> = next as unknown as Record<string, unknown>;
    for (let i = 0; i < path.length - 1; i++) {
      obj = obj[path[i]] as Record<string, unknown>;
    }
    obj[path[path.length - 1]] = value;
    setShotVideoPromptJson(shotId, next);
  };

  return (
    <div style={{ padding: "16px 0", borderTop: "1px solid var(--border)" }}>
      <p style={{ ...labelStyle, color: "var(--text-primary)", marginBottom: 8 }}>SHOT</p>
      <FieldRow label="COMPOSITION" value={json.shot.composition} onChange={(v) => update(["shot", "composition"], v)} />
      <FieldRow label="LENS" value={json.shot.lens} onChange={(v) => update(["shot", "lens"], v)} />
      <FieldRow label="CAMERA MOVEMENT" value={json.shot.camera_movement} onChange={(v) => update(["shot", "camera_movement"], v)} />

      <p style={{ ...labelStyle, color: "var(--text-primary)", marginBottom: 8, marginTop: 16 }}>SUBJECT</p>
      <FieldRow label="DESCRIPTION" value={json.subject.description} onChange={(v) => update(["subject", "description"], v)} />
      <FieldRow label="WARDROBE" value={json.subject.wardrobe} onChange={(v) => update(["subject", "wardrobe"], v)} />
      <FieldRow label="PROPS" value={json.subject.props} onChange={(v) => update(["subject", "props"], v)} />

      <p style={{ ...labelStyle, color: "var(--text-primary)", marginBottom: 8, marginTop: 16 }}>SCENE</p>
      <FieldRow label="LOCATION" value={json.scene.location} onChange={(v) => update(["scene", "location"], v)} />
      <FieldRow label="TIME OF DAY" value={json.scene.time_of_day} onChange={(v) => update(["scene", "time_of_day"], v)} />
      <FieldRow label="ENVIRONMENT" value={json.scene.environment} onChange={(v) => update(["scene", "environment"], v)} />

      <p style={{ ...labelStyle, color: "var(--text-primary)", marginBottom: 8, marginTop: 16 }}>VISUAL DETAILS</p>
      <FieldRow label="ACTION" value={json.visual_details.action} onChange={(v) => update(["visual_details", "action"], v)} />
      <FieldRow label="SPECIAL EFFECTS" value={json.visual_details.special_effects} onChange={(v) => update(["visual_details", "special_effects"], v)} />
      <FieldRow label="HAIR/CLOTH" value={json.visual_details.hair_clothing_motion} onChange={(v) => update(["visual_details", "hair_clothing_motion"], v)} />

      <p style={{ ...labelStyle, color: "var(--text-primary)", marginBottom: 8, marginTop: 16 }}>CINEMATOGRAPHY</p>
      <FieldRow label="LIGHTING" value={json.cinematography.lighting} onChange={(v) => update(["cinematography", "lighting"], v)} />
      <FieldRow label="COLOR PALETTE" value={json.cinematography.color_palette} onChange={(v) => update(["cinematography", "color_palette"], v)} />
      <FieldRow label="TONE" value={json.cinematography.tone} onChange={(v) => update(["cinematography", "tone"], v)} />

      <p style={{ ...labelStyle, color: "var(--text-primary)", marginBottom: 8, marginTop: 16 }}>AUDIO</p>
      <FieldRow label="MUSIC" value={json.audio.music} onChange={(v) => update(["audio", "music"], v)} />
      <FieldRow label="AMBIENT" value={json.audio.ambient} onChange={(v) => update(["audio", "ambient"], v)} />
      <FieldRow label="SFX" value={json.audio.sound_effects} onChange={(v) => update(["audio", "sound_effects"], v)} />
      <FieldRow label="MIX LEVEL" value={json.audio.mix_level} onChange={(v) => update(["audio", "mix_level"], v)} />
    </div>
  );
}
