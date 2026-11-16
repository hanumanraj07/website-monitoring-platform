/**
 * Generates an AI-assisted Incident Summary & Root Cause Analysis.
 * Analyzes HTTP error status codes, latency spikes, error messages,
 * and outage duration to provide an executive summary and technical recommendations.
 */
export function generateAiIncidentAnalysis(params: {
  monitorName: string;
  url: string;
  statusCode?: number | null;
  errorMessage?: string | null;
  durationSeconds?: number | null;
  startedAt: Date;
  resolvedAt?: Date | null;
  historicalLatencyMs?: number | null;
}): {
  title: string;
  executiveSummary: string;
  rootCauseAnalysis: string;
  impactLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  recommendedActions: string[];
} {
  const {
    monitorName,
    url,
    statusCode,
    errorMessage,
    durationSeconds,
    startedAt,
    resolvedAt,
    historicalLatencyMs,
  } = params;

  let rca = "";
  let impact: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
  const actions: string[] = [];

  if (statusCode === 500) {
    rca = `Internal Server Error (500) detected on endpoint ${url}. This typically indicates an unhandled exception in the application layer, database connection pool exhaustion, or an upstream microservice crash.`;
    impact = "CRITICAL";
    actions.push("Check application server logs for unhandled stack traces.");
    actions.push("Inspect database query performance and connection pool saturation.");
    actions.push("Verify availability of backing cache (Redis) or third-party dependencies.");
  } else if (statusCode === 502 || statusCode === 504) {
    rca = `Gateway Error (${statusCode}) encountered. The reverse proxy (Nginx/Cloudflare/AWS ALB) failed to establish or maintain a connection with the origin upstream server within the timeout window.`;
    impact = "HIGH";
    actions.push("Inspect upstream backend process status and CPU/Memory usage.");
    actions.push("Review proxy timeout settings and keep-alive socket configs.");
    actions.push("Scale up backend replica instances to handle peak concurrent traffic.");
  } else if (statusCode === 503) {
    rca = `Service Unavailable (503). The server is currently unable to handle the request due to maintenance or excessive concurrent load.`;
    impact = "HIGH";
    actions.push("Confirm if a deployment or database migration was executed at " + startedAt.toLocaleTimeString());
    actions.push("Enable rate limiting or auto-scaling policies to cushion traffic surges.");
  } else if (statusCode === 404) {
    rca = `Not Found (404). The monitored path is missing or was mistakenly routed away after a recent build or API route deprecation.`;
    impact = "MEDIUM";
    actions.push("Verify API routing table and frontend proxy rewrite rules.");
    actions.push("Confirm endpoint URL matches active deployment manifest.");
  } else if (statusCode === 401 || statusCode === 403) {
    rca = `Authentication / Authorization failure (${statusCode}). The health probe's authorization credentials, API keys, or IP allowlist rules were rejected.`;
    impact = "MEDIUM";
    actions.push("Renew expired API tokens or bearer headers configured for this monitor.");
    actions.push("Whitelist the monitoring worker IP in firewall/WAF security groups.");
  } else if (errorMessage?.toLowerCase().includes("timeout")) {
    rca = `Connection Timeout. The endpoint failed to return headers within the configured probe timeout. Prior average latency was ${historicalLatencyMs || "N/A"}ms. Likely caused by server freeze, network packet loss, or heavy garbage collection pause.`;
    impact = "HIGH";
    actions.push("Profile slow database queries and I/O bottlenecks.");
    actions.push("Tune JVM / Node.js GC parameters or increase timeout tolerance.");
  } else {
    rca = `Network Connectivity Interruption: "${errorMessage || "Connection refused"}". The server refused the TCP connection or the DNS name could not be reached.`;
    impact = "HIGH";
    actions.push("Check TLS/SSL certificate validity and expiration dates.");
    actions.push("Verify DNS propagation and network firewall ingress rules.");
  }

  const durationStr = durationSeconds
    ? `${Math.round(durationSeconds / 60)} minutes (${durationSeconds}s)`
    : "Ongoing";

  const executiveSummary = `On ${startedAt.toLocaleDateString()} at ${startedAt.toLocaleTimeString()}, automated monitoring identified an outage on **${monitorName}**. Probe requests experienced an anomaly (${statusCode ? `HTTP ${statusCode}` : errorMessage || "Connection failure"}). The incident lasted approximately ${durationStr}.${resolvedAt ? " Service has now successfully recovered." : " Engineers are currently investigating."}`;

  return {
    title: `AI Root Cause Analysis: Outage on ${monitorName}`,
    executiveSummary,
    rootCauseAnalysis: rca,
    impactLevel: impact,
    recommendedActions: actions,
  };
}
