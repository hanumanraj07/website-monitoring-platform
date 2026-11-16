"use client";

import React, { useState } from "react";
import {
  ExternalLink,
  Play,
  Pause,
  Edit,
  Trash2,
  Zap,
  Clock,
  Activity,
  AlertTriangle,
  FileText,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { HeartbeatBar, Heartbeat } from "./HeartbeatBar";
import { ResponseChart } from "./ResponseChart";

interface MonitorDetailProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  monitor: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analytics: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chartData: any[];
  onRefresh: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function MonitorDetailView({
  monitor,
  analytics,
  chartData,
  onRefresh,
  onEdit,
  onDelete,
}: MonitorDetailProps) {
  const [activeTab, setActiveTab] = useState<"logs" | "incidents" | "config">("logs");
  const [isChecking, setIsChecking] = useState(false);
  const [checkToast, setCheckToast] = useState<string | null>(null);
  const [isTogglingPause, setIsTogglingPause] = useState(false);
  const [logFilter, setLogFilter] = useState<string>("ALL");

  if (!monitor) return null;

  const isPaused = !monitor.isActive || monitor.currentStatus === "PAUSED";
  const isDown = monitor.currentStatus === "DOWN";
  const isDegraded = monitor.currentStatus === "DEGRADED";

  // Trigger manual check
  const handleCheckNow = async () => {
    try {
      setIsChecking(true);
      setCheckToast(null);
      const res = await fetch(`/api/monitors/${monitor.id}/check`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setCheckToast(
          `Checked: ${data.result.status} (${data.result.responseTime}ms)`
        );
        setTimeout(() => setCheckToast(null), 4000);
        onRefresh();
      } else {
        setCheckToast(`Check failed: ${data.error}`);
        setTimeout(() => setCheckToast(null), 4000);
      }
    } catch {
      setCheckToast("Network check failed");
      setTimeout(() => setCheckToast(null), 4000);
    } finally {
      setIsChecking(false);
    }
  };

  // Toggle Pause / Resume
  const handleTogglePause = async () => {
    try {
      setIsTogglingPause(true);
      await fetch(`/api/monitors/${monitor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: isPaused }),
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsTogglingPause(false);
    }
  };

  // Filter logs
  const logs = analytics?.recentHeartbeats || [];
  const filteredLogs = logs.filter((log: Heartbeat) => {
    if (logFilter === "ALL") return true;
    return log.status === logFilter;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#161b22] border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {monitor.name}
              </h1>
              {monitor.project && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {monitor.project.name}
                </span>
              )}
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                {monitor.type}
              </span>
            </div>

            {/* Target URL */}
            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
              <a
                href={monitor.url}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 font-mono break-all"
              >
                <span>{monitor.url}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              {monitor.description && (
                <>
                  <span>•</span>
                  <span>{monitor.description}</span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Check Now */}
            <button
              onClick={handleCheckNow}
              disabled={isChecking}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 transition-colors disabled:opacity-50"
            >
              <Zap
                className={`w-3.5 h-3.5 ${isChecking ? "animate-spin text-emerald-300" : ""}`}
              />
              <span>{isChecking ? "Checking..." : "Check Now"}</span>
            </button>

            {/* Pause / Resume */}
            <button
              onClick={handleTogglePause}
              disabled={isTogglingPause}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pause</span>
                </>
              )}
            </button>

            {/* Edit */}
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            {/* Delete */}
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Check Result Toast Notice */}
        {checkToast && (
          <div className="mt-3 px-3 py-1.5 rounded bg-slate-900 border border-emerald-500/50 text-emerald-400 text-xs flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>{checkToast}</span>
          </div>
        )}

        {/* Heartbeat Status Bar (Uptime Kuma Style) */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="overflow-x-auto pb-1">
              <HeartbeatBar
                heartbeats={analytics?.recentHeartbeats || []}
                count={35}
                size="md"
              />
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>Check every {monitor.interval} seconds.</span>
            </div>
          </div>

          {/* Big Status Pill */}
          <div className="shrink-0 flex items-center gap-2">
            <span
              className={`px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase shadow-md flex items-center gap-2 border ${
                isPaused
                  ? "bg-slate-800 text-slate-400 border-slate-700"
                  : isDown
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/50"
                  : isDegraded
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                  : "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isPaused
                    ? "bg-slate-400"
                    : isDown
                    ? "bg-rose-500"
                    : isDegraded
                    ? "bg-amber-500"
                    : "bg-emerald-400"
                }`}
              />
              {isPaused
                ? "PAUSED"
                : isDown
                ? "DOWN"
                : isDegraded
                ? "DEGRADED"
                : "UP"}
            </span>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid (Uptime Kuma 5 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Response Current */}
        <div className="bg-[#161b22] border border-slate-800 rounded-xl p-4 flex flex-col">
          <span className="text-xs text-slate-400 font-medium">Response</span>
          <span className="text-[10px] text-slate-500">(Current)</span>
          <span className="text-xl font-bold text-slate-100 mt-2 font-mono">
            {monitor.lastResponseTime !== null ? `${monitor.lastResponseTime} ms` : "--"}
          </span>
        </div>

        {/* Card 2: Avg Response 24h */}
        <div className="bg-[#161b22] border border-slate-800 rounded-xl p-4 flex flex-col">
          <span className="text-xs text-slate-400 font-medium">Avg. Response</span>
          <span className="text-[10px] text-slate-500">(24-hour)</span>
          <span className="text-xl font-bold text-emerald-400 mt-2 font-mono">
            {analytics?.avgResponseTime24h !== undefined ? `${analytics.avgResponseTime24h} ms` : "--"}
          </span>
        </div>

        {/* Card 3: Uptime 24h */}
        <div className="bg-[#161b22] border border-slate-800 rounded-xl p-4 flex flex-col">
          <span className="text-xs text-slate-400 font-medium">Uptime</span>
          <span className="text-[10px] text-slate-500">(24-hour)</span>
          <span className="text-xl font-bold text-slate-100 mt-2">
            {analytics?.uptime24h !== undefined ? `${analytics.uptime24h}%` : "100%"}
          </span>
        </div>

        {/* Card 4: Uptime 30d */}
        <div className="bg-[#161b22] border border-slate-800 rounded-xl p-4 flex flex-col">
          <span className="text-xs text-slate-400 font-medium">Uptime</span>
          <span className="text-[10px] text-slate-500">(30-day)</span>
          <span className="text-xl font-bold text-slate-100 mt-2">
            {analytics?.uptime30d !== undefined ? `${analytics.uptime30d}%` : "100%"}
          </span>
        </div>

        {/* Card 5: Longest Downtime */}
        <div className="bg-[#161b22] border border-slate-800 rounded-xl p-4 flex flex-col">
          <span className="text-xs text-slate-400 font-medium">Longest Downtime</span>
          <span className="text-[10px] text-slate-500">(Recorded)</span>
          <span className="text-xl font-bold text-slate-100 mt-2">
            {analytics?.longestDowntimeSeconds ? `${analytics.longestDowntimeSeconds}s` : "0s"}
          </span>
        </div>
      </div>

      {/* Latency Response Time Chart */}
      <div className="bg-[#161b22] border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Response Time History (ms)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Degraded threshold: {monitor.degradedThreshold}ms
          </span>
        </div>
        <ResponseChart
          data={chartData}
          degradedThreshold={monitor.degradedThreshold}
        />
      </div>

      {/* Tabbed Navigation */}
      <div className="border-b border-slate-800 flex items-center gap-2 text-sm">
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === "logs"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Check Logs ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("incidents")}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === "incidents"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Incidents ({monitor.incidents?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("config")}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === "config"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Endpoint Config</span>
        </button>
      </div>

      {/* Tab Content 1: Check Logs */}
      {activeTab === "logs" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-400">
              Showing recent check results and response codes
            </span>
            <div className="flex items-center gap-1.5">
              {["ALL", "UP", "DEGRADED", "DOWN"].map((f) => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${
                    logFilter === f
                      ? "bg-slate-800 text-emerald-400 border-slate-700 font-semibold"
                      : "border-slate-800 text-slate-400 hover:bg-slate-800/50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0d1117] text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">HTTP Code</th>
                    <th className="px-4 py-2.5">Latency</th>
                    <th className="px-4 py-2.5">Timestamp</th>
                    <th className="px-4 py-2.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">
                        No check logs found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log: Heartbeat) => {
                      const isUp = log.status === "UP";
                      const isDeg = log.status === "DEGRADED";
                      return (
                        <tr key={log.id} className="hover:bg-slate-800/30">
                          <td className="px-4 py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isUp
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : isDeg
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-rose-500/20 text-rose-400"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-300">
                            {log.statusCode ? `HTTP ${log.statusCode}` : "--"}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-emerald-400 font-semibold">
                            {log.responseTime} ms
                          </td>
                          <td className="px-4 py-2.5 text-slate-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-slate-400 max-w-xs truncate">
                            {log.message || "--"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Incident History */}
      {activeTab === "incidents" && (
        <div className="space-y-4">
          {(!monitor.incidents || monitor.incidents.length === 0) ? (
            <div className="bg-[#161b22] border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
              No incidents recorded for this monitor. Service has maintained excellent uptime!
            </div>
          ) : (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            monitor.incidents.map((incident: any) => {
              const isResolved = incident.status === "RESOLVED";
              return (
                <div
                  key={incident.id}
                  className="bg-[#161b22] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                          isResolved
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                        }`}
                      >
                        {incident.status}
                      </span>
                      <h4 className="font-semibold text-slate-200 text-sm">
                        {incident.title}
                      </h4>
                    </div>

                    <div className="text-xs text-slate-400">
                      Started: {new Date(incident.startedAt).toLocaleString()}
                      {incident.duration && (
                        <span className="ml-2 font-mono text-emerald-400">
                          (Downtime: {Math.round(incident.duration / 60)}m {incident.duration % 60}s)
                        </span>
                      )}
                    </div>
                  </div>

                  {incident.description && (
                    <p className="text-xs text-slate-300">
                      {incident.description}
                    </p>
                  )}

                  {/* AI Root Cause Analysis Card if present */}
                  {incident.aiSummary && (
                    <div className="p-3.5 rounded-lg bg-[#0d1117] border border-emerald-500/30 text-xs space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Automated AI Post-Mortem & RCA</span>
                      </div>
                      <div className="text-slate-300 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                        {incident.aiSummary}
                      </div>
                    </div>
                  )}

                  {/* Incident updates timeline */}
                  {incident.updates && incident.updates.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-semibold text-slate-400">
                        Updates Timeline:
                      </span>
                      <div className="border-l-2 border-slate-800 ml-2 pl-3 space-y-2.5">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {incident.updates.map((update: any) => (
                          <div key={update.id} className="text-xs space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                {update.status}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(update.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-slate-300 text-xs">
                              {update.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab Content 3: Config */}
      {activeTab === "config" && (
        <div className="bg-[#161b22] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Endpoint Settings & SSRF Protection Status</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-500">HTTP Method</span>
              <p className="font-mono text-slate-200">{monitor.method || "GET"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500">Expected Status Code</span>
              <p className="font-mono text-slate-200">{monitor.expectedStatusCode || 200}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500">Check Interval</span>
              <p className="font-mono text-slate-200">{monitor.interval} seconds</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500">Request Timeout</span>
              <p className="font-mono text-slate-200">{monitor.timeout} ms</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500">Degraded Latency Threshold</span>
              <p className="font-mono text-slate-200">{monitor.degradedThreshold} ms</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500">Keyword Verification</span>
              <p className="font-mono text-slate-200">{monitor.keyword || "None (Status Code only)"}</p>
            </div>
          </div>

          {monitor.headers && (
            <div className="space-y-1 pt-2">
              <span className="text-slate-500 text-xs">Custom Request Headers:</span>
              <pre className="p-3 bg-[#0d1117] rounded border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto">
                {monitor.headers}
              </pre>
            </div>
          )}

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">SSRF Protection Active:</span> Target host is restricted to public routable internet addresses. Private ranges (RFC 1918), localhost loopbacks, and cloud metadata endpoints (169.254.169.254) are rejected at pre-flight.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
