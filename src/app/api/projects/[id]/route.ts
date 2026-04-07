import { NextRequest } from "next/server";
import { db } from "@/db/index";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Story, PipelineStep, Genre, Tone, AspectRatio, VisualStyle, QualityTier } from "@/types/movie";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rows = await db.select().from(projects).where(eq(projects.id, id));
    if (!rows.length) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ project: rows[0] });
  } catch {
    return Response.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as {
      story?: Story;
      currentStep?: PipelineStep;
      concept?: string;
      genre?: Genre;
      tone?: Tone;
      targetDuration?: number;
      aspectRatio?: AspectRatio;
      visualStyle?: VisualStyle;
      qualityTier?: QualityTier;
    };

    await db
      .update(projects)
      .set({
        ...(body.story !== undefined && { storyJson: body.story }),
        ...(body.currentStep !== undefined && { currentStep: body.currentStep }),
        ...(body.concept !== undefined && { concept: body.concept }),
        ...(body.genre !== undefined && { genre: body.genre }),
        ...(body.tone !== undefined && { tone: body.tone }),
        ...(body.targetDuration !== undefined && { targetDuration: body.targetDuration }),
        ...(body.aspectRatio !== undefined && { aspectRatio: body.aspectRatio }),
        ...(body.visualStyle !== undefined && { visualStyle: body.visualStyle }),
        ...(body.qualityTier !== undefined && { qualityTier: body.qualityTier }),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id));

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(projects).where(eq(projects.id, id));
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
