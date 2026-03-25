// ─── CONFIG ──────────────────────────────────────────────────────────────────
export const ES_BASE     = "/es";
export const APP_INDEX   = import.meta.env.VITE_APP_INDEX   ?? "project_logs";
export const NGINX_INDEX = import.meta.env.VITE_NGINX_INDEX ?? "nginx_logs";
export const POLL_MS     = Number(import.meta.env.VITE_POLL_MS ?? 10000);

// ─── NOTE ON ES "JOINS" ──────────────────────────────────────────────────────
// Elasticsearch has no SQL-style joins. Instead:
// 1. Each rule runs TWO queries — one per index — with the correct field names
// 2. Hits are summed and sample events are merged + sorted by timestamp
// 3. IP correlation: top IPs are fetched from both indexes and merged client-side

export const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
export const SEV_COLOR = { critical: "#ff3b3b", high: "#ff8c00", medium: "#f5c518", low: "#4ec9b0" };
export const SEV_BG    = { critical: "rgba(255,59,59,0.12)", high: "rgba(255,140,0,0.12)", medium: "rgba(245,197,24,0.12)", low: "rgba(78,201,176,0.12)" };