import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { scenario: string } }
) {
  const scenario = params.scenario;

  if (scenario === "healthy") {
    return NextResponse.json({
      status: "operational",
      code: 200,
      timestamp: new Date().toISOString(),
      message: "Service running smoothly",
    });
  }

  if (scenario === "slow") {
    // Artificial latency of 1600ms to trigger DEGRADED status (> 1500ms threshold)
    await new Promise((resolve) => setTimeout(resolve, 1600));
    return NextResponse.json({
      status: "degraded",
      code: 200,
      timestamp: new Date().toISOString(),
      message: "High latency response",
    });
  }

  if (scenario === "down") {
    return NextResponse.json(
      {
        status: "error",
        code: 503,
        error: "Database connection failed - simulated outage",
      },
      { status: 503 }
    );
  }

  if (scenario === "flaky") {
    const isError = Math.random() < 0.35;
    if (isError) {
      return NextResponse.json(
        { status: "error", code: 500, error: "Intermittent internal error" },
        { status: 500 }
      );
    }
    return NextResponse.json({
      status: "ok",
      code: 200,
      message: "Flaky service passed this check",
    });
  }

  return NextResponse.json({
    status: "ok",
    scenario,
    timestamp: new Date().toISOString(),
  });
}
