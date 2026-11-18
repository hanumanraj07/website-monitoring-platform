import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Seeding PulseWatch database...");

  // Clean existing records
  await db.check.deleteMany();
  await db.incidentUpdate.deleteMany();
  await db.incident.deleteMany();
  await db.maintenanceWindow.deleteMany();
  await db.statusPage.deleteMany();
  await db.monitor.deleteMany();
  await db.project.deleteMany();

  // 1. Create Projects
  const prodProject = await db.project.create({
    data: {
      name: "Production Cloud",
      slug: "production-cloud",
      description: "Primary customer-facing APIs and services",
    },
  });

  const infraProject = await db.project.create({
    data: {
      name: "Global Infrastructure",
      slug: "global-infra",
      description: "DNS, CDN, and network routing endpoints",
    },
  });

  // 2. Create Monitors
  const monitorsData = [
    {
      name: "Cloudflare Anycast DNS",
      url: "https://1.1.1.1",
      description: "Ultra-fast global DNS resolver health",
      type: "HTTPS",
      method: "GET",
      interval: 60,
      timeout: 5000,
      degradedThreshold: 300,
      projectId: infraProject.id,
      currentStatus: "OPERATIONAL",
      lastResponseTime: 42,
      lastStatusCode: 200,
    },
    {
      name: "GitHub API Zen Service",
      url: "https://api.github.com/zen",
      description: "GitHub global public API endpoint",
      type: "API",
      method: "GET",
      interval: 60,
      timeout: 8000,
      degradedThreshold: 600,
      projectId: prodProject.id,
      currentStatus: "OPERATIONAL",
      lastResponseTime: 98,
      lastStatusCode: 200,
    },
    {
      name: "Wikipedia Random Summary API",
      url: "https://en.wikipedia.org/api/rest_v1/page/random/summary",
      description: "Wikimedia public REST API service",
      type: "API",
      method: "GET",
      interval: 120,
      timeout: 10000,
      degradedThreshold: 1200,
      projectId: prodProject.id,
      currentStatus: "OPERATIONAL",
      lastResponseTime: 145,
      lastStatusCode: 200,
    },
    {
      name: "User Authentication Service",
      url: "http://localhost:3000/api/mock/healthy",
      description: "OAuth2 and JWT token validation service (Simulated)",
      type: "API",
      method: "GET",
      interval: 30,
      timeout: 5000,
      degradedThreshold: 400,
      projectId: prodProject.id,
      currentStatus: "OPERATIONAL",
      lastResponseTime: 35,
      lastStatusCode: 200,
    },
    {
      name: "Billing & Invoicing API",
      url: "http://localhost:3000/api/mock/slow",
      description: "Stripe webhook processor & payment gateway (Simulated High Latency)",
      type: "API",
      method: "GET",
      interval: 60,
      timeout: 10000,
      degradedThreshold: 1000,
      projectId: prodProject.id,
      currentStatus: "DEGRADED",
      lastResponseTime: 1620,
      lastStatusCode: 200,
    },
    {
      name: "Elasticsearch Index Cluster",
      url: "http://localhost:3000/api/mock/down",
      description: "Log aggregation and catalog indexing engine (Simulated Outage)",
      type: "HTTP",
      method: "GET",
      interval: 30,
      timeout: 5000,
      degradedThreshold: 500,
      projectId: infraProject.id,
      currentStatus: "DOWN",
      lastResponseTime: 5002,
      lastStatusCode: 503,
      lastErrorMessage: "HTTP 503 Service Unavailable: Database connection failed",
    },
  ];

  const createdMonitors = [];
  for (const mData of monitorsData) {
    const monitor = await db.monitor.create({
      data: {
        ...mData,
        lastCheckAt: new Date(),
      },
    });
    createdMonitors.push(monitor);

    // Generate 35 historical checks for each monitor to show realistic heartbeat bars & chart
    const now = Date.now();
    const checks = [];

    for (let i = 35; i >= 0; i--) {
      const checkTime = new Date(now - i * (monitor.interval * 1000));
      let status: "UP" | "DOWN" | "DEGRADED" = "UP";
      let code = 200;
      let latency = Math.floor(Math.random() * 80) + 25;

      if (monitor.name.includes("Down") || monitor.currentStatus === "DOWN") {
        if (i < 5) {
          status = "DOWN";
          code = 503;
          latency = 5000;
        }
      } else if (monitor.name.includes("Billing") || monitor.currentStatus === "DEGRADED") {
        status = "DEGRADED";
        latency = 1600 + Math.floor(Math.random() * 150);
      }

      checks.push({
        monitorId: monitor.id,
        status,
        statusCode: code,
        responseTime: latency,
        message: status === "UP" ? "HTTP 200 OK" : status === "DEGRADED" ? "Latency degraded" : "HTTP 503 Service Unavailable",
        timestamp: checkTime,
      });
    }

    await db.check.createMany({ data: checks });
  }

  // 3. Create Incident for the down monitor
  const downMonitor = createdMonitors.find((m) => m.currentStatus === "DOWN");
  if (downMonitor) {
    const incident = await db.incident.create({
      data: {
        monitorId: downMonitor.id,
        title: "Database Connection Saturation & Node Failover",
        description: "Automated probes detected elevated 503 responses on the search cluster. Connection pool reached saturation limit.",
        status: "IDENTIFIED",
        severity: "CRITICAL",
        startedAt: new Date(Date.now() - 25 * 60 * 1000), // 25 mins ago
        autoCreated: true,
        aiSummary: `### AI Root Cause Analysis
**Target:** ${downMonitor.name}
**Observed Error:** HTTP 503 Service Unavailable

#### Summary
The cluster experienced an abrupt connection starvation event caused by unindexed batch query execution. Health check probes were rejected.

#### Recommended Action Items
- Increase max client connection pool limits on master cluster.
- Add read replicas to offload read-heavy aggregation queries.
- Ensure automated health check failover triggers within 15 seconds.`,
      },
    });

    await db.incidentUpdate.createMany({
      data: [
        {
          incidentId: incident.id,
          status: "INVESTIGATING",
          message: "Automated alert received: Endpoint is returning HTTP 503. Incident response team notified.",
          createdAt: new Date(Date.now() - 25 * 60 * 1000),
        },
        {
          incidentId: incident.id,
          status: "IDENTIFIED",
          message: "Root cause identified as connection pool saturation. Initiating node reboot and failover sequence.",
          createdAt: new Date(Date.now() - 12 * 60 * 1000),
        },
      ],
    });
  }

  // 4. Create Public Status Page
  await db.statusPage.create({
    data: {
      slug: "default",
      title: "PulseWatch Global Status",
      description: "Real-time performance and availability metrics across our production services and developer APIs.",
      theme: "dark",
      customAnnouncement: "Scheduled maintenance scheduled for Sunday at 02:00 UTC on core database shards.",
      announcementLevel: "info",
      isPublic: true,
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
