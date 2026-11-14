import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGlobalSystemStats } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getGlobalSystemStats();

    // Fetch response-time trends across top active monitors (last 20 checks each)
    const activeMonitors = await db.monitor.findMany({
      where: { isActive: true },
      take: 6,
      select: {
        id: true,
        name: true,
        currentStatus: true,
        lastResponseTime: true,
        checks: {
          orderBy: { timestamp: "desc" },
          take: 15,
          select: {
            responseTime: true,
            status: true,
            timestamp: true,
          },
        },
      },
    });

    // Recent 10 incidents
    const recentIncidents = await db.incident.findMany({
      orderBy: { startedAt: "desc" },
      take: 8,
      include: {
        monitor: { select: { id: true, name: true, url: true } },
        updates: { orderBy: { createdAt: "desc" }, take: 2 },
      },
    });

    return NextResponse.json({
      stats,
      monitorsSummary: activeMonitors,
      recentIncidents,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to load dashboard data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
