import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateAiIncidentAnalysis } from "@/lib/ai";

export const dynamic = "force-dynamic";

// POST /api/incidents/[id]/ai-summary - Generate or refresh AI incident RCA
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const incident = await db.incident.findUnique({
      where: { id: params.id },
      include: { monitor: true },
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    const aiResult = generateAiIncidentAnalysis({
      monitorName: incident.monitor.name,
      url: incident.monitor.url,
      statusCode: incident.monitor.lastStatusCode,
      errorMessage: incident.monitor.lastErrorMessage || incident.description,
      durationSeconds: incident.duration,
      startedAt: incident.startedAt,
      resolvedAt: incident.resolvedAt,
      historicalLatencyMs: incident.monitor.lastResponseTime,
    });

    const formattedSummary = `### ${aiResult.title}
**Impact Level:** ${aiResult.impactLevel}

#### Executive Summary
${aiResult.executiveSummary}

#### Root Cause Analysis
${aiResult.rootCauseAnalysis}

#### Recommended Action Items
${aiResult.recommendedActions.map((a) => `- ${a}`).join("\n")}
`;

    const updated = await db.incident.update({
      where: { id: params.id },
      data: { aiSummary: formattedSummary },
    });

    return NextResponse.json({
      success: true,
      aiAnalysis: aiResult,
      aiSummary: formattedSummary,
      incident: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate AI summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
