import cron from "node-cron";
import { runScheduledChecks } from "./lib/checker";

console.log("==========================================");
console.log(" PulseWatch Monitoring Worker Starting... ");
console.log("==========================================");

let isRunning = false;

// Run checks immediately on startup
async function tick() {
  if (isRunning) {
    console.log("[Worker] Previous check batch still executing, skipping tick...");
    return;
  }

  isRunning = true;
  try {
    const summary = await runScheduledChecks();
    if (summary.dueMonitorsCount > 0) {
      console.log(
        `[Worker Tick] Checked ${summary.executedCount}/${summary.dueMonitorsCount} due monitors in ${summary.durationMs}ms | UP: ${summary.upCount} | DEGRADED: ${summary.degradedCount} | DOWN: ${summary.downCount} | Errors: ${summary.errorsCount}`
      );
    }
  } catch (err) {
    console.error("[Worker Error]", err);
  } finally {
    isRunning = false;
  }
}

// Initial run
tick();

// Schedule worker to evaluate due checks every 10 seconds
const cronTask = cron.schedule("*/10 * * * * *", () => {
  tick();
});

console.log("[Worker] Scheduler initialized. Checking due monitors every 10 seconds.");

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[Worker] Gracefully shutting down monitoring scheduler...");
  cronTask.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n[Worker] Received SIGTERM, shutting down...");
  cronTask.stop();
  process.exit(0);
});
