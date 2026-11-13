import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateUrlForSSRF } from "@/lib/ssrf";
import { executeCheck } from "@/lib/checker";
import { getMonitorAnalytics } from "@/lib/analytics";

export const dynamic = "force-dynamic";

// GET /api/monitors - List all monitors with latest analytics and heartbeats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (status && status !== "ALL") where.currentStatus = status;

    const monitors = await db.monitor.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, slug: true } },
        checks: {
          orderBy: { timestamp: "desc" },
          take: 30,
          select: {
            id: true,
            status: true,
            statusCode: true,
            responseTime: true,
            timestamp: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute basic analytics for each monitor
    const enrichedMonitors = await Promise.all(
      monitors.map(async (m) => {
        const analytics = await getMonitorAnalytics(m.id, 25);
        return {
          ...m,
          recentHeartbeats: analytics.recentHeartbeats,
          uptime24h: analytics.uptime24h,
          uptime30d: analytics.uptime30d,
          avgResponseTime24h: analytics.avgResponseTime24h,
          longestDowntimeSeconds: analytics.longestDowntimeSeconds,
        };
      })
    );

    return NextResponse.json({ monitors: enrichedMonitors });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch monitors";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/monitors - Register a new website or API endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      url,
      description,
      type = "HTTP",
      method = "GET",
      headers,
      requestBody,
      expectedStatusCode = 200,
      keyword,
      interval = 60,
      timeout = 10000,
      degradedThreshold = 1500,
      projectId,
    } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Monitor name is required." },
        { status: 400 }
      );
    }

    if (!url || typeof url !== "string" || url.trim() === "") {
      return NextResponse.json(
        { error: "Endpoint URL is required." },
        { status: 400 }
      );
    }

    // SSRF Validation & restriction
    const allowLocalMock =
      process.env.ALLOW_LOCAL_MOCK === "true" ||
      process.env.NODE_ENV === "development";
    const ssrf = await validateUrlForSSRF(url, allowLocalMock);

    if (!ssrf.isValid) {
      return NextResponse.json(
        {
          error: `URL validation failed (SSRF Protection): ${ssrf.reason}`,
        },
        { status: 422 }
      );
    }

    // Normalize headers string
    let headersString: string | null = null;
    if (headers) {
      if (typeof headers === "string") {
        try {
          JSON.parse(headers);
          headersString = headers;
        } catch {
          return NextResponse.json(
            { error: "Headers must be valid JSON." },
            { status: 400 }
          );
        }
      } else if (typeof headers === "object") {
        headersString = JSON.stringify(headers);
      }
    }

    const newMonitor = await db.monitor.create({
      data: {
        name: name.trim(),
        url: url.trim(),
        description: description?.trim() || null,
        type,
        method: method.toUpperCase(),
        headers: headersString,
        body: requestBody || null,
        expectedStatusCode: Number(expectedStatusCode) || 200,
        keyword: keyword?.trim() || null,
        interval: Number(interval) || 60,
        timeout: Number(timeout) || 10000,
        degradedThreshold: Number(degradedThreshold) || 1500,
        projectId: projectId || null,
        currentStatus: "PENDING",
      },
      include: {
        project: true,
      },
    });

    // Run immediate initial check in background
    executeCheck(newMonitor.id).catch((err) =>
      console.error("Initial check error:", err)
    );

    return NextResponse.json(
      {
        success: true,
        message: "Monitor created successfully",
        monitor: newMonitor,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create monitor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
