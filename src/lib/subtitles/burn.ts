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

function parseSrtTime(ts: string): number {
  const [hms, ms] = ts.trim().split(",");
  const [h, m, s] = hms.split(":").map(Number);
  return h * 3600 + m * 60 + s + Number(ms) / 1000;
}

function srtToDrawtextFilter(srtContent: string, fontPath: string, fontSize = 12): string {
  const esc = (t: string) =>
    t.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/:/g, "\\:").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
  // fontfile path also needs colon escaping for FFmpeg filter syntax
  const escapedFont = fontPath.replace(/\\/g, "\\\\").replace(/:/g, "\\:");

  const filters = srtContent
    .trim()
    .split(/\n\n+/)
    .map((block) => {
      const lines = block.trim().split("\n");
      if (lines.length < 3) return null;
      const times = lines[1].split("-->");
      if (times.length < 2) return null;
      const start = parseSrtTime(times[0]).toFixed(3);
      const end = parseSrtTime(times[1]).toFixed(3);
      const text = esc(lines.slice(2).join(" "));
      return `drawtext=fontfile='${escapedFont}':text='${text}':enable='between(t,${start},${end})':fontsize=${fontSize}:fontcolor=white:box=1:boxcolor=0x00000099:boxborderw=8:x=(w-tw)/2:y=h-th-50`;
    })
    .filter(Boolean);

  return filters.join(",");
}

export async function burnSubtitles(
  videoUrl: string,
  srtContent: string,
  projectId?: string,
  options: BurnOptions = {}
): Promise<string> {
  const fontSize = options.fontSize ?? 12;
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "subtitle-"));
  const videoPath = path.join(tmpDir, "input.mp4");
  const outputPath = path.join(tmpDir, "output.mp4");

  try {
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`Failed to fetch video: ${videoRes.status}`);
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    await fs.writeFile(videoPath, videoBuffer);

    // Font bundled in public/fonts — accessible via filesystem in Vercel serverless
    const fontPath = path.join(process.cwd(), "public", "fonts", "DejaVuSans.ttf");
    const vf = srtToDrawtextFilter(srtContent, fontPath, fontSize);
    if (!vf) throw new Error("No subtitle entries found in SRT");

    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .videoFilters(vf)
        .outputOptions([
          "-map", "0:v:0",
          "-map", "0:a:0?",
          "-c:a", "copy",
        ])
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
