import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateUrlForSSRF } from "@/lib/ssrf";
import { getMonitorAnalytics } from "@/lib/analytics";

export const dynamic = "force-dynamic";

// GET /api/monitors/[id] - Detailed monitor data
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const monitor = await db.monitor.findUnique({
      where: { id: params.id },
      include: {
        project: true,
        maintenanceWindows: {
          orderBy: { startsAt: "desc" },
          take: 5,
        },
        incidents: {
          orderBy: { startedAt: "desc" },
          take: 10,
          include: {
            updates: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!monitor) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
    }

    const analytics = await getMonitorAnalytics(params.id, 50);

    // Fetch last 100 checks for the response time chart
    const chartChecks = await db.check.findMany({
      where: { monitorId: params.id },
      orderBy: { timestamp: "desc" },
      take: 60,
      select: {
        id: true,
        status: true,
        statusCode: true,
        responseTime: true,
        timestamp: true,
      },
    });

    return NextResponse.json({
      monitor,
      analytics,
      chartData: chartChecks.reverse(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch monitor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/monitors/[id] - Update monitor configuration or pause/resume
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const existing = await db.monitor.findUnique({ where: { id: params.id } });

    if (!existing) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
    }

    // If URL is changed, validate SSRF
    if (body.url && body.url !== existing.url) {
      const allowLocalMock =
        process.env.ALLOW_LOCAL_MOCK === "true" ||
        process.env.NODE_ENV === "development";
      const ssrf = await validateUrlForSSRF(body.url, allowLocalMock);
      if (!ssrf.isValid) {
        return NextResponse.json(
          { error: `URL validation failed (SSRF Protection): ${ssrf.reason}` },
          { status: 422 }
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataToUpdate: any = {};
    if (body.name !== undefined) dataToUpdate.name = body.name.trim();
    if (body.url !== undefined) dataToUpdate.url = body.url.trim();
    if (body.description !== undefined) dataToUpdate.description = body.description?.trim() || null;
    if (body.type !== undefined) dataToUpdate.type = body.type;
    if (body.method !== undefined) dataToUpdate.method = body.method.toUpperCase();
    if (body.headers !== undefined) dataToUpdate.headers = body.headers;
    if (body.body !== undefined) dataToUpdate.body = body.body;
    if (body.expectedStatusCode !== undefined) dataToUpdate.expectedStatusCode = Number(body.expectedStatusCode);
    if (body.keyword !== undefined) dataToUpdate.keyword = body.keyword?.trim() || null;
    if (body.interval !== undefined) dataToUpdate.interval = Number(body.interval);
    if (body.timeout !== undefined) dataToUpdate.timeout = Number(body.timeout);
    if (body.degradedThreshold !== undefined) dataToUpdate.degradedThreshold = Number(body.degradedThreshold);
    if (body.projectId !== undefined) dataToUpdate.projectId = body.projectId || null;
    if (body.isActive !== undefined) {
      dataToUpdate.isActive = Boolean(body.isActive);
      if (!dataToUpdate.isActive) {
        dataToUpdate.currentStatus = "PAUSED";
      } else if (existing.currentStatus === "PAUSED") {
        dataToUpdate.currentStatus = "PENDING";
      }
    }

    const updated = await db.monitor.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      message: "Monitor updated successfully",
      monitor: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update monitor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/monitors/[id] - Remove monitor
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.monitor.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "Monitor deleted successfully",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete monitor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
