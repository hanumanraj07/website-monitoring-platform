"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { MonitorListSidebar } from "@/components/MonitorListSidebar";
import { MonitorDetailView } from "@/components/MonitorDetailView";
import { DashboardOverview } from "@/components/DashboardOverview";
import { AddMonitorModal } from "@/components/AddMonitorModal";

export default function HomePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [monitors, setMonitors] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedMonitorId, setSelectedMonitorId] = useState<string | null>(null);

  // Selected monitor details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedMonitorDetail, setSelectedMonitorDetail] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedAnalytics, setSelectedAnalytics] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [chartData, setChartData] = useState<any[]>([]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingMonitor, setEditingMonitor] = useState<any | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch all monitors & global stats
  const fetchData = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setIsRefreshing(true);
      const [monitorsRes, dashboardRes, projectsRes] = await Promise.all([
        fetch("/api/monitors"),
        fetch("/api/dashboard"),
        fetch("/api/projects"),
      ]);

      if (monitorsRes.ok) {
        const mData = await monitorsRes.json();
        setMonitors(mData.monitors || []);
      }

      if (dashboardRes.ok) {
        const dData = await dashboardRes.json();
        setStats(dData.stats || null);
      }

      if (projectsRes.ok) {
        const pData = await projectsRes.json();
        setProjects(pData.projects || []);
      }
    } catch (err) {
      console.error("Failed to load monitors data:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch detailed data for selected monitor
  const fetchMonitorDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/monitors/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedMonitorDetail(data.monitor);
        setSelectedAnalytics(data.analytics);
        setChartData(data.chartData || []);
      }
    } catch (err) {
      console.error("Failed to load monitor details:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // When selected monitor changes
  useEffect(() => {
    if (selectedMonitorId) {
      fetchMonitorDetail(selectedMonitorId);
    } else {
      setSelectedMonitorDetail(null);
      setSelectedAnalytics(null);
      setChartData([]);
    }
  }, [selectedMonitorId, fetchMonitorDetail]);

  // Periodic polling every 12 seconds to keep live heartbeat updated
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
      if (selectedMonitorId) {
        fetchMonitorDetail(selectedMonitorId);
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [fetchData, selectedMonitorId, fetchMonitorDetail]);

  // Handle delete
  const handleDeleteMonitor = async () => {
    if (!selectedMonitorId) return;
    if (
      !confirm(
        `Are you sure you want to delete "${selectedMonitorDetail?.name}"? All check logs and incidents will be removed.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/monitors/${selectedMonitorId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSelectedMonitorId(null);
        fetchData();
      }
    } catch (err) {
      console.error("Failed to delete monitor:", err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0e14]">
      {/* Top Navigation */}
      <Navbar
        onOpenAddModal={() => {
          setEditingMonitor(null);
          setIsAddModalOpen(true);
        }}
        onRefreshAll={fetchData}
        isRefreshing={isRefreshing}
      />

      {/* Main Workspace: Sidebar + Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar (Uptime Kuma Style) */}
        <MonitorListSidebar
          monitors={monitors}
          selectedMonitorId={selectedMonitorId}
          onSelectMonitor={(id) => setSelectedMonitorId(id)}
          onOpenAddModal={() => {
            setEditingMonitor(null);
            setIsAddModalOpen(true);
          }}
          isLoading={isLoading}
        />

        {/* Right Content Area */}
        {selectedMonitorId && selectedMonitorDetail ? (
          <MonitorDetailView
            monitor={selectedMonitorDetail}
            analytics={selectedAnalytics}
            chartData={chartData}
            onRefresh={() => {
              fetchData(true);
              fetchMonitorDetail(selectedMonitorId);
            }}
            onEdit={() => {
              setEditingMonitor(selectedMonitorDetail);
              setIsAddModalOpen(true);
            }}
            onDelete={handleDeleteMonitor}
          />
        ) : (
          <DashboardOverview
            stats={stats}
            monitors={monitors}
            onSelectMonitor={(id) => setSelectedMonitorId(id)}
            onOpenAddModal={() => {
              setEditingMonitor(null);
              setIsAddModalOpen(true);
            }}
            onRefresh={fetchData}
          />
        )}
      </div>

      {/* Add / Edit Monitor Modal */}
      <AddMonitorModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingMonitor(null);
        }}
        onSuccess={() => {
          fetchData();
          if (selectedMonitorId) {
            fetchMonitorDetail(selectedMonitorId);
          }
        }}
        initialData={editingMonitor}
        projects={projects}
      />
    </div>
  );
}
