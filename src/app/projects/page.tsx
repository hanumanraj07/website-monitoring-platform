"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import {
  FolderKanban,
  Plus,
  Layers,
  ArrowRight,
  Activity,
  CheckCircle2,
  X,
} from "lucide-react";

export default function ProjectsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projects, setProjects] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [monitors, setMonitors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [projRes, monRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/monitors"),
      ]);

      if (projRes.ok) {
        const pData = await projRes.json();
        setProjects(pData.projects || []);
      }
      if (monRes.ok) {
        const mData = await monRes.json();
        setMonitors(mData.monitors || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName.trim(),
          description: projectDesc.trim(),
        }),
      });

      if (res.ok) {
        setProjectName("");
        setProjectDesc("");
        setIsModalOpen(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <FolderKanban className="w-6 h-6 text-emerald-400" />
              <span>Project & Endpoint Groups</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Organize monitored endpoints, APIs, and microservices into logical projects
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-black shadow-md shadow-emerald-500/10 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Project</span>
          </button>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Loading project groups...
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-[#161b22] border border-slate-800 rounded-xl p-12 text-center space-y-2">
            <FolderKanban className="w-8 h-8 text-slate-500 mx-auto" />
            <h3 className="text-sm font-semibold text-white">No projects created</h3>
            <p className="text-xs text-slate-400">
              Group endpoints together by creating your first project!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj) => {
              const projMonitors = monitors.filter((m) => m.projectId === proj.id);
              const opCount = projMonitors.filter((m) => m.currentStatus === "OPERATIONAL").length;
              const downCount = projMonitors.filter((m) => m.currentStatus === "DOWN").length;

              return (
                <div
                  key={proj.id}
                  className="bg-[#161b22] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-400" />
                        <span>{proj.name}</span>
                      </h3>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {projMonitors.length} {projMonitors.length === 1 ? "monitor" : "monitors"}
                      </span>
                    </div>

                    {proj.description && (
                      <p className="text-xs text-slate-400 mt-2">
                        {proj.description}
                      </p>
                    )}

                    {/* Status Breakdown */}
                    <div className="flex items-center gap-4 mt-4 text-xs font-medium">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {opCount} Operational
                      </span>
                      {downCount > 0 && (
                        <span className="text-rose-400 flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5" />
                          {downCount} Outages
                        </span>
                      )}
                    </div>

                    {/* Monitored Services Chips */}
                    {projMonitors.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-800/80">
                        {projMonitors.map((m) => (
                          <span
                            key={m.id}
                            className={`text-[10px] px-2 py-0.5 rounded-full border ${
                              m.currentStatus === "DOWN"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                : "bg-slate-800 text-slate-300 border-slate-700"
                            }`}
                          >
                            {m.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/"
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                    >
                      <span>View in Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#161b22] border border-slate-700 rounded-xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Create Project Group
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Project Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Core Microservices"
                  className="w-full bg-[#0d1117] border border-slate-700 rounded-md p-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Summary of services grouped in this project..."
                  className="w-full bg-[#0d1117] border border-slate-700 rounded-md p-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-md text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-black"
                >
                  {isSubmitting ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
