import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/maintenance - List maintenance windows
export async function GET() {
  try {
    const windows = await db.maintenanceWindow.findMany({
      include: {
        monitor: { select: { id: true, name: true } },
      },
      orderBy: { startsAt: "desc" },
    });

    return NextResponse.json({ maintenanceWindows: windows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch maintenance windows";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/maintenance - Schedule a maintenance window
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, monitorId, startsAt, endsAt } = body;

    if (!title || !startsAt || !endsAt) {
      return NextResponse.json(
        { error: "Title, start time, and end time are required" },
        { status: 400 }
      );
    }

    const maintenance = await db.maintenanceWindow.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        monitorId: monitorId || null,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        isActive: true,
      },
    });

    return NextResponse.json({ maintenance }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create maintenance window";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
