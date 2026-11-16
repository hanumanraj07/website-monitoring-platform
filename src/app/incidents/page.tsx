"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Plus,
  Send,
  Trash2,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

export default function IncidentsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [incidents, setIncidents] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [monitors, setMonitors] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // Manual incident modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualMonitorId, setManualMonitorId] = useState("");
  const [manualSeverity, setManualSeverity] = useState("MAJOR");
  const [manualDescription, setManualDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form state per incident
  const [activeUpdateIncidentId, setActiveUpdateIncidentId] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState("");
  const [updateStatus, setUpdateStatus] = useState("INVESTIGATING");
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  // AI Generation loading map
  const [generatingAiId, setGeneratingAiId] = useState<string | null>(null);

  const fetchIncidents = useCallback(async () => {
    try {
      setIsLoading(true);
      const [incRes, monRes] = await Promise.all([
        fetch("/api/incidents"),
        fetch("/api/monitors"),
      ]);

      if (incRes.ok) {
        const data = await incRes.json();
        setIncidents(data.incidents || []);
      }
      if (monRes.ok) {
        const mData = await monRes.json();
        setMonitors(mData.monitors || []);
        if (mData.monitors?.length > 0 && !manualMonitorId) {
          setManualMonitorId(mData.monitors[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [manualMonitorId]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // Handle manual incident creation
  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle || !manualMonitorId) return;

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: manualTitle,
          monitorId: manualMonitorId,
          severity: manualSeverity,
          description: manualDescription,
        }),
      });

      if (res.ok) {
        setIsCreateOpen(false);
        setManualTitle("");
        setManualDescription("");
        fetchIncidents();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle adding progress update
  const handleAddUpdate = async (incidentId: string) => {
    if (!updateMessage.trim()) return;

    try {
      setIsSubmittingUpdate(true);
      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: updateStatus,
          updateMessage: updateMessage.trim(),
        }),
      });

      if (res.ok) {
        setUpdateMessage("");
        setActiveUpdateIncidentId(null);
        fetchIncidents();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  // Generate AI Summary & Root Cause Analysis
  const handleGenerateAiRca = async (incidentId: string) => {
    try {
      setGeneratingAiId(incidentId);
      const res = await fetch(`/api/incidents/${incidentId}/ai-summary`, {
        method: "POST",
      });
      if (res.ok) {
        fetchIncidents();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingAiId(null);
    }
  };

  // Delete incident
  const handleDeleteIncident = async (incidentId: string) => {
    if (!confirm("Are you sure you want to delete this incident record?")) return;
    try {
      await fetch(`/api/incidents/${incidentId}`, { method: "DELETE" });
      fetchIncidents();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = incidents.filter((inc) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "ACTIVE") return inc.status !== "RESOLVED";
    return inc.status === statusFilter;
  });

  const activeCount = incidents.filter((i) => i.status !== "RESOLVED").length;
  const resolvedCount = incidents.filter((i) => i.status === "RESOLVED").length;

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
              <span>Incident Management & Post-Mortems</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Track outages, post operational updates, and generate automated AI root-cause summaries
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-black shadow-md shadow-emerald-500/10 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Log Incident</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {[
              { id: "ALL", label: `All Incidents (${incidents.length})` },
              { id: "ACTIVE", label: `Active (${activeCount})` },
              { id: "RESOLVED", label: `Resolved (${resolvedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  statusFilter === tab.id
                    ? "bg-slate-800 border-emerald-500/50 text-emerald-400 font-semibold"
                    : "border-slate-800 text-slate-400 hover:bg-slate-800/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Incidents List */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Loading incident records...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#161b22] border border-slate-800 rounded-xl p-12 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-semibold text-white">No incidents found</h3>
            <p className="text-xs text-slate-400">
              No service outages or incidents match the selected filter.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((incident) => {
              const isResolved = incident.status === "RESOLVED";
              const isEditingThis = activeUpdateIncidentId === incident.id;

              return (
                <div
                  key={incident.id}
                  className="bg-[#161b22] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          isResolved
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                        }`}
                      >
                        {incident.status}
                      </span>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                        {incident.severity}
                      </span>

                      <h3 className="text-sm font-bold text-white">
                        {incident.title}
                      </h3>

                      {incident.monitor && (
                        <span className="text-xs text-slate-400">
                          on <span className="text-emerald-400 font-semibold">{incident.monitor.name}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>Started: {new Date(incident.startedAt).toLocaleString()}</span>
                      {incident.duration && (
                        <span className="font-mono text-emerald-400 font-semibold">
                          ({Math.round(incident.duration / 60)}m {incident.duration % 60}s downtime)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {incident.description && (
                    <p className="text-xs text-slate-300">
                      {incident.description}
                    </p>
                  )}

                  {/* AI Root Cause Analysis Section */}
                  {incident.aiSummary ? (
                    <div className="p-4 rounded-xl bg-[#0d1117] border border-emerald-500/30 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                          <Sparkles className="w-4 h-4" />
                          <span>AI Root Cause Analysis & Post-Mortem</span>
                        </div>
                        <button
                          onClick={() => handleGenerateAiRca(incident.id)}
                          disabled={generatingAiId === incident.id}
                          className="text-[11px] text-slate-400 hover:text-emerald-400 transition-colors"
                        >
                          {generatingAiId === incident.id ? "Analyzing..." : "Re-generate RCA"}
                        </button>
                      </div>
                      <div className="text-slate-300 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                        {incident.aiSummary}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleGenerateAiRca(incident.id)}
                        disabled={generatingAiId === incident.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          {generatingAiId === incident.id
                            ? "Analyzing Outage..."
                            : "Generate AI Root Cause Analysis"}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Timeline updates */}
                  {incident.updates && incident.updates.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <span className="text-xs font-semibold text-slate-400">
                        Investigation Updates:
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
                            <p className="text-slate-300">{update.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add Progress Update Form */}
                  {isEditingThis ? (
                    <div className="pt-3 border-t border-slate-800 space-y-2.5 bg-[#0d1117] p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-slate-300">
                          Status Transition:
                        </label>
                        <select
                          value={updateStatus}
                          onChange={(e) => setUpdateStatus(e.target.value)}
                          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        >
                          <option value="INVESTIGATING">INVESTIGATING</option>
                          <option value="IDENTIFIED">IDENTIFIED</option>
                          <option value="MONITORING">MONITORING</option>
                          <option value="RESOLVED">RESOLVED</option>
                        </select>
                      </div>

                      <textarea
                        rows={2}
                        value={updateMessage}
                        onChange={(e) => setUpdateMessage(e.target.value)}
                        placeholder="Add progress note (e.g. 'Database failover completed, monitoring error rates')..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-white placeholder-slate-500"
                      />

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveUpdateIncidentId(null)}
                          className="px-3 py-1 rounded text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddUpdate(incident.id)}
                          disabled={isSubmittingUpdate}
                          className="px-3 py-1 rounded text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-black flex items-center gap-1.5"
                        >
                          <Send className="w-3 h-3" />
                          <span>Post Update</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <button
                        onClick={() => {
                          setActiveUpdateIncidentId(incident.id);
                          setUpdateStatus(incident.status);
                        }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                      >
                        <span>+ Add Investigation Note / Update Status</span>
                      </button>

                      <button
                        onClick={() => handleDeleteIncident(incident.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded"
                        title="Delete incident"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Manual Incident Log Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#161b22] border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">
              Log Service Incident
            </h3>

            <form onSubmit={handleCreateIncident} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Target Service <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={manualMonitorId}
                  onChange={(e) => setManualMonitorId(e.target.value)}
                  className="w-full bg-[#0d1117] border border-slate-700 rounded-md p-2 text-xs text-white"
                >
                  {monitors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.url})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Incident Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. Upstream DNS resolution failure"
                  className="w-full bg-[#0d1117] border border-slate-700 rounded-md p-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Severity Level
                </label>
                <select
                  value={manualSeverity}
                  onChange={(e) => setManualSeverity(e.target.value)}
                  className="w-full bg-[#0d1117] border border-slate-700 rounded-md p-2 text-xs text-white"
                >
                  <option value="CRITICAL">CRITICAL (Service completely down)</option>
                  <option value="MAJOR">MAJOR (High impact partial outage)</option>
                  <option value="MINOR">MINOR (Slow responses / degraded)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Planned downtime)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Initial Summary / Details
                </label>
                <textarea
                  rows={3}
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="Describe observed error, user reports, or reason for maintenance..."
                  className="w-full bg-[#0d1117] border border-slate-700 rounded-md p-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-md text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-black"
                >
                  {isSubmitting ? "Logging..." : "Create Incident"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
