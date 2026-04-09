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

export async function burnSubtitles(
  videoUrl: string,
  srtContent: string,
  projectId?: string,
  _options: BurnOptions = {}
): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "subtitle-"));
  const videoPath = path.join(tmpDir, "input.mp4");
  const srtPath = path.join(tmpDir, "subs.srt");
  const outputPath = path.join(tmpDir, "output.mp4");

  try {
    // Download video
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`Failed to fetch video: ${videoRes.status}`);
    await fs.writeFile(videoPath, Buffer.from(await videoRes.arrayBuffer()));

    // Write SRT file — libass reads it directly, no text escaping needed
    await fs.writeFile(srtPath, srtContent, "utf8");

    // Copy Korean-capable font into tmpDir so libass can find it via fontsdir
    const fontSrc = path.join(process.cwd(), "public", "fonts", "NanumGothic.ttf");
    await fs.copyFile(fontSrc, path.join(tmpDir, "NanumGothic.ttf"));

    // Escape path for FFmpeg filter syntax (colons must be escaped)
    const escapedSrt = srtPath.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
    const escapedFontsDir = tmpDir.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");

    const vf = `subtitles='${escapedSrt}':fontsdir='${escapedFontsDir}'`;

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
