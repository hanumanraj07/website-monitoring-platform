import { db } from "./db";
import { validateUrlForSSRF } from "./ssrf";

// Lock set to prevent overlapping checks for the same monitor
const activeChecks = new Set<string>();

export interface CheckExecutionResult {
  monitorId: string;
  status: "UP" | "DOWN" | "DEGRADED";
  statusCode: number | null;
  responseTime: number;
  message: string;
  errorMessage?: string | null;
  timestamp: Date;
}

/**
 * Executes a monitoring check for a single monitor.
 * Respects SSRF boundaries, handles timeout, evaluates status,
 * tracks incidents (auto-create on outage, auto-resolve on recovery),
 * and persists results.
 */
export async function executeCheck(
  monitorId: string,
  force = false
): Promise<CheckExecutionResult> {
  if (activeChecks.has(monitorId) && !force) {
    throw new Error(`Check already in progress for monitor ${monitorId}`);
  }

  activeChecks.add(monitorId);
  const startTime = Date.now();

  try {
    const monitor = await db.monitor.findUnique({
      where: { id: monitorId },
      include: {
        maintenanceWindows: {
          where: {
            isActive: true,
            startsAt: { lte: new Date() },
            endsAt: { gte: new Date() },
          },
        },
      },
    });

    if (!monitor) {
      throw new Error(`Monitor ${monitorId} not found`);
    }

    // If monitor is in maintenance, we record it or skip alert
    const isInMaintenance = monitor.maintenanceWindows.length > 0;

    // SSRF Validation
    // Allow local mock endpoints if configured or if in development
    const allowLocalMock =
      process.env.ALLOW_LOCAL_MOCK === "true" ||
      process.env.NODE_ENV === "development";
    const ssrfResult = await validateUrlForSSRF(monitor.url, allowLocalMock);

    if (!ssrfResult.isValid) {
      const result: CheckExecutionResult = {
        monitorId,
        status: "DOWN",
        statusCode: null,
        responseTime: Date.now() - startTime,
        message: "SSRF validation failed",
        errorMessage: ssrfResult.reason || "URL violates SSRF security policy",
        timestamp: new Date(),
      };
      await recordCheckResult(monitor, result, isInMaintenance);
      return result;
    }

    // Parse custom headers if any
    let parsedHeaders: Record<string, string> = {
      "User-Agent": "PulseWatch-Monitor/1.0 (+https://github.com/status-pulse)",
      Accept: "*/*",
    };
    if (monitor.headers) {
      try {
        const custom = JSON.parse(monitor.headers);
        parsedHeaders = { ...parsedHeaders, ...custom };
      } catch {
        // ignore invalid json headers
      }
    }

    // Set up request with timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), monitor.timeout || 10000);

    let statusCode: number | null = null;
    let responseTime = 0;
    let status: "UP" | "DOWN" | "DEGRADED" = "DOWN";
    let message = "";
    let errorMessage: string | null = null;

    const requestStart = performance.now();

    try {
      const response = await fetch(monitor.url, {
        method: monitor.method || "GET",
        headers: parsedHeaders,
        body:
          monitor.method !== "GET" && monitor.method !== "HEAD" && monitor.body
            ? monitor.body
            : undefined,
        signal: controller.signal,
        redirect: "follow",
        cache: "no-store",
      });

      clearTimeout(timeoutId);
      const requestEnd = performance.now();
      responseTime = Math.round(requestEnd - requestStart);
      statusCode = response.status;

      const expectedCode = monitor.expectedStatusCode || 200;
      let keywordPassed = true;

      // If keyword check is requested, read a portion of the response body
      if (monitor.keyword && monitor.keyword.trim() !== "") {
        try {
          const bodyText = await response.text();
          if (!bodyText.includes(monitor.keyword.trim())) {
            keywordPassed = false;
            errorMessage = `Keyword "${monitor.keyword}" not found in response`;
          }
        } catch {
          keywordPassed = false;
          errorMessage = "Failed to read response body for keyword check";
        }
      }

      // Check conditions:
      // Status code matches expected (or 2xx if default 200)
      const codeMatches =
        statusCode === expectedCode ||
        (expectedCode === 200 && statusCode >= 200 && statusCode < 300);

      if (codeMatches && keywordPassed) {
        if (monitor.degradedThreshold && responseTime > monitor.degradedThreshold) {
          status = "DEGRADED";
          message = `Operational but degraded latency: ${responseTime}ms (> ${monitor.degradedThreshold}ms threshold)`;
        } else {
          status = "UP";
          message = `HTTP ${statusCode} OK (${responseTime}ms)`;
        }
      } else {
        status = "DOWN";
        if (!codeMatches) {
          errorMessage = `HTTP status code ${statusCode} does not match expected ${expectedCode}`;
        }
        message = errorMessage || `HTTP ${statusCode} error`;
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const requestEnd = performance.now();
      responseTime = Math.round(requestEnd - requestStart);
      status = "DOWN";

      if (err instanceof Error) {
        if (err.name === "AbortError") {
          errorMessage = `Request timed out after ${monitor.timeout || 10000}ms`;
        } else {
          errorMessage = err.message || "Network connection failed";
        }
      } else {
        errorMessage = "Unknown network error";
      }
      message = errorMessage;
    }

    const checkResult: CheckExecutionResult = {
      monitorId,
      status,
      statusCode,
      responseTime,
      message,
      errorMessage,
      timestamp: new Date(),
    };

    await recordCheckResult(monitor, checkResult, isInMaintenance);
    return checkResult;
  } finally {
    activeChecks.delete(monitorId);
  }
}

/**
 * Persists the check result and updates incident lifecycle & monitor status
 */
async function recordCheckResult(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  monitor: any,
  result: CheckExecutionResult,
  isInMaintenance: boolean
) {
  const currentMonitorStatus =
    result.status === "UP"
      ? "OPERATIONAL"
      : result.status === "DEGRADED"
      ? "DEGRADED"
      : "DOWN";

  // 1. Create Check record
  await db.check.create({
    data: {
      monitorId: monitor.id,
      status: result.status,
      statusCode: result.statusCode,
      responseTime: result.responseTime,
      message: result.message,
      errorMessage: result.errorMessage,
      timestamp: result.timestamp,
    },
  });

  // 2. Incident Management lifecycle:
  // Find any active (unresolved) incident for this monitor
  const activeIncident = await db.incident.findFirst({
    where: {
      monitorId: monitor.id,
      status: { not: "RESOLVED" },
    },
    orderBy: { startedAt: "desc" },
  });

  if (result.status === "DOWN") {
    // If not in maintenance and no open incident, create a new incident
    if (!activeIncident && !isInMaintenance) {
      await db.incident.create({
        data: {
          monitorId: monitor.id,
          title: `Service Outage: ${monitor.name} is Down`,
          description:
            result.errorMessage ||
            `Automated check detected endpoint failure with status ${
              result.statusCode ?? "Connection Error"
            }.`,
          status: "INVESTIGATING",
          severity: "CRITICAL",
          startedAt: result.timestamp,
          autoCreated: true,
          updates: {
            create: {
              status: "INVESTIGATING",
              message: `Automated detection: ${
                result.errorMessage || `Endpoint returned HTTP ${result.statusCode}`
              }. Investigating root cause.`,
            },
          },
        },
      });
    }
  } else if (result.status === "UP" || result.status === "DEGRADED") {
    // Service recovered! Resolve active incident if present
    if (activeIncident) {
      const resolvedAt = result.timestamp;
      const durationSeconds = Math.round(
        (resolvedAt.getTime() - activeIncident.startedAt.getTime()) / 1000
      );

      // Auto-generate AI incident summary
      const aiSummary = generateAutoIncidentSummary(
        monitor.name,
        activeIncident.startedAt,
        resolvedAt,
        durationSeconds,
        activeIncident.description || "Unreachable endpoint"
      );

      await db.incident.update({
        where: { id: activeIncident.id },
        data: {
          status: "RESOLVED",
          resolvedAt,
          duration: durationSeconds,
          aiSummary,
          updates: {
            create: {
              status: "RESOLVED",
              message: `Service automatically recovered. Endpoint responding with HTTP ${result.statusCode} (${result.responseTime}ms). Total downtime: ${formatDuration(durationSeconds)}.`,
            },
          },
        },
      });
    }
  }

  // 3. Update Monitor state
  await db.monitor.update({
    where: { id: monitor.id },
    data: {
      currentStatus: currentMonitorStatus,
      lastCheckAt: result.timestamp,
      lastResponseTime: result.responseTime,
      lastStatusCode: result.statusCode,
      lastErrorMessage: result.errorMessage,
      inMaintenance: isInMaintenance,
    },
  });
}

/**
 * Runs scheduled checks for all active monitors that are due for a check
 */
export async function runScheduledChecks() {
  const startTime = Date.now();
  const now = new Date();

  // Find all active monitors
  const monitors = await db.monitor.findMany({
    where: { isActive: true },
  });

  const dueMonitors = monitors.filter((m) => {
    if (!m.lastCheckAt) return true;
    const intervalMs = (m.interval || 60) * 1000;
    return now.getTime() - new Date(m.lastCheckAt).getTime() >= intervalMs;
  });

  const results: CheckExecutionResult[] = [];
  const errors: { monitorId: string; error: string }[] = [];

  // Execute checks with controlled concurrency (up to 5 concurrent checks)
  const batchSize = 5;
  for (let i = 0; i < dueMonitors.length; i += batchSize) {
    const chunk = dueMonitors.slice(i, i + batchSize);
    const chunkPromises = chunk.map(async (m) => {
      try {
        const res = await executeCheck(m.id);
        results.push(res);
      } catch (err: unknown) {
        errors.push({
          monitorId: m.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });
    await Promise.allSettled(chunkPromises);
  }

  const durationMs = Date.now() - startTime;
  const upCount = results.filter((r) => r.status === "UP").length;
  const downCount = results.filter((r) => r.status === "DOWN").length;
  const degradedCount = results.filter((r) => r.status === "DEGRADED").length;

  return {
    monitorsTotal: monitors.length,
    dueMonitorsCount: dueMonitors.length,
    executedCount: results.length,
    upCount,
    downCount,
    degradedCount,
    errorsCount: errors.length,
    errors,
    durationMs,
  };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSecs}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
}

function generateAutoIncidentSummary(
  monitorName: string,
  startedAt: Date,
  resolvedAt: Date,
  durationSecs: number,
  initialError: string
): string {
  return `### AI Incident Post-Mortem & Summary
**Target Service:** ${monitorName}
**Outage Window:** ${startedAt.toISOString()} to ${resolvedAt.toISOString()}
**Total Outage Duration:** ${formatDuration(durationSecs)} (${durationSecs} seconds)

**Root Cause Analysis:**
The automated monitoring daemon observed availability failure: "${initialError}". 
The service stopped responding to health probes within the configured timeout threshold.

**Resolution:**
The service successfully recovered. Subsequent HTTP probes returned valid status codes and acceptable latencies. Full service availability has been restored.`;
}
