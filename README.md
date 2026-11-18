# 📡 PulseWatch — Website & API Monitoring and Status Page Platform

> A modern, real-time website and API availability monitoring platform inspired by **Uptime Kuma** and **Better Stack**, built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Prisma ORM**.

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2d3748?logo=prisma)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

---

## 🌟 Overview & Key Highlights

PulseWatch allows website owners, developers, and DevOps teams to register endpoints, run scheduled availability checks, visualize latency trends and heartbeats, automatically track incident lifecycles with AI-assisted post-mortems, and share high-availability public status pages.

### 🖼️ Design & Aesthetics
Inspired directly by **Uptime Kuma**'s sleek dark UI:
- **Heartbeat Bars**: Visual micro-pills showing recent checks (Green = UP, Amber = DEGRADED, Red = DOWN) with hover details.
- **5-Metric KPI Cards**: Current Response Latency, 24-Hour Average Latency, 24-Hour Uptime %, 30-Day Uptime %, and Longest Recorded Downtime.
- **Interactive Response Time Charts**: High-resolution latency curves over time rendered with Recharts.
- **Live Auto-Refresh**: Background polling keeps the console synchronized with live probe results.

---

## 🚀 Core Features

### 1. Website & API Management
- **Endpoint Registration**: Monitor websites, REST APIs, or health endpoints.
- **Configurable Parameters**:
  - Name, URL, description, and monitoring type (`HTTPS`, `HTTP`, `API`, `KEYWORD`).
  - HTTP Methods: `GET`, `POST`, `HEAD`, `PUT`.
  - Custom Request Headers (JSON) & Request Body.
  - Expected Status Codes (default `200` or custom like `201`, `204`).
  - Keyword Matching: validates that a specific token is present in the response body.
  - Heartbeat Intervals: `10s`, `30s`, `60s (1m)`, `2m`, `5m`, `10m`.
  - Latency Thresholds: marks status as **DEGRADED** when response time exceeds threshold (e.g. `> 1500ms`).
  - Request Timeouts: configurable per-endpoint (default `10,000ms`).
- **Endpoint Organization**: Group endpoints into Projects or Teams (e.g., *Production Cloud*, *Core Infrastructure*).
- **Pause / Resume**: Temporarily suspend monitoring checks without deleting history.

### 2. Robust SSRF Security Protection
To prevent **Server-Side Request Forgery (SSRF)**, user-supplied URLs undergo strict validation before saving and probing:
- Only `http:` and `https:` protocols are permitted.
- Hostnames resolving to private networks (RFC 1918: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) are blocked.
- Loopback addresses (`127.0.0.1`, `localhost`, `::1`) are forbidden.
- Cloud provider metadata endpoints (such as AWS/GCP/Azure link-local `169.254.169.254` and `metadata.google.internal`) are strictly rejected.
- DNS pre-resolution verifies every resolved IP address before issuing outbound connections.

### 3. Availability Monitoring Engine
- **Decoupled Execution**: Dashboard visits do not run checks; checks are scheduled through two operational modes:
  1. **Continuous Background Worker**: Standalone scheduler daemon (`npm run worker`) using `node-cron`.
  2. **Cron Trigger API**: `/api/cron` endpoint (secured via `Bearer` token or secret) for serverless schedulers (Vercel Cron, GitHub Actions, cron-job.org).
- **Overlapping Check Prevention**: In-memory and state locks ensure an endpoint is not probed redundantly if a previous check is still in flight.
- **High-Resolution Latency**: Measures precise network roundtrip and time-to-first-byte (TTFB).

### 4. Incident Management & Automated AI RCA
- **Automated Outage Detection**: Automatically creates an incident with `INVESTIGATING` status when an endpoint returns an error code or times out.
- **Automated Recovery Resolution**: When the endpoint recovers, the active incident is automatically marked `RESOLVED`, recording the exact resolution timestamp and downtime duration.
- **Timeline Updates**: Operators can add investigation progress updates (`INVESTIGATING` → `IDENTIFIED` → `MONITORING` → `RESOLVED`).
- **AI-Powered Root Cause Analysis (RCA)**: One-click generation of comprehensive post-mortems analyzing HTTP error codes (500, 502, 503, 504), network timeouts, latency spikes, and actionable remediation checklists.

### 5. Public Status Pages
- **Public URL**: Shareable status page at `/status/:slug` (e.g., `/status/default`).
- **System Health Banner**: Dynamic banner indicating *All Systems Operational*, *Degraded Performance*, *Partial Outage*, or *Major Outage*.
- **30-Day Daily Uptime Timeline**: Daily availability blocks for every service (Better Stack style).
- **Active & Past Incidents**: Incident updates timeline and post-mortem notes.
- **Customizable Announcements**: Publish maintenance announcements or notices with priority levels.

### 6. Built-in Mock Test Endpoints
For testing outage and recovery workflows without needing external broken endpoints:
- `GET /api/mock/healthy`: Returns HTTP 200 in ~35ms.
- `GET /api/mock/slow`: Artificially delayed by 1600ms (triggers **DEGRADED** status).
- `GET /api/mock/down`: Returns HTTP 503 Service Unavailable (triggers **DOWN** status and creates an Incident).
- `GET /api/mock/flaky`: Randomly returns HTTP 200 (65%) or HTTP 500 (35%).

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router, Server & Client Components) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS (Dark Mode, Uptime Kuma Palette) |
| **Database** | SQLite (local) / PostgreSQL (production) via Prisma ORM |
| **Icons** | Lucide React |
| **Charts** | Recharts (Responsive AreaChart & Cartesian Grids) |
| **Scheduler** | node-cron (Continuous Worker) + `/api/cron` (Serverless Webhook) |
| **Security** | ipaddr.js + dns lookup SSRF guard |

---

## 💻 Getting Started Locally

### 1. Clone the repository
```bash
git clone <repository-url>
cd DiwaliAssignment
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file in the project root:
```env
DATABASE_URL="file:./dev.db"
CRON_SECRET="pulsewatch_secret_token_2026"
ALLOW_LOCAL_MOCK="true"
PORT=3000
```

### 4. Push database schema and seed sample data
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 5. Start the Next.js development server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 6. (Optional) Run the continuous background monitoring worker
In a separate terminal:
```bash
npm run worker
```
The worker evaluates due monitors every 10 seconds. Alternatively, trigger checks on demand from the UI via the **Run Check Sweep** button or via `curl http://localhost:3000/api/cron`.

---

## 🧪 Testing Core Workflows

1. **Test Normal Monitoring**: View the pre-seeded *Cloudflare DNS* and *GitHub Zen API* monitors in the sidebar. Notice the green 100% uptime badges and heartbeat bars.
2. **Test Outage Detection**: Select the *Elasticsearch Index Cluster* monitor (points to `/api/mock/down`). Notice the red **DOWN** status and the active incident created under `/incidents`.
3. **Test Latency Degradation**: Select the *Billing & Invoicing API* (points to `/api/mock/slow`). Notice the amber **DEGRADED** status triggered because latency (>1600ms) exceeds the 1000ms threshold.
4. **Test Immediate Check**: Click the **Check Now** button on any monitor to trigger an instant real-time probe.
5. **Test SSRF Protection**: Click **Add New Monitor**, enter `http://169.254.169.254/latest/meta-data`, and submit. The system rejects the request with an explicit SSRF security error.
6. **Test AI Incident Analysis**: Navigate to `/incidents` and click **Generate AI Root Cause Analysis** to view an executive summary and recommended action items.
7. **Test Public Status Page**: Open `/status/default` to inspect the public-facing availability status and 30-day uptime bars.

---

## ☁️ Deployment Guide (Vercel)

1. **Repository**: Push the code to GitHub:
   ```bash
   git add .
   git commit -m "feat: complete website monitoring and status page platform"
   git push origin main
   ```

2. **Database for Vercel**:
   - For persistent cloud storage on Vercel, connect a PostgreSQL database (such as **Neon**, **Supabase**, or **Vercel Postgres**).
   - In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
   - Set the `DATABASE_URL` environment variable in your Vercel project settings.

3. **Scheduled Checks on Vercel**:
   - Configure a **Vercel Cron Job** via `vercel.json`:
     ```json
     {
       "crons": [
         {
           "path": "/api/cron",
           "schedule": "* * * * *"
         }
       ]
     }
     ```
   - Or connect an external cron service (such as [cron-job.org](https://cron-job.org/)) calling `https://<your-vercel-app>.vercel.app/api/cron?secret=pulsewatch_secret_token_2026` every minute.

---

## 📄 License
MIT License. Created for the Diwali Assignment submission.
