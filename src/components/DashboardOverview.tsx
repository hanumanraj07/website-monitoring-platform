"use client";

import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PauseCircle,
  Activity,
  ArrowUpRight,
  Zap,
  Sparkles,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { HeartbeatBar } from "./HeartbeatBar";

interface DashboardOverviewProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  monitors: any[];
  onSelectMonitor: (id: string) => void;
  onOpenAddModal: () => void;
  onRefresh: () => void;
}

export function DashboardOverview({
  stats,
  monitors = [],
  onSelectMonitor,
  onOpenAddModal,
  onRefresh,
}: DashboardOverviewProps) {
  const total = stats?.totalMonitors || monitors.length || 0;
  const operational = stats?.operationalMonitors || 0;
  const degraded = stats?.degradedMonitors || 0;
  const down = stats?.downMonitors || 0;
  const paused = stats?.pausedMonitors || 0;
  const uptime = stats?.overallUptime24h !== undefined ? stats.overallUptime24h : 100;
  const activeIncidents = stats?.activeIncidents || [];

  const hasOutage = down > 0;
  const hasDegraded = degraded > 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* System Status Banner */}
      <div
        className={`rounded-xl p-5 border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl ${
          hasOutage
            ? "bg-rose-950/30 border-rose-500/40 text-rose-200"
            : hasDegraded
            ? "bg-amber-950/30 border-amber-500/40 text-amber-200"
            : "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              hasOutage
                ? "bg-rose-500/20 text-rose-400"
                : hasDegraded
                ? "bg-amber-500/20 text-amber-400"
                : "bg-emerald-500/20 text-emerald-400"
            }`}
          >
            {hasOutage ? (
              <XCircle className="w-7 h-7" />
            ) : hasDegraded ? (
              <AlertTriangle className="w-7 h-7" />
            ) : (
              <CheckCircle2 className="w-7 h-7" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>
                {hasOutage
                  ? `Service Interruption: ${down} ${down === 1 ? "Endpoint" : "Endpoints"} Down`
                  : hasDegraded
                  ? "Degraded Performance Detected"
                  : "All Systems Operational"}
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {hasOutage
                ? "Automated monitoring has flagged availability issues. Engineering incident response active."
                : hasDegraded
                ? "One or more endpoints are responding above the configured latency threshold."
                : `Continuous background health probes are active across all ${total} registered endpoints.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/status/default"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/20 transition-all shrink-0"
          >
            <span>View Public Status Page</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Monitors */}
        <div className="bg-[#161b22] border border-slate-800 rounded-xl p-4 flex flex-col">
          <span className="text-xs text-slate-400 font-medium">Monitors</span>
          <span className="text-2xl font-bold text-white mt-1">{total}</span>
          <span className="text-[10px] text-slate-500 mt-1">Configured</span>
        </div>

        {/* Operational */}
        <div className="bg-[#161b22] border border-slate-800 rounded-xl p-4 flex flex-col">
          <span className="text-xs text-emerald-400 font-medium">Operational</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1">
            {operational}
          </span>
          <span className="text-[10px] text-slate-500 mt-1">Passing checks</span>
        </div>

        {/* Degraded */}
        <div className="bg-[#161b22] border border-slate-800 rounded-xl p-4 flex flex-col">
          <span className="text-xs text-amber-400 font-medium">Degraded</span>
          <span className="text-2xl font-bold text-amber-400 mt-1">
            {degraded}
          </span>
          <span className="text-[10px] text-slate-500 mt-1">High latency</span>
        </div>

        {/* Down */}
        <div className="bg-[#161b22] border border-slate-800 rounded-xl p-4 flex flex-col">
          <span className="text-xs text-rose-400 font-medium">Down</span>
          <span className="text-2xl font-bold text-rose-400 mt-1">
            {down}
          </span>
          <span className="text-[10px] text-slate-500 mt-1">Service outages</span>
        </div>

        {/* Paused */}
        <div className="bg-[#161b22] border border-slate-800 rounded-xl p-4 flex flex-col">
          <span className="text-xs text-slate-400 font-medium">Paused</span>
          <span className="text-2xl font-bold text-slate-400 mt-1">
            {paused}
          </span>
          <span className="text-[10px] text-slate-500 mt-1">Disabled</span>
        </div>

        {/* Overall 24h Uptime */}
        <div className="bg-[#161b22] border border-slate-800 rounded-xl p-4 flex flex-col">
          <span className="text-xs text-slate-400 font-medium">24h Uptime</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1">
            {uptime}%
          </span>
          <span className="text-[10px] text-slate-500 mt-1">All services</span>
        </div>
      </div>

      {/* Active Incidents Banner (if any) */}
      {activeIncidents.length > 0 && (
        <div className="bg-[#161b22] border border-rose-500/30 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Active Outage Incidents ({activeIncidents.length})</span>
            </div>
            <a
              href="/incidents"
              className="text-xs text-slate-400 hover:text-white hover:underline"
            >
              Manage Incidents →
            </a>
          </div>

          <div className="divide-y divide-slate-800/80">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {activeIncidents.map((incident: any) => (
              <div
                key={incident.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 uppercase">
                      {incident.severity}
                    </span>
                    <span className="font-semibold text-slate-200">
                      {incident.title}
                    </span>
                    {incident.monitor && (
                      <span className="text-slate-400">
                        ({incident.monitor.name})
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 mt-1">
                    {incident.description}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">
                    Started {new Date(incident.startedAt).toLocaleTimeString()}
                  </span>
                  <button
                    onClick={() => onSelectMonitor(incident.monitorId)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700"
                  >
                    View Monitor
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monitored Endpoints Table */}
      <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              All Monitored Services & Availability
            </h3>
            <p className="text-xs text-slate-400">
              Live heartbeat response bars and health status
            </p>
          </div>
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-black shadow-md shadow-emerald-500/10 transition-all"
          >
            <span>+ Add Monitor</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0d1117] text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Service Name</th>
                <th className="px-4 py-3">Target URL</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3">24h Uptime</th>
                <th className="px-4 py-3">Heartbeats (Recent Checks)</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {monitors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                    No monitors registered yet. Click &quot;Add New Monitor&quot; to begin!
                  </td>
                </tr>
              ) : (
                monitors.map((m) => {
                  const isUp = m.currentStatus === "OPERATIONAL";
                  const isDeg = m.currentStatus === "DEGRADED";
                  const isDown = m.currentStatus === "DOWN";
                  const isPaused = !m.isActive || m.currentStatus === "PAUSED";

                  return (
                    <tr
                      key={m.id}
                      onClick={() => onSelectMonitor(m.id)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 border ${
                            isPaused
                              ? "bg-slate-800 text-slate-400 border-slate-700"
                              : isDown
                              ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                              : isDeg
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                              : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isPaused
                                ? "bg-slate-400"
                                : isDown
                                ? "bg-rose-500"
                                : isDeg
                                ? "bg-amber-500"
                                : "bg-emerald-400"
                            }`}
                          />
                          {isPaused
                            ? "PAUSED"
                            : isDown
                            ? "DOWN"
                            : isDeg
                            ? "DEGRADED"
                            : "UP"}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-200">
                          {m.name}
                        </div>
                        {m.project && (
                          <div className="text-[10px] text-slate-400">
                            {m.project.name}
                          </div>
                        )}
                      </td>

                      {/* URL */}
                      <td className="px-4 py-3 font-mono text-slate-400 max-w-xs truncate">
                        {m.url}
                      </td>

                      {/* Latency */}
                      <td className="px-4 py-3 font-mono font-semibold text-emerald-400">
                        {m.lastResponseTime !== null ? `${m.lastResponseTime}ms` : "--"}
                      </td>

                      {/* Uptime */}
                      <td className="px-4 py-3 font-semibold text-slate-200">
                        {m.uptime24h !== undefined ? `${m.uptime24h}%` : "100%"}
                      </td>

                      {/* Heartbeat Bar */}
                      <td className="px-4 py-3">
                        <HeartbeatBar
                          heartbeats={m.recentHeartbeats || []}
                          count={24}
                          size="sm"
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectMonitor(m.id);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700"
                        >
                          Details →
                        </button>
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
  );
}
