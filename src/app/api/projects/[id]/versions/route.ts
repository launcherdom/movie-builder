import { NextRequest } from "next/server";
import { db } from "@/db/index";
import { projects, projectVersions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { Story } from "@/types/movie";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const versions = await db
      .select()
      .from(projectVersions)
      .where(eq(projectVersions.projectId, id))
      .orderBy(desc(projectVersions.versionNumber));

    return Response.json({ versions });
  } catch {
    return Response.json({ error: "Failed to fetch versions" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { snapshot, label } = await request.json() as { snapshot: Story; label?: string };

    // Get latest version number
    const existing = await db
      .select({ versionNumber: projectVersions.versionNumber })
      .from(projectVersions)
      .where(eq(projectVersions.projectId, id))
      .orderBy(desc(projectVersions.versionNumber))
      .limit(1);

    const nextVersion = (existing[0]?.versionNumber ?? 0) + 1;

    const versionId = nanoid();
    await db.insert(projectVersions).values({
      id: versionId,
      projectId: id,
      versionNumber: nextVersion,
      label: label ?? `Version ${nextVersion}`,
      snapshotJson: snapshot,
    });

    return Response.json({ id: versionId, versionNumber: nextVersion }, { status: 201 });
  } catch {
    return Response.json({ error: "Failed to create version" }, { status: 500 });
  }
}

// Restore a specific version
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { versionId } = await request.json() as { versionId: string };

    const rows = await db
      .select()
      .from(projectVersions)
      .where(eq(projectVersions.id, versionId));

    if (!rows.length) return Response.json({ error: "Version not found" }, { status: 404 });

    const snapshot = rows[0].snapshotJson as Story;

    // Restore to the project's storyJson
    await db
      .update(projects)
      .set({ storyJson: snapshot, updatedAt: new Date() })
      .where(eq(projects.id, id));

    return Response.json({ story: snapshot });
  } catch {
    return Response.json({ error: "Failed to restore version" }, { status: 500 });
  }
}
