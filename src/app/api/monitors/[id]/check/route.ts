import { NextRequest, NextResponse } from "next/server";
import { executeCheck } from "@/lib/checker";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/monitors/[id]/check - Manually trigger check immediately
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const monitor = await db.monitor.findUnique({
      where: { id: params.id },
    });

    if (!monitor) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
    }

    // Force check execution
    const result = await executeCheck(params.id, true);

    return NextResponse.json({
      success: true,
      result,
      message: `Check completed: ${result.status} (${result.responseTime}ms)`,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to execute manual check";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
