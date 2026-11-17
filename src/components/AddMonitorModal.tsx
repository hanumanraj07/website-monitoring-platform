"use client";

import React, { useState, useEffect } from "react";
import { X, ShieldAlert, Plus, Layers, Globe, Clock, Terminal } from "lucide-react";

interface AddMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any | null;
  projects: { id: string; name: string }[];
}

export function AddMonitorModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  projects = [],
}: AddMonitorModalProps) {
  const isEditing = Boolean(initialData);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("HTTPS");
  const [method, setMethod] = useState("GET");
  const [expectedStatusCode, setExpectedStatusCode] = useState("200");
  const [keyword, setKeyword] = useState("");
  const [interval, setIntervalVal] = useState("60");
  const [timeout, setTimeoutVal] = useState("10000");
  const [degradedThreshold, setDegradedThreshold] = useState("1500");
  const [projectId, setProjectId] = useState("");
  const [headers, setHeaders] = useState("");
  const [requestBody, setRequestBody] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Prefill when editing
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setUrl(initialData.url || "");
      setDescription(initialData.description || "");
      setType(initialData.type || "HTTPS");
      setMethod(initialData.method || "GET");
      setExpectedStatusCode(String(initialData.expectedStatusCode || 200));
      setKeyword(initialData.keyword || "");
      setIntervalVal(String(initialData.interval || 60));
      setTimeoutVal(String(initialData.timeout || 10000));
      setDegradedThreshold(String(initialData.degradedThreshold || 1500));
      setProjectId(initialData.projectId || "");
      setHeaders(initialData.headers || "");
      setRequestBody(initialData.body || "");
    } else {
      setName("");
      setUrl("");
      setDescription("");
      setType("HTTPS");
      setMethod("GET");
      setExpectedStatusCode("200");
      setKeyword("");
      setIntervalVal("60");
      setTimeoutVal("10000");
      setDegradedThreshold("1500");
      setProjectId(projects[0]?.id || "");
      setHeaders("");
      setRequestBody("");
    }
    setErrorMsg(null);
  }, [initialData, projects, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name,
        url,
        description,
        type,
        method,
        expectedStatusCode: Number(expectedStatusCode),
        keyword: keyword ? keyword : null,
        interval: Number(interval),
        timeout: Number(timeout),
        degradedThreshold: Number(degradedThreshold),
        projectId: projectId ? projectId : null,
        headers: headers ? headers : null,
        requestBody: requestBody ? requestBody : null,
      };

      const endpoint = isEditing
        ? `/api/monitors/${initialData.id}`
        : `/api/monitors`;
      const httpMethod = isEditing ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method: httpMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save monitor");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error saving monitor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#161b22] border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0d1117]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditing ? "Edit Monitor Configuration" : "Add New Endpoint Monitor"}
              </h3>
              <p className="text-xs text-slate-400">
                Track uptime, response times, and alert on incidents
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick presets for testing */}
          {!isEditing && (
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-1.5">
              <span className="text-slate-400 font-medium">Quick Test Endpoints:</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setName("Cloudflare DNS");
                    setUrl("https://1.1.1.1");
                    setType("HTTPS");
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] border border-slate-700"
                >
                  Cloudflare 1.1.1.1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setName("GitHub Zen API");
                    setUrl("https://api.github.com/zen");
                    setType("API");
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] border border-slate-700"
                >
                  GitHub Zen API
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setName("Simulated Flaky Service");
                    setUrl("http://localhost:3000/api/mock/flaky");
                    setType("API");
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 text-[11px] border border-slate-700"
                >
                  Mock Flaky API
                </button>
              </div>
            </div>
          )}

          {/* Name & URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Friendly Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production API Gateway"
                className="w-full bg-[#0d1117] border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Project / Group
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-[#0d1117] border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">No Project (Ungrouped)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* URL Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Endpoint URL <span className="text-rose-400">*</span></span>
              <span className="text-[10px] text-slate-400">SSRF Guard Protected</span>
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/api/v1/health"
              className="w-full bg-[#0d1117] border border-slate-700 rounded-md px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Primary health check for customer backend"
              className="w-full bg-[#0d1117] border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Check Parameters Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-[#0d1117] border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="HTTPS">HTTPS</option>
                <option value="HTTP">HTTP</option>
                <option value="API">API</option>
                <option value="KEYWORD">Keyword Match</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full bg-[#0d1117] border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="HEAD">HEAD</option>
                <option value="PUT">PUT</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Expected Code</label>
              <input
                type="number"
                value={expectedStatusCode}
                onChange={(e) => setExpectedStatusCode(e.target.value)}
                className="w-full bg-[#0d1117] border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Interval</label>
              <select
                value={interval}
                onChange={(e) => setIntervalVal(e.target.value)}
                className="w-full bg-[#0d1117] border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="10">10 seconds</option>
                <option value="30">30 seconds</option>
                <option value="60">60 seconds (1m)</option>
                <option value="120">2 minutes</option>
                <option value="300">5 minutes</option>
                <option value="600">10 minutes</option>
              </select>
            </div>
          </div>

          {/* Thresholds Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Degraded Latency Threshold (ms)
              </label>
              <input
                type="number"
                value={degradedThreshold}
                onChange={(e) => setDegradedThreshold(e.target.value)}
                placeholder="1500"
                className="w-full bg-[#0d1117] border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Request Timeout (ms)
              </label>
              <input
                type="number"
                value={timeout}
                onChange={(e) => setTimeoutVal(e.target.value)}
                placeholder="10000"
                className="w-full bg-[#0d1117] border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Keyword Match (if selected or typed) */}
          <div className="space-y-1 pt-1">
            <label className="text-xs font-semibold text-slate-300">
              Keyword Verification (Optional)
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Text that MUST appear in HTTP response body"
              className="w-full bg-[#0d1117] border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Custom Headers */}
          <div className="space-y-1 pt-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Custom HTTP Headers (JSON)</span>
              <span className="text-[10px] text-slate-500">{`{"Authorization": "Bearer token"}`}</span>
            </label>
            <textarea
              rows={2}
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              placeholder={`{\n  "Authorization": "Bearer secret_api_key",\n  "X-Custom-Header": "value"\n}`}
              className="w-full bg-[#0d1117] border border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-md text-xs font-bold bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-black shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {isSubmitting
                ? "Saving & Validating..."
                : isEditing
                ? "Save Changes"
                : "Create Monitor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
