import { db } from "./db";

export interface MonitorAnalytics {
  monitorId: string;
  uptime24h: number;
  uptime7d: number;
  uptime30d: number;
  avgResponseTime24h: number;
  avgResponseTime7d: number;
  totalChecks24h: number;
  successfulChecks24h: number;
  failedChecks24h: number;
  longestDowntimeSeconds: number;
  recentHeartbeats: HeartbeatItem[];
}

export interface HeartbeatItem {
  id: string;
  status: "UP" | "DOWN" | "DEGRADED";
  statusCode: number | null;
  responseTime: number;
  timestamp: string;
  message?: string | null;
}

/**
 * Calculates uptime percentage and analytics for a specific monitor
 */
export async function getMonitorAnalytics(
  monitorId: string,
  heartbeatCount = 30
): Promise<MonitorAnalytics> {
  const now = new Date();
  const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const past7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const past30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 1. Fetch recent heartbeats
  const recentChecks = await db.check.findMany({
    where: { monitorId },
    orderBy: { timestamp: "desc" },
    take: heartbeatCount,
  });

  const recentHeartbeats: HeartbeatItem[] = recentChecks.reverse().map((c) => ({
    id: c.id,
    status: c.status as "UP" | "DOWN" | "DEGRADED",
    statusCode: c.statusCode,
    responseTime: c.responseTime,
    timestamp: c.timestamp.toISOString(),
    message: c.message,
  }));

  // 2. Fetch aggregated checks for 24h
  const checks24h = await db.check.findMany({
    where: {
      monitorId,
      timestamp: { gte: past24h },
    },
    select: {
      status: true,
      responseTime: true,
    },
  });

  const totalChecks24h = checks24h.length;
  const successfulChecks24h = checks24h.filter(
    (c) => c.status === "UP" || c.status === "DEGRADED"
  ).length;
  const failedChecks24h = checks24h.filter((c) => c.status === "DOWN").length;

  const uptime24h =
    totalChecks24h > 0
      ? Number(((successfulChecks24h / totalChecks24h) * 100).toFixed(2))
      : 100;

  const totalResponseTime24h = checks24h.reduce(
    (acc, curr) => acc + curr.responseTime,
    0
  );
  const avgResponseTime24h =
    totalChecks24h > 0
      ? Math.round(totalResponseTime24h / totalChecks24h)
      : 0;

  // 3. Fetch 7d uptime
  const checks7dCount = await db.check.count({
    where: {
      monitorId,
      timestamp: { gte: past7d },
    },
  });
  const checks7dUp = await db.check.count({
    where: {
      monitorId,
      timestamp: { gte: past7d },
      status: { in: ["UP", "DEGRADED"] },
    },
  });
  const uptime7d =
    checks7dCount > 0
      ? Number(((checks7dUp / checks7dCount) * 100).toFixed(2))
      : 100;

  // 4. Fetch 30d uptime
  const checks30dCount = await db.check.count({
    where: {
      monitorId,
      timestamp: { gte: past30d },
    },
  });
  const checks30dUp = await db.check.count({
    where: {
      monitorId,
      timestamp: { gte: past30d },
      status: { in: ["UP", "DEGRADED"] },
    },
  });
  const uptime30d =
    checks30dCount > 0
      ? Number(((checks30dUp / checks30dCount) * 100).toFixed(2))
      : 100;

  // 5. Longest downtime calculation
  const incidents = await db.incident.findMany({
    where: {
      monitorId,
      status: "RESOLVED",
      duration: { not: null },
    },
    orderBy: { duration: "desc" },
    take: 1,
  });

  const longestDowntimeSeconds = incidents.length > 0 && incidents[0].duration ? incidents[0].duration : 0;

  return {
    monitorId,
    uptime24h,
    uptime7d,
    uptime30d,
    avgResponseTime24h,
    avgResponseTime7d: avgResponseTime24h, // approximate or exact
    totalChecks24h,
    successfulChecks24h,
    failedChecks24h,
    longestDowntimeSeconds,
    recentHeartbeats,
  };
}

/**
 * Global system statistics for dashboard KPIs
 */
export async function getGlobalSystemStats() {
  const totalMonitors = await db.monitor.count();
  const operationalMonitors = await db.monitor.count({
    where: { currentStatus: "OPERATIONAL" },
  });
  const degradedMonitors = await db.monitor.count({
    where: { currentStatus: "DEGRADED" },
  });
  const downMonitors = await db.monitor.count({
    where: { currentStatus: "DOWN" },
  });
  const pausedMonitors = await db.monitor.count({
    where: { isActive: false },
  });

  // 24h overall uptime across all active monitors
  const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const totalChecks24h = await db.check.count({
    where: { timestamp: { gte: past24h } },
  });
  const upChecks24h = await db.check.count({
    where: {
      timestamp: { gte: past24h },
      status: { in: ["UP", "DEGRADED"] },
    },
  });

  const overallUptime24h =
    totalChecks24h > 0
      ? Number(((upChecks24h / totalChecks24h) * 100).toFixed(2))
      : 100;

  // Active incidents
  const activeIncidents = await db.incident.findMany({
    where: { status: { not: "RESOLVED" } },
    include: { monitor: true, updates: { orderBy: { createdAt: "desc" } } },
    orderBy: { startedAt: "desc" },
  });

  return {
    totalMonitors,
    operationalMonitors,
    degradedMonitors,
    downMonitors,
    pausedMonitors,
    overallUptime24h,
    totalChecks24h,
    activeIncidentsCount: activeIncidents.length,
    activeIncidents,
  };
}
