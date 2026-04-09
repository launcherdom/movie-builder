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
  primaryColor?: string;  // ASS color e.g. "&H00FFFFFF"
  outlineColor?: string;  // ASS color e.g. "&H00000000"
  outline?: number;
  fontName?: string;
}

export async function burnSubtitles(
  videoUrl: string,
  srtContent: string,
  projectId?: string,
  opts: BurnOptions = {}
): Promise<string> {
  const {
    fontSize = 12,
    primaryColor = "&H00FFFFFF",
    outlineColor = "&H00000000",
    outline = 2,
    fontName = "Arial",
  } = opts;

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "subtitle-"));
  const videoPath = path.join(tmpDir, "input.mp4");
  const srtPath = path.join(tmpDir, "subtitles.srt");
  const outputPath = path.join(tmpDir, "output.mp4");

  try {
    // Download video
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`Failed to fetch video: ${videoRes.status}`);
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    await fs.writeFile(videoPath, videoBuffer);

    // Write SRT
    await fs.writeFile(srtPath, srtContent, "utf-8");

    // YouTube-style: white text on semi-transparent black box
    const forceStyle = [
      `FontName=${fontName}`,
      `FontSize=${fontSize}`,
      `PrimaryColour=${primaryColor}`,
      `BackColour=&H99000000`,   // semi-transparent black background
      `BorderStyle=3`,           // opaque box (no outline, background instead)
      `Outline=0`,
      `Shadow=0`,
      "Bold=0",
      "Alignment=2",             // center-bottom
      "MarginV=40",
    ].join(",");

    // Escape path for FFmpeg filter (handle colons on Windows if needed)
    const escapedSrt = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:");

    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .videoFilters(`subtitles='${escapedSrt}':force_style='${forceStyle}'`)
        .outputOptions(["-c:a copy"])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });

    // Upload to Vercel Blob
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
