import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMonitorAnalytics } from "@/lib/analytics";

export const dynamic = "force-dynamic";

// GET /api/status-pages/[slug] - Fetch public status page data
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const page = await db.statusPage.findUnique({
      where: { slug: params.slug },
      include: {
        project: {
          include: {
            monitors: {
              where: { isActive: true },
              orderBy: { name: "asc" },
            },
          },
        },
      },
    });

    if (!page) {
      return NextResponse.json(
        { error: "Status page not found" },
        { status: 404 }
      );
    }

    // Determine which monitors belong to this status page
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let monitors: any[] = [];
    if (page.monitorIds) {
      try {
        const allowedIds: string[] = JSON.parse(page.monitorIds);
        monitors = await db.monitor.findMany({
          where: { id: { in: allowedIds }, isActive: true },
          orderBy: { name: "asc" },
          include: { project: true },
        });
      } catch {
        monitors = [];
      }
    } else if (page.project) {
      monitors = page.project.monitors;
    } else {
      // Default: show all active monitors
      monitors = await db.monitor.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: { project: true },
      });
    }

    // Enrich each monitor with uptime bars and 30d uptime %
    const enrichedServices = await Promise.all(
      monitors.map(async (m) => {
        const analytics = await getMonitorAnalytics(m.id, 45);

        // Group checks by day for the 30-day timeline
        const days = 30;
        const dailyUptimes: { date: string; status: "UP" | "DOWN" | "DEGRADED" | "NONE"; uptimePct: number }[] = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
          const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0);
          const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59);

          const dayChecks = await db.check.findMany({
            where: {
              monitorId: m.id,
              timestamp: { gte: dayStart, lte: dayEnd },
            },
            select: { status: true },
          });

          if (dayChecks.length === 0) {
            dailyUptimes.push({
              date: dayStart.toISOString().split("T")[0],
              status: "NONE",
              uptimePct: 100,
            });
          } else {
            const upCount = dayChecks.filter((c) => c.status === "UP" || c.status === "DEGRADED").length;
            const pct = Math.round((upCount / dayChecks.length) * 100);
            let dayStatus: "UP" | "DOWN" | "DEGRADED" = "UP";
            if (pct < 90) dayStatus = "DOWN";
            else if (pct < 99) dayStatus = "DEGRADED";

            dailyUptimes.push({
              date: dayStart.toISOString().split("T")[0],
              status: dayStatus,
              uptimePct: pct,
            });
          }
        }

        return {
          id: m.id,
          name: m.name,
          url: m.url,
          description: m.description,
          currentStatus: m.currentStatus,
          lastResponseTime: m.lastResponseTime,
          uptime24h: analytics.uptime24h,
          uptime30d: analytics.uptime30d,
          dailyUptimes,
        };
      })
    );

    // Compute overall system status:
    // If any service is DOWN -> Major Outage or Partial Outage
    // If any service is DEGRADED -> Degraded Performance
    // Otherwise -> All Systems Operational
    const downCount = enrichedServices.filter((s) => s.currentStatus === "DOWN").length;
    const degradedCount = enrichedServices.filter((s) => s.currentStatus === "DEGRADED").length;

    let overallStatus: "OPERATIONAL" | "DEGRADED" | "PARTIAL_OUTAGE" | "MAJOR_OUTAGE" = "OPERATIONAL";
    if (downCount > 1) {
      overallStatus = "MAJOR_OUTAGE";
    } else if (downCount === 1) {
      overallStatus = "PARTIAL_OUTAGE";
    } else if (degradedCount > 0) {
      overallStatus = "DEGRADED";
    }

    // Active & recent incidents for these services
    const monitorIdsList = enrichedServices.map((s) => s.id);
    const activeIncidents = await db.incident.findMany({
      where: {
        monitorId: { in: monitorIdsList },
        status: { not: "RESOLVED" },
      },
      include: {
        monitor: { select: { id: true, name: true } },
        updates: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { startedAt: "desc" },
    });

    const pastIncidents = await db.incident.findMany({
      where: {
        monitorId: { in: monitorIdsList },
        status: "RESOLVED",
      },
      include: {
        monitor: { select: { id: true, name: true } },
        updates: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { startedAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      statusPage: page,
      overallStatus,
      services: enrichedServices,
      activeIncidents,
      pastIncidents,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load status page";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/status-pages/[slug] - Update status page details
export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json();
    const existing = await db.statusPage.findUnique({
      where: { slug: params.slug },
    });

    if (!existing) {
      return NextResponse.json({ error: "Status page not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataToUpdate: any = {};
    if (body.title) dataToUpdate.title = body.title.trim();
    if (body.description !== undefined) dataToUpdate.description = body.description?.trim() || null;
    if (body.customAnnouncement !== undefined) dataToUpdate.customAnnouncement = body.customAnnouncement?.trim() || null;
    if (body.announcementLevel) dataToUpdate.announcementLevel = body.announcementLevel;
    if (body.theme) dataToUpdate.theme = body.theme;
    if (body.isPublic !== undefined) dataToUpdate.isPublic = Boolean(body.isPublic);
    if (body.monitorIds !== undefined) {
      dataToUpdate.monitorIds = Array.isArray(body.monitorIds)
        ? JSON.stringify(body.monitorIds)
        : null;
    }

    const updated = await db.statusPage.update({
      where: { id: existing.id },
      data: dataToUpdate,
    });

    return NextResponse.json({ page: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update status page";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
