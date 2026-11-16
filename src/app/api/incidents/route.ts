import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateAiIncidentAnalysis } from "@/lib/ai";

export const dynamic = "force-dynamic";

// GET /api/incidents - List incidents with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monitorId = searchParams.get("monitorId");
    const status = searchParams.get("status");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (monitorId) where.monitorId = monitorId;
    if (status && status !== "ALL") where.status = status;

    const incidents = await db.incident.findMany({
      where,
      include: {
        monitor: { select: { id: true, name: true, url: true } },
        updates: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { startedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ incidents });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch incidents";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/incidents - Manually log an incident
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { monitorId, title, description, severity = "MAJOR", status = "INVESTIGATING" } = body;

    if (!monitorId || !title) {
      return NextResponse.json(
        { error: "Monitor ID and Title are required" },
        { status: 400 }
      );
    }

    const monitor = await db.monitor.findUnique({ where: { id: monitorId } });
    if (!monitor) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
    }

    const incident = await db.incident.create({
      data: {
        monitorId,
        title: title.trim(),
        description: description?.trim() || null,
        severity,
        status,
        autoCreated: false,
        updates: {
          create: {
            status,
            message: description?.trim() || "Incident created manually by operator.",
          },
        },
      },
      include: {
        updates: true,
        monitor: true,
      },
    });

    return NextResponse.json({ incident }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create incident";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
