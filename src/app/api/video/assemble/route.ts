import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

interface ClipSpec {
  url: string;
  duration: number;
}

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const { clips, projectId } = await request.json() as {
      clips: ClipSpec[];
      projectId: string;
    };

    if (!clips?.length) {
      return Response.json({ error: "clips array is required" }, { status: 400 });
    }

    const ffmpeg = new FFmpeg();
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    const inputs: string[] = [];
    for (let i = 0; i < clips.length; i++) {
      const name = `clip${i}.mp4`;
      await ffmpeg.writeFile(name, await fetchFile(clips[i].url));
      inputs.push(name);
    }

    const concatList = inputs.map((f) => `file '${f}'`).join("\n");
    await ffmpeg.writeFile("list.txt", concatList);

    await ffmpeg.exec([
      "-f", "concat",
      "-safe", "0",
      "-i", "list.txt",
      "-c", "copy",
      "output.mp4",
    ]);

    const data = await ffmpeg.readFile("output.mp4");
    const buffer = Buffer.from(data as Uint8Array);

    const blob = await put(`movies/${projectId}/assembled.mp4`, buffer, {
      access: "public",
      contentType: "video/mp4",
    });

    return Response.json({ url: blob.url });
  } catch (error) {
    console.error("Assembly error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Assembly failed" },
      { status: 500 }
    );
  }
}
