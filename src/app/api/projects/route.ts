import { NextRequest } from "next/server";
import { db } from "@/db/index";
import { projects } from "@/db/schema";
import { nanoid } from "nanoid";
import type { Genre, Tone, AspectRatio, VisualStyle, QualityTier } from "@/types/movie";

export async function GET() {
  try {
    const rows = await db.select().from(projects).orderBy(projects.createdAt);
    return Response.json({ projects: rows });
  } catch {
    return Response.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      concept: string;
      genre: Genre;
      tone: Tone;
      targetDuration: number;
      aspectRatio: AspectRatio;
      visualStyle: VisualStyle;
      qualityTier?: QualityTier;
    };

    const id = nanoid();
    await db.insert(projects).values({
      id,
      concept: body.concept,
      genre: body.genre,
      tone: body.tone,
      targetDuration: body.targetDuration,
      aspectRatio: body.aspectRatio,
      visualStyle: body.visualStyle,
      qualityTier: body.qualityTier ?? "draft",
      currentStep: "prompt",
    });

    return Response.json({ id }, { status: 201 });
  } catch {
    return Response.json({ error: "Failed to create project" }, { status: 500 });
  }
}
