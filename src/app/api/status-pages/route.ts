import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/status-pages - List all status pages
export async function GET() {
  try {
    const pages = await db.statusPage.findMany({
      include: {
        project: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ pages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch status pages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/status-pages - Create a new status page
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      slug,
      description,
      logoUrl,
      theme = "dark",
      customAnnouncement,
      announcementLevel = "info",
      projectId,
      monitorIds,
    } = body;

    if (!title || !slug) {
      return NextResponse.json(
        { error: "Title and Slug are required" },
        { status: 400 }
      );
    }

    const cleanSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]+/g, "-");

    const existing = await db.statusPage.findUnique({
      where: { slug: cleanSlug },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Status page slug "${cleanSlug}" is already taken` },
        { status: 409 }
      );
    }

    const page = await db.statusPage.create({
      data: {
        title: title.trim(),
        slug: cleanSlug,
        description: description?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
        theme,
        customAnnouncement: customAnnouncement?.trim() || null,
        announcementLevel,
        projectId: projectId || null,
        monitorIds: Array.isArray(monitorIds) ? JSON.stringify(monitorIds) : null,
        isPublic: true,
      },
    });

    return NextResponse.json({ page }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create status page";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
