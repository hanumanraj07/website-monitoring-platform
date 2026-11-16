import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateAiIncidentAnalysis } from "@/lib/ai";

export const dynamic = "force-dynamic";

// GET /api/incidents/[id] - Get incident details & timeline
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const incident = await db.incident.findUnique({
      where: { id: params.id },
      include: {
        monitor: true,
        updates: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    return NextResponse.json({ incident });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch incident";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/incidents/[id] - Update status, add progress note, or resolve
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, severity, updateMessage, title, description } = body;

    const existing = await db.incident.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataToUpdate: any = {};
    if (title) dataToUpdate.title = title;
    if (description !== undefined) dataToUpdate.description = description;
    if (severity) dataToUpdate.severity = severity;

    if (status && status !== existing.status) {
      dataToUpdate.status = status;
      if (status === "RESOLVED" && !existing.resolvedAt) {
        const now = new Date();
        dataToUpdate.resolvedAt = now;
        dataToUpdate.duration = Math.round(
          (now.getTime() - existing.startedAt.getTime()) / 1000
        );
      }
    }

    // If updateMessage provided, create an IncidentUpdate
    if (updateMessage && updateMessage.trim() !== "") {
      dataToUpdate.updates = {
        create: {
          status: status || existing.status,
          message: updateMessage.trim(),
        },
      };
    }

    const updated = await db.incident.update({
      where: { id: params.id },
      data: dataToUpdate,
      include: {
        updates: { orderBy: { createdAt: "desc" } },
        monitor: true,
      },
    });

    return NextResponse.json({ incident: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update incident";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/incidents/[id] - Delete incident
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.incident.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: "Incident deleted" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete incident";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
