"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Radio,
  ExternalLink,
  Clock,
  Sparkles,
  ChevronDown,
  Info,
} from "lucide-react";

interface StatusPageProps {
  params: { slug: string };
}

export default function PublicStatusPage({ params }: StatusPageProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatusPage = async () => {
    try {
      const res = await fetch(`/api/status-pages/${params.slug}`);
      if (!res.ok) {
        throw new Error("Status page not found");
      }
      const pageData = await res.json();
      setData(pageData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load status page");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusPage();
    // Auto-refresh every 30 seconds
    const timer = setInterval(fetchStatusPage, 30000);
    return () => clearInterval(timer);
  }, [params.slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center text-slate-400 text-sm">
        <Radio className="w-5 h-5 animate-pulse text-emerald-400 mr-2" />
        <span>Loading service availability...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-xl font-bold text-white mb-2">Status Page Not Found</h1>
        <p className="text-xs text-slate-400 mb-4">{error || "Could not retrieve status data."}</p>
        <Link
          href="/"
          className="px-4 py-2 rounded-md bg-emerald-500 text-black text-xs font-semibold"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const { statusPage, overallStatus, services = [], activeIncidents = [], pastIncidents = [] } = data;

  const isMajorOutage = overallStatus === "MAJOR_OUTAGE";
  const isPartialOutage = overallStatus === "PARTIAL_OUTAGE";
  const isDegraded = overallStatus === "DEGRADED";

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col">
      {/* Public Header */}
      <header className="border-b border-slate-800 bg-[#0d1117]/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">
                {statusPage.title || "Service Status"}
              </h1>
              <p className="text-[11px] text-slate-400">
                {statusPage.description || "Real-time service availability and incident updates"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              <span>Operator Dashboard</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {/* Custom Announcement Banner (if any) */}
        {statusPage.customAnnouncement && (
          <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 text-blue-200 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Notice: </span>
              <span>{statusPage.customAnnouncement}</span>
            </div>
          </div>
        )}

        {/* Big Overall System Status Card */}
        <div
          className={`p-6 rounded-2xl border shadow-xl flex items-center justify-between gap-4 ${
            isMajorOutage
              ? "bg-rose-950/30 border-rose-500/40 text-rose-200"
              : isPartialOutage
              ? "bg-amber-950/30 border-amber-500/40 text-amber-200"
              : isDegraded
              ? "bg-yellow-950/30 border-yellow-500/40 text-yellow-200"
              : "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isMajorOutage
                  ? "bg-rose-500/20 text-rose-400"
                  : isPartialOutage
                  ? "bg-amber-500/20 text-amber-400"
                  : isDegraded
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-emerald-500/20 text-emerald-400"
              }`}
            >
              {isMajorOutage ? (
                <XCircle className="w-7 h-7" />
              ) : isPartialOutage || isDegraded ? (
                <AlertTriangle className="w-7 h-7" />
              ) : (
                <CheckCircle2 className="w-7 h-7" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>
                  {isMajorOutage
                    ? "Major System Outage"
                    : isPartialOutage
                    ? "Partial Service Outage"
                    : isDegraded
                    ? "Degraded Performance"
                    : "All Systems Operational"}
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                {isMajorOutage
                  ? "We are currently investigating critical service interruptions across our infrastructure."
                  : isPartialOutage
                  ? "Some services are experiencing disruptions. Our team is actively addressing the issue."
                  : isDegraded
                  ? "Services are operational but may exhibit elevated latency."
                  : "All monitored systems and developer APIs are responding within acceptable parameters."}
              </p>
            </div>
          </div>

          <div className="hidden sm:block text-right shrink-0">
            <span className="text-[11px] text-slate-400 block">Refreshes live</span>
            <span className="text-xs font-mono text-emerald-400">every 30s</span>
          </div>
        </div>

        {/* Active Incidents Section */}
        {activeIncidents.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Active Incidents ({activeIncidents.length})</span>
            </h3>

            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {activeIncidents.map((incident: any) => (
              <div
                key={incident.id}
                className="bg-[#161b22] border border-rose-500/40 rounded-xl p-5 shadow-lg space-y-3"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 uppercase">
                      {incident.status}
                    </span>
                    <h4 className="font-semibold text-slate-100 text-sm">
                      {incident.title}
                    </h4>
                  </div>
                  <span className="text-xs text-slate-400">
                    Started: {new Date(incident.startedAt).toLocaleString()}
                  </span>
                </div>

                {incident.description && (
                  <p className="text-xs text-slate-300">
                    {incident.description}
                  </p>
                )}

                {/* Updates timeline */}
                {incident.updates && incident.updates.length > 0 && (
                  <div className="border-l-2 border-slate-800 ml-2 pl-3 space-y-2 pt-2">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {incident.updates.map((u: any) => (
                      <div key={u.id} className="text-xs space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-300 uppercase">
                            {u.status}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(u.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-slate-400">{u.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Monitored Services & 30-Day Uptime Strips */}
        <div className="bg-[#161b22] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              Services & Infrastructure Availability
            </h3>
            <span className="text-xs text-slate-400">
              Uptime over past 30 days
            </span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {services.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No services configured on this status page yet.
              </div>
            ) : (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              services.map((service: any) => {
                const isOp = service.currentStatus === "OPERATIONAL";
                const isDeg = service.currentStatus === "DEGRADED";
                const isDown = service.currentStatus === "DOWN";

                return (
                  <div key={service.id} className="p-5 space-y-3">
                    {/* Service Name & Current Status */}
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-slate-200 text-sm">
                          {service.name}
                        </div>
                        {service.description && (
                          <div className="text-xs text-slate-400">
                            {service.description}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                            isOp
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : isDeg
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                              : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOp
                                ? "bg-emerald-400"
                                : isDeg
                                ? "bg-amber-400"
                                : "bg-rose-500"
                            }`}
                          />
                          {isOp
                            ? "Operational"
                            : isDeg
                            ? "Degraded"
                            : "Outage"}
                        </span>
                      </div>
                    </div>

                    {/* 30-Day Uptime Daily Bars (Better Stack style) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {service.dailyUptimes?.map((day: any, i: number) => {
                          let barColor = "bg-emerald-500 hover:bg-emerald-400";
                          if (day.status === "DOWN") barColor = "bg-rose-500 hover:bg-rose-400";
                          else if (day.status === "DEGRADED") barColor = "bg-amber-500 hover:bg-amber-400";
                          else if (day.status === "NONE") barColor = "bg-slate-800";

                          return (
                            <div
                              key={day.date || i}
                              title={`${day.date}: ${day.uptimePct}% uptime`}
                              className={`flex-1 h-6 rounded-sm ${barColor} transition-colors cursor-pointer`}
                            />
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                        <span>30 days ago</span>
                        <span className="font-semibold text-slate-300">
                          {service.uptime30d}% uptime
                        </span>
                        <span>Today</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Past Incidents Archive */}
        <div className="bg-[#161b22] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white">
            Past Incidents & Maintenance
          </h3>

          {pastIncidents.length === 0 ? (
            <p className="text-xs text-slate-500">
              No incidents reported in the past 30 days. Systems have been fully operational!
            </p>
          ) : (
            <div className="space-y-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {pastIncidents.map((incident: any) => (
                <div
                  key={incident.id}
                  className="border-b border-slate-800/80 pb-4 last:border-b-0 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                        Resolved
                      </span>
                      <h4 className="font-semibold text-slate-200">
                        {incident.title}
                      </h4>
                    </div>
                    <span className="text-slate-400 text-[11px]">
                      {new Date(incident.startedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-slate-400">
                    {incident.description}
                  </p>

                  {incident.aiSummary && (
                    <div className="p-3 rounded bg-[#0d1117] border border-slate-800 text-[11px] text-slate-300 font-mono whitespace-pre-wrap">
                      {incident.aiSummary}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0d1117] py-6 text-center text-xs text-slate-500">
        <p>
          Powered by <span className="font-semibold text-slate-300">PulseWatch</span> Website & API Monitoring Platform
        </p>
      </footer>
    </div>
  );
}
