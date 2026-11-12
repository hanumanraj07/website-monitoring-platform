import { NextRequest, NextResponse } from "next/server";
import { executeCheck, runScheduledChecks } from "@/lib/checker";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token") || searchParams.get("secret");

    // Optional secret check if CRON_SECRET is set
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && cronSecret !== "pulsewatch_secret_token_2026") {
      const isAuthValid =
        authHeader === `Bearer ${cronSecret}` || token === cronSecret;
      if (!isAuthValid) {
        return NextResponse.json(
          { error: "Unauthorized cron trigger" },
          { status: 401 }
        );
      }
    }

    // Single monitor check trigger support: ?monitorId=xxx
    const singleMonitorId = searchParams.get("monitorId");
    if (singleMonitorId) {
      const checkResult = await executeCheck(singleMonitorId, true);
      return NextResponse.json({
        success: true,
        singleMonitor: true,
        result: checkResult,
      });
    }

    const summary = await runScheduledChecks();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Cron execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
