"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface ChartPoint {
  id: string;
  status: string;
  statusCode: number | null;
  responseTime: number;
  timestamp: string;
}

interface ResponseChartProps {
  data: ChartPoint[];
  degradedThreshold?: number;
}

export function ResponseChart({ data, degradedThreshold = 1500 }: ResponseChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-500 text-sm border border-slate-800 rounded-lg bg-[#11161f]">
        No latency check logs available yet.
      </div>
    );
  }

  const formattedData = data.map((point) => ({
    ...point,
    formattedTime: new Date(point.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  }));

  // Find max response time to scale chart nicely
  const maxLatency = Math.max(...data.map((d) => d.responseTime), 100);

  return (
    <div className="w-full h-56 pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={formattedData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="degradedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis
            dataKey="formattedTime"
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#374151" }}
          />
          <YAxis
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#374151" }}
            tickFormatter={(val) => `${val}ms`}
            domain={[0, Math.ceil(maxLatency * 1.15)]}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as ChartPoint & { formattedTime: string };
                const isDown = item.status === "DOWN";
                const isDegraded = item.status === "DEGRADED";
                return (
                  <div className="bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg shadow-xl text-xs space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-400">{item.formattedTime}</span>
                      <span
                        className={`font-bold uppercase px-1.5 py-0.5 rounded text-[10px] ${
                          isDown
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : isDegraded
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-300">Response Time:</span>
                      <span className="font-semibold text-emerald-400">
                        {item.responseTime} ms
                      </span>
                    </div>
                    {item.statusCode && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400">Status Code:</span>
                        <span className="text-slate-200 font-mono">
                          HTTP {item.statusCode}
                        </span>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="responseTime"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#latencyGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
