import sharp from "sharp";
import type { Shot, Scene, Character, VisualStyle } from "@/types/movie";
import { buildStoryboardPrompt, serializeImagePrompt } from "./prompt-builder";

export interface GridLayout {
  cols: number;
  rows: number;
}

export function computeGridLayout(count: number): GridLayout {
  if (count <= 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  if (count <= 4) return { cols: 2, rows: 2 };
  if (count <= 6) return { cols: 3, rows: 2 };
  return { cols: 3, rows: 3 };
}

export function buildGridPrompt(
  shots: Shot[],
  scene: Scene | { description: string },
  characters: Character[],
  visualStyle: VisualStyle,
  styleAnalysis?: string
): string {
  const { cols, rows } = computeGridLayout(shots.length);
  const panelDescriptions = shots.map((shot, i) => {
    const imagePrompt = buildStoryboardPrompt(shot, scene, characters, visualStyle, styleAnalysis);
    const serialized = serializeImagePrompt(imagePrompt);
    return `Panel ${i + 1}: ${serialized}`;
  });

  return (
    `A ${cols}x${rows} uniform grid of ${shots.length} cinematic storyboard panels ` +
    `with clear white borders between panels, each panel the same size. ` +
    panelDescriptions.join(". ") +
    `. Consistent art style across all panels.`
  );
}

export async function splitGridImage(
  buffer: Buffer,
  cols: number,
  rows: number,
  count: number
): Promise<Buffer[]> {
  const meta = await sharp(buffer).metadata();
  const totalW = meta.width ?? 0;
  const totalH = meta.height ?? 0;
  const cellW = Math.floor(totalW / cols);
  const cellH = Math.floor(totalH / rows);

  const cells: Buffer[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx >= count) break;
      const cell = await sharp(buffer)
        .extract({ left: c * cellW, top: r * cellH, width: cellW, height: cellH })
        .png()
        .toBuffer();
      cells.push(cell);
    }
  }
  return cells;
}
