"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Plus,
  RefreshCw,
  Radio,
  ExternalLink,
  AlertTriangle,
  FolderKanban,
  CheckCircle2,
} from "lucide-react";

interface NavbarProps {
  onOpenAddModal?: () => void;
  onRefreshAll?: () => void;
  isRefreshing?: boolean;
}

export function Navbar({ onOpenAddModal, onRefreshAll, isRefreshing }: NavbarProps) {
  const pathname = usePathname();
  const [cronRunning, setCronRunning] = useState(false);
  const [cronMessage, setCronMessage] = useState<string | null>(null);

  const handleTriggerSweep = async () => {
    try {
      setCronRunning(true);
      setCronMessage(null);
      const res = await fetch("/api/cron");
      const data = await res.json();
      if (data.success) {
        setCronMessage(`Swept ${data.summary?.executedCount || 0} monitors`);
        setTimeout(() => setCronMessage(null), 3000);
        if (onRefreshAll) onRefreshAll();
      }
    } catch {
      setCronMessage("Sweep failed");
      setTimeout(() => setCronMessage(null), 3000);
    } finally {
      setCronRunning(false);
    }
  };

  const navLinks = [
    { name: "Dashboard", href: "/", icon: Activity },
    { name: "Incidents", href: "/incidents", icon: AlertTriangle },
    { name: "Projects", href: "/projects", icon: FolderKanban },
    { name: "Status Page", href: "/status/default", icon: ExternalLink, external: true },
  ];

  return (
    <header className="border-b border-slate-800 bg-[#0d1117] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500 transition-colors">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                    PulseWatch
                  </span>
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 -mt-0.5">
                  Uptime & Status Monitor
                </span>
              </div>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = !link.external && pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-slate-800 text-emerald-400 border border-slate-700"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.name}</span>
                    {link.external && (
                      <ExternalLink className="w-3 h-3 text-slate-400 ml-0.5" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Quick Trigger Cron Button */}
            <button
              onClick={handleTriggerSweep}
              disabled={cronRunning}
              title="Trigger immediate check across all due monitors"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  cronRunning || isRefreshing ? "animate-spin text-emerald-400" : ""
                }`}
              />
              <span>{cronRunning ? "Checking..." : cronMessage || "Run Check Sweep"}</span>
            </button>

            {/* Prominent Add Monitor Button */}
            {onOpenAddModal && (
              <button
                onClick={onOpenAddModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-black shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add New Monitor</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
