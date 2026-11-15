"use client";

import React, { useState } from "react";

export interface Heartbeat {
  id: string;
  status: "UP" | "DOWN" | "DEGRADED";
  statusCode: number | null;
  responseTime: number;
  timestamp: string;
  message?: string | null;
}

interface HeartbeatBarProps {
  heartbeats: Heartbeat[];
  count?: number;
  size?: "sm" | "md" | "lg";
}

export function HeartbeatBar({
  heartbeats = [],
  count = 30,
  size = "md",
}: HeartbeatBarProps) {
  const [hoveredBeat, setHoveredBeat] = useState<Heartbeat | null>(null);

  // Fill up to `count` slots if fewer checks exist
  const paddedBeats: (Heartbeat | null)[] = [...heartbeats];
  while (paddedBeats.length < count) {
    paddedBeats.unshift(null);
  }
  const displayBeats = paddedBeats.slice(-count);

  const heightClass =
    size === "sm" ? "h-5 w-1.5" : size === "lg" ? "h-10 w-2.5" : "h-7 w-2";

  return (
    <div className="relative group">
      {/* Tooltip on hover */}
      {hoveredBeat && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] text-white shadow-xl whitespace-nowrap flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              hoveredBeat.status === "UP"
                ? "bg-emerald-400"
                : hoveredBeat.status === "DEGRADED"
                ? "bg-amber-400"
                : "bg-rose-500"
            }`}
          />
          <span className="font-semibold uppercase">{hoveredBeat.status}</span>
          <span className="text-slate-400">|</span>
          <span>{hoveredBeat.responseTime}ms</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300">
            {hoveredBeat.statusCode ? `HTTP ${hoveredBeat.statusCode}` : "Error"}
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-400">
            {new Date(hoveredBeat.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        </div>
      )}

      {/* Heartbeat Pills Container */}
      <div className="flex items-center gap-[3px]">
        {displayBeats.map((beat, idx) => {
          if (!beat) {
            return (
              <div
                key={`empty-${idx}`}
                className={`${heightClass} rounded-sm bg-slate-800/60`}
                title="No check record"
              />
            );
          }

          let bgClass = "bg-emerald-500 hover:bg-emerald-400";
          if (beat.status === "DOWN") {
            bgClass = "bg-rose-500 hover:bg-rose-400";
          } else if (beat.status === "DEGRADED") {
            bgClass = "bg-amber-500 hover:bg-amber-400";
          }

          return (
            <div
              key={beat.id || idx}
              onMouseEnter={() => setHoveredBeat(beat)}
              onMouseLeave={() => setHoveredBeat(null)}
              className={`${heightClass} rounded-sm ${bgClass} transition-all cursor-pointer hover:scale-110`}
            />
          );
        })}
      </div>
    </div>
  );
}
