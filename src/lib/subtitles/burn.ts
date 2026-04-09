import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import os from "os";
import path from "path";
import fs from "fs/promises";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export interface BurnOptions {
  fontSize?: number;
}

function srtTimestampToAss(ts: string): string {
  // SRT: 00:00:01,500  →  ASS: 0:00:01.50
  const clean = ts.trim().replace(",", ".");
  const [hms, ms2] = clean.split(".");
  const centiseconds = Math.round(Number("0." + (ms2 ?? "0")) * 100).toString().padStart(2, "0");
  return `${hms}.${centiseconds}`;
}

function srtToAss(srtContent: string, fontName: string, fontSize: number): string {
  // YouTube-style: white text, semi-transparent dark opaque-box background
  // ASS alpha: 00=opaque, FF=transparent
  const header = `[Script Info]
ScriptType: v4.00+
Collisions: Normal
PlayResX: 720
PlayResY: 1280

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,3,0,0,2,20,20,50,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const blocks = srtContent.trim().split(/\n\n+/);
  const dialogues = blocks
    .map((block) => {
      const lines = block.trim().split("\n");
      if (lines.length < 3) return null;
      const times = lines[1].split("-->");
      if (times.length < 2) return null;
      const start = srtTimestampToAss(times[0]);
      const end = srtTimestampToAss(times[1]);
      const text = lines.slice(2).join("\\N");
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
    })
    .filter(Boolean);

  return `${header}\n${dialogues.join("\n")}`;
}

export async function burnSubtitles(
  videoUrl: string,
  srtContent: string,
  projectId?: string,
  _options: BurnOptions = {}
): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "subtitle-"));
  const videoPath = path.join(tmpDir, "input.mp4");
  const assPath = path.join(tmpDir, "subs.ass");
  const outputPath = path.join(tmpDir, "output.mp4");

  try {
    // Download video
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`Failed to fetch video: ${videoRes.status}`);
    await fs.writeFile(videoPath, Buffer.from(await videoRes.arrayBuffer()));

    // Copy font into tmpDir
    const fontSrc = path.join(process.cwd(), "public", "fonts", "NanumGothic.ttf");
    await fs.copyFile(fontSrc, path.join(tmpDir, "NanumGothic.ttf"));

    // Convert SRT → ASS with full style control (BorderStyle=3 = opaque box)
    const assContent = srtToAss(srtContent, "NanumGothic", 9);
    await fs.writeFile(assPath, assContent, "utf8");

    // Escape path for FFmpeg filter syntax
    const escapedAss = assPath.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
    const escapedFontsDir = tmpDir.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");

    const vf = `ass='${escapedAss}':fontsdir='${escapedFontsDir}'`;

    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions(["-vf", vf, "-c:a", "copy"])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
        .run();
    });

    const outputBuffer = await fs.readFile(outputPath);
    const filename = `${projectId ?? "project"}/subtitled/${nanoid(10)}.mp4`;
    const blob = await put(filename, outputBuffer, {
      access: "public",
      contentType: "video/mp4",
    });

    return blob.url;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}
