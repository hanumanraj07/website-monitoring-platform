"use client";

import React, { useState } from "react";
import { Search, Plus, Filter, LayoutDashboard, Radio } from "lucide-react";
import { HeartbeatBar, Heartbeat } from "./HeartbeatBar";

export interface MonitorItem {
  id: string;
  name: string;
  url: string;
  type: string;
  currentStatus: "OPERATIONAL" | "DEGRADED" | "DOWN" | "PAUSED" | "PENDING";
  isActive: boolean;
  interval: number;
  lastResponseTime: number | null;
  lastStatusCode: number | null;
  uptime24h?: number;
  project?: { id: string; name: string } | null;
  recentHeartbeats?: Heartbeat[];
}

interface MonitorListSidebarProps {
  monitors: MonitorItem[];
  selectedMonitorId: string | null;
  onSelectMonitor: (id: string | null) => void;
  onOpenAddModal: () => void;
  isLoading?: boolean;
}

export function MonitorListSidebar({
  monitors = [],
  selectedMonitorId,
  onSelectMonitor,
  onOpenAddModal,
  isLoading = false,
}: MonitorListSidebarProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");

  // Get distinct projects for filter dropdown
  const projects = Array.from(
    new Set(monitors.map((m) => m.project?.name).filter(Boolean))
  ) as string[];

  // Filter monitors
  const filtered = monitors.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.url.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL"
        ? true
        : statusFilter === "PAUSED"
        ? !m.isActive || m.currentStatus === "PAUSED"
        : m.currentStatus === statusFilter;

    const matchesProject =
      projectFilter === "ALL" ? true : m.project?.name === projectFilter;

    return matchesSearch && matchesStatus && matchesProject;
  });

  return (
    <aside className="w-full md:w-80 lg:w-96 border-r border-slate-800 bg-[#0d1117] flex flex-col h-[calc(100vh-4rem)]">
      {/* Top Header / Actions */}
      <div className="p-3.5 border-b border-slate-800 space-y-2.5">
        <div className="flex items-center gap-2">
          {/* Add Monitor Button */}
          <button
            onClick={onOpenAddModal}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-black shadow-md shadow-emerald-500/10 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add New Monitor</span>
          </button>

          {/* Return to Dashboard Overview */}
          <button
            onClick={() => onSelectMonitor(null)}
            title="Global Overview"
            className={`p-2 rounded-md border text-xs font-medium transition-colors ${
              selectedMonitorId === null
                ? "bg-slate-800 border-slate-700 text-emerald-400"
                : "border-slate-800 hover:bg-slate-800/80 text-slate-400 hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search monitors or URLs..."
            className="w-full bg-[#161b22] border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 bg-[#161b22] border border-slate-800 rounded-md px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Statuses ({monitors.length})</option>
            <option value="OPERATIONAL">Operational</option>
            <option value="DEGRADED">Degraded</option>
            <option value="DOWN">Down</option>
            <option value="PAUSED">Paused</option>
          </select>

          {projects.length > 0 && (
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="flex-1 bg-[#161b22] border border-slate-800 rounded-md px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Monitors Scrollable List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-1.5 space-y-1">
        {isLoading ? (
          <div className="p-6 text-center text-xs text-slate-500">
            Loading monitors...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No monitors found matching criteria.
          </div>
        ) : (
          filtered.map((monitor) => {
            const isSelected = selectedMonitorId === monitor.id;
            const isDown = monitor.currentStatus === "DOWN";
            const isDegraded = monitor.currentStatus === "DEGRADED";
            const isPaused = !monitor.isActive || monitor.currentStatus === "PAUSED";
            const uptime = monitor.uptime24h !== undefined ? monitor.uptime24h : 100;

            let badgeBg = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
            if (isDown) {
              badgeBg = "bg-rose-500/15 text-rose-400 border-rose-500/30";
            } else if (isDegraded) {
              badgeBg = "bg-amber-500/15 text-amber-400 border-amber-500/30";
            } else if (isPaused) {
              badgeBg = "bg-slate-700/30 text-slate-400 border-slate-700";
            }

            return (
              <div
                key={monitor.id}
                onClick={() => onSelectMonitor(monitor.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all border ${
                  isSelected
                    ? "bg-[#161b22] border-emerald-500/50 shadow-md shadow-emerald-500/5"
                    : "border-transparent hover:bg-[#161b22]/70 hover:border-slate-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Uptime % Pill */}
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badgeBg}`}
                    >
                      {isPaused ? "PAUSED" : `${uptime}%`}
                    </span>

                    {/* Monitor Name */}
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {monitor.name}
                    </span>
                  </div>

                  {/* Latency */}
                  {monitor.lastResponseTime !== null && !isPaused && (
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {monitor.lastResponseTime}ms
                    </span>
                  )}
                </div>

                {/* Tags and Sparkline */}
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {monitor.project && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 truncate">
                        {monitor.project.name}
                      </span>
                    )}
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-700/40">
                      {monitor.type}
                    </span>
                  </div>

                  {/* Mini Heartbeat Bar Strip */}
                  <div className="shrink-0">
                    <HeartbeatBar
                      heartbeats={monitor.recentHeartbeats || []}
                      count={16}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
