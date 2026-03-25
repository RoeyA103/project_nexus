import { useState, useEffect, useCallback, useRef } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const ES_BASE     = "/es";
const APP_INDEX   = import.meta.env.VITE_APP_INDEX   ?? "project_logs";
const NGINX_INDEX = import.meta.env.VITE_NGINX_INDEX ?? "nginx_logs";
const POLL_MS     = Number(import.meta.env.VITE_POLL_MS ?? 10000);

// ─── NOTE ON ES "JOINS" ──────────────────────────────────────────────────────
// Elasticsearch has no SQL-style joins. Instead:
// 1. Each rule runs TWO queries — one per index — with the correct field names
// 2. Hits are summed and sample events are merged + sorted by timestamp
// 3. IP correlation: top IPs are fetched from both indexes and merged client-side

// ─── DETECTION RULES ─────────────────────────────────────────────────────────
// Rule types:
//   queries[]     → [{index, body}] — run on one or both indexes, hits summed
//   agg_queries[] → [{index, body}] — aggregation queries for counting by IP
const DETECTION_RULES = [
  {
    id: "broken_access_admin",
    name: "Broken Access Control — Admin",
    severity: "critical",
    description: "Access to /api/admin/users (unauthenticated)",
    icon: "🔓",
    queries: [
      {
        index: NGINX_INDEX,
        body: {
          size: 5,
          sort: [{ timestamp: { order: "desc" } }],
          query: {
            bool: {
              should: [
                { wildcard: { path: "*admin/users*" } },
                { wildcard: { path: "*admin*" } },
              ],
              minimum_should_match: 1,
            },
          },
        },
      },
      {
        index: APP_INDEX,
        body: {
          size: 5,
          sort: [{ timestamp: { order: "desc" } }],
          query: {
            bool: {
              should: [
                { wildcard: { "details.path.keyword": "*/admin/users*" } },
                { wildcard: { "details.path.keyword": "*/admin/*" } },
              ],
              minimum_should_match: 1,
            },
          },
        },
      },
    ],
  },

  {
    id: "sqli_login",
    name: "SQL Injection — Login",
    severity: "critical",
    description: "POST to /login — possible SQLi payload",
    icon: "💉",
    queries: [
      {
        index: NGINX_INDEX,
        body: {
          size: 5,
          sort: [{ timestamp: { order: "desc" } }],
          query: {
            bool: {
              must: [
                { term: { method: "POST" } },
                {
                  bool: {
                    should: [
                      { wildcard: { path: "*/login*" } },
                      { wildcard: { path: "*/api/login*" } },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        },
      },
      {
        index: APP_INDEX,
        body: {
          size: 5,
          sort: [{ timestamp: { order: "desc" } }],
          query: {
            bool: {
              must: [
                { term: { "details.method.keyword": "POST" } },
                { wildcard: { "details.path.keyword": "*/login*" } },
              ],
            },
          },
        },
      },
    ],
  },

  {
    id: "sqli_products",
    name: "SQL Injection — Products",
    severity: "critical",
    description: "SQLi patterns in /products?search= query",
    icon: "💉",
    queries: [
      {
        index: NGINX_INDEX,
        body: {
          size: 5,
          sort: [{ timestamp: { order: "desc" } }],
          query: {
            bool: {
              must: [{ wildcard: { path: "*/products*" } }],
              should: [
                { wildcard: { path: "*UNION*" } },
                { wildcard: { path: "*SELECT*" } },
                { wildcard: { path: "*DROP*" } },
                { wildcard: { path: "*1%3D1*" } },
                { wildcard: { path: "*%27*" } },
                { wildcard: { path: "*--*" } },
              ],
              minimum_should_match: 1,
            },
          },
        },
      },
      {
        index: APP_INDEX,
        body: {
          size: 5,
          sort: [{ timestamp: { order: "desc" } }],
          query: {
            bool: {
              must: [{ wildcard: { "details.path.keyword": "*/products*" } }],
              should: [
                { wildcard: { "details.path.keyword": "*UNION*" } },
                { wildcard: { "details.path.keyword": "*SELECT*" } },
                { wildcard: { "details.path.keyword": "*DROP*" } },
                { wildcard: { "details.path.keyword": "*1%3D1*" } },
                { wildcard: { "details.path.keyword": "*%27*" } },
              ],
              minimum_should_match: 1,
            },
          },
        },
      },
    ],
  },

  {
    id: "idor_orders",
    name: "IDOR — Orders Enumeration",
    severity: "high",
    description: "user_id parameter manipulation in /orders",
    icon: "🕵️",
    queries: [
      {
        index: NGINX_INDEX,
        body: {
          size: 5,
          sort: [{ timestamp: { order: "desc" } }],
          query: {
            bool: {
              must: [
                { wildcard: { path: "*/orders*" } },
                { wildcard: { path: "*user_id=*" } },
              ],
            },
          },
        },
      },
      {
        index: APP_INDEX,
        body: {
          size: 5,
          sort: [{ timestamp: { order: "desc" } }],
          query: {
            bool: {
              must: [
                { wildcard: { "details.path.keyword": "*/orders*" } },
                { wildcard: { "details.path.keyword": "*user_id=*" } },
              ],
            },
          },
        },
      },
    ],
  },

  {
    id: "sensitive_data_leak",
    name: "Sensitive Data Exposure",
    severity: "critical",
    description: "Successful 200 response from /admin/users (passwords in response)",
    icon: "🔑",
    queries: [
      {
        index: NGINX_INDEX,
        body: {
          size: 5,
          sort: [{ timestamp: { order: "desc" } }],
          query: {
            bool: {
              must: [
                { wildcard: { path: "*/admin/users*" } },
                { term: { status: 200 } },
              ],
            },
          },
        },
      },
      {
        index: APP_INDEX,
        body: {
          size: 5,
          sort: [{ timestamp: { order: "desc" } }],
          query: {
            bool: {
              must: [
                { wildcard: { "details.path.keyword": "*/admin/users*" } },
                { term: { status: "success" } },
              ],
            },
          },
        },
      },
    ],
  },

  {
    id: "brute_force",
    name: "Brute Force — Login",
    severity: "high",
    description: "5+ POST /login attempts in 5 minutes from same IP",
    icon: "🔨",
    agg_queries: [
      {
        index: NGINX_INDEX,
        body: {
          size: 0,
          query: {
            bool: {
              must: [
                {
                  bool: {
                    should: [
                      { wildcard: { path: "*/login*" } },
                      { wildcard: { path: "*/api/login*" } },
                    ],
                    minimum_should_match: 1,
                  },
                },
                { term: { method: "POST" } },
                { range: { timestamp: { gte: "now-5m" } } },
              ],
            },
          },
          aggs: { by_ip: { terms: { field: "ip", min_doc_count: 5 } } },
        },
      },
      {
        index: APP_INDEX,
        body: {
          size: 0,
          query: {
            bool: {
              must: [
                { wildcard: { "details.path.keyword": "*/login*" } },
                { term: { "details.method.keyword": "POST" } },
                { range: { timestamp: { gte: "now-5m" } } },
              ],
            },
          },
          aggs: { by_ip: { terms: { field: "ip", min_doc_count: 5 } } },
        },
      },
    ],
  },

  {
    id: "path_traversal",
    name: "Path Traversal Attempt",
    severity: "high",
    description: "Directory traversal patterns detected",
    icon: "📁",
    queries: [
      {
        index: NGINX_INDEX,
        body: {
          size: 5,
          sort: [{ timestamp: { order: "desc" } }],
          query: {
            bool: {
              should: [
                { wildcard: { path: "*../*" } },
                { wildcard: { path: "*%2e%2e*" } },
                { wildcard: { path: "*etc/passwd*" } },
                { wildcard: { path: "*etc%2fpasswd*" } },
              ],
              minimum_should_match: 1,
            },
          },
        },
      },
      {
        index: APP_INDEX,
        body: {
          size: 5,
          sort: [{ timestamp: { order: "desc" } }],
          query: {
            bool: {
              should: [
                { wildcard: { "details.path.keyword": "*../*" } },
                { wildcard: { "details.path.keyword": "*%2e%2e*" } },
                { wildcard: { "details.path.keyword": "*etc/passwd*" } },
              ],
              minimum_should_match: 1,
            },
          },
        },
      },
    ],
  },

  {
    id: "scanner_detected",
    name: "Automated Scanner",
    severity: "medium",
    description: "Known scanner user-agents or probe paths",
    icon: "🤖",
    queries: [
      {
        // nginx has user_agent — app logs do not
        index: NGINX_INDEX,
        body: {
          size: 5,
          sort: [{ timestamp: { order: "desc" } }],
          query: {
            bool: {
              should: [
                { wildcard: { "user_agent.keyword": "*sqlmap*" } },
                { wildcard: { "user_agent.keyword": "*nikto*" } },
                { wildcard: { "user_agent.keyword": "*nmap*" } },
                { wildcard: { "user_agent.keyword": "*burpsuite*" } },
                { wildcard: { "user_agent.keyword": "*masscan*" } },
                { wildcard: { path: "*/.git*" } },
                { wildcard: { path: "*/.env*" } },
                { wildcard: { path: "*/wp-admin*" } },
                { wildcard: { path: "*/phpmyadmin*" } },
              ],
              minimum_should_match: 1,
            },
          },
        },
      },
      {
        index: APP_INDEX,
        body: {
          size: 5,
          sort: [{ timestamp: { order: "desc" } }],
          query: {
            bool: {
              should: [
                { wildcard: { "details.path.keyword": "*/.git*" } },
                { wildcard: { "details.path.keyword": "*/.env*" } },
                { wildcard: { "details.path.keyword": "*/wp-admin*" } },
                { wildcard: { "details.path.keyword": "*/phpmyadmin*" } },
              ],
              minimum_should_match: 1,
            },
          },
        },
      },
    ],
  },

  {
    id: "error_spike",
    name: "HTTP Error Spike",
    severity: "medium",
    description: "High volume of 4xx/5xx responses — possible scan or attack",
    icon: "📛",
    queries: [
      {
        index: NGINX_INDEX,
        body: {
          size: 5,
          sort: [{ timestamp: { order: "desc" } }],
          query: { bool: { must: [{ range: { status: { gte: 400 } } }] } },
        },
      },
      {
        index: APP_INDEX,
        body: {
          size: 5,
          sort: [{ timestamp: { order: "desc" } }],
          query: {
            bool: {
              should: [
                { term: { status: "failure" } },
                { term: { status: "error" } },
              ],
              minimum_should_match: 1,
            },
          },
        },
      },
    ],
  },
];

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const SEV_COLOR = { critical: "#ff3b3b", high: "#ff8c00", medium: "#f5c518", low: "#4ec9b0" };
const SEV_BG    = { critical: "rgba(255,59,59,0.12)", high: "rgba(255,140,0,0.12)", medium: "rgba(245,197,24,0.12)", low: "rgba(78,201,176,0.12)" };

// ─── ES HELPERS ──────────────────────────────────────────────────────────────
async function esQuery(index, body) {
  try {
    const r = await fetch(`${ES_BASE}/${index}/_search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`ES ${r.status}`);
    return r.json();
  } catch {
    return null;
  }
}

async function getIndexHealth() {
  try {
    const r = await fetch(`${ES_BASE}/_cat/indices/${APP_INDEX},${NGINX_INDEX}?format=json`);
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

// Normalize a raw _source into a common shape regardless of which index it came from
function normalize(src) {
  return {
    timestamp:  src.timestamp,
    ip:         src.ip         ?? "—",
    method:     src.method     ?? src.details?.method      ?? "—",
    path:       src.path       ?? src.details?.path        ?? "—",
    status:     src.status     ?? src.details?.http_status ?? "—",
    user_agent: src.user_agent ?? "—",
    event:      src.event      ?? "—",
    user:       src.user       ?? "—",
  };
}

async function runDetections(since = "now-24h") {
  const results = [];

  for (const rule of DETECTION_RULES) {

    // ── aggregation rules ─────────────────────────────────────────────────
    if (rule.agg_queries) {
      let count = 0;
      const ips = new Set();
      for (const { index, body } of rule.agg_queries) {
        const wrapped = { ...body, query: { bool: { must: [body.query, { range: { timestamp: { gte: since } } }] } } };
        const data = await esQuery(index, wrapped);
        (data?.aggregations?.by_ip?.buckets || []).forEach((b) => { count += b.doc_count; ips.add(b.key); });
      }
      results.push({ ...rule, hits: count, ips: [...ips], triggered: count > 0, lastSeen: count > 0 ? new Date().toISOString() : null, sampleEvents: [] });
      continue;
    }

    // ── normal rules ──────────────────────────────────────────────────────
    let totalHits = 0;
    const events  = [];
    const ips     = new Set();

    for (const { index, body } of rule.queries) {
      const wrapped = { ...body, query: { bool: { must: [body.query, { range: { timestamp: { gte: since } } }] } } };
      const data    = await esQuery(index, wrapped);
      totalHits    += data?.hits?.total?.value ?? 0;
      const hits    = (data?.hits?.hits || []).map((h) => normalize(h._source));
      hits.forEach((e) => { if (e.ip && e.ip !== "—") ips.add(e.ip); });
      events.push(...hits);
    }

    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    results.push({ ...rule, hits: totalHits, triggered: totalHits > 0, lastSeen: events[0]?.timestamp || null, sampleEvents: events.slice(0, 5), ips: [...ips] });
  }

  return results;
}

async function getTimeline() {
  const agg = { size: 0, query: { range: { timestamp: { gte: "now-24h" } } }, aggs: { over_time: { date_histogram: { field: "timestamp", fixed_interval: "1h" } } } };
  const [a, n] = await Promise.all([esQuery(APP_INDEX, agg), esQuery(NGINX_INDEX, agg)]);
  const merged  = {};
  [...(a?.aggregations?.over_time?.buckets || []), ...(n?.aggregations?.over_time?.buckets || [])].forEach((b) => {
    merged[b.key] = (merged[b.key] || 0) + b.doc_count;
  });
  return Object.entries(merged).map(([k, v]) => ({ key: Number(k), doc_count: v })).sort((a, b) => a.key - b.key);
}

async function getTopIPs() {
  const agg = { size: 0, query: { range: { timestamp: { gte: "now-1h" } } }, aggs: { top_ips: { terms: { field: "ip", size: 20 } } } };
  const [a, n] = await Promise.all([esQuery(APP_INDEX, agg), esQuery(NGINX_INDEX, agg)]);
  const counts  = {};
  [...(a?.aggregations?.top_ips?.buckets || []), ...(n?.aggregations?.top_ips?.buckets || [])].forEach((b) => {
    counts[b.key] = (counts[b.key] || 0) + b.doc_count;
  });
  return Object.entries(counts).map(([k, v]) => ({ key: k, doc_count: v })).sort((a, b) => b.doc_count - a.doc_count).slice(0, 10);
}

async function getRecentEvents() {
  const q = { size: 10, sort: [{ timestamp: { order: "desc" } }], query: { match_all: {} } };
  const [a, n] = await Promise.all([esQuery(APP_INDEX, q), esQuery(NGINX_INDEX, q)]);
  return [
    ...(a?.hits?.hits || []).map((h) => normalize(h._source)),
    ...(n?.hits?.hits || []).map((h) => normalize(h._source)),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20);
}

// ─── UI COMPONENTS ───────────────────────────────────────────────────────────
function SparkBar({ value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.6s ease" }} />
    </div>
  );
}

function TimelineChart({ buckets }) {
  if (!buckets || buckets.length === 0)
    return <div style={{ color: "var(--dim)", fontSize: 12, textAlign: "center", padding: "20px 0" }}>No timeline data</div>;
  const maxVal = Math.max(...buckets.map((b) => b.doc_count), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 60, padding: "0 4px" }}>
      {buckets.slice(-24).map((b, i) => {
        const h = Math.max(2, (b.doc_count / maxVal) * 60);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }} title={`${new Date(b.key).getHours()}:00 — ${b.doc_count}`}>
            <div style={{ width: "100%", height: h, background: b.doc_count > 20 ? "#ff3b3b" : "#4ec9b0", borderRadius: "2px 2px 0 0", opacity: 0.85 }} />
          </div>
        );
      })}
    </div>
  );
}

function AlertCard({ rule, onClick, isActive }) {
  const age = rule.lastSeen ? Math.round((Date.now() - new Date(rule.lastSeen)) / 60000) + "m ago" : "—";
  return (
    <div onClick={() => onClick(rule)} style={{ background: isActive ? SEV_BG[rule.severity] : "var(--card)", border: `1px solid ${isActive ? SEV_COLOR[rule.severity] : "var(--border)"}`, borderLeft: `3px solid ${SEV_COLOR[rule.severity]}`, borderRadius: 8, padding: "14px 16px", cursor: "pointer", transition: "all 0.2s", position: "relative" }}>
      {rule.triggered && <div style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: "50%", background: SEV_COLOR[rule.severity], boxShadow: `0 0 8px ${SEV_COLOR[rule.severity]}`, animation: "pulse 1.5s infinite" }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>{rule.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: rule.triggered ? SEV_COLOR[rule.severity] : "var(--text)", fontFamily: "var(--mono)" }}>{rule.name}</span>
      </div>
      <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 8 }}>{rule.description}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: SEV_COLOR[rule.severity], textTransform: "uppercase", background: SEV_BG[rule.severity], padding: "2px 7px", borderRadius: 4 }}>{rule.severity}</span>
        <span style={{ fontSize: 11, fontFamily: "var(--mono)" }}>
          {rule.triggered
            ? <span style={{ color: SEV_COLOR[rule.severity], fontWeight: 700 }}>{rule.hits} hits · {age}</span>
            : <span style={{ color: "#4ec9b0" }}>✓ clean</span>}
        </span>
      </div>
      {rule.triggered && <div style={{ marginTop: 8 }}><SparkBar value={Math.min(rule.hits, 100)} max={100} color={SEV_COLOR[rule.severity]} /></div>}
    </div>
  );
}

function EventRow({ event }) {
  const isAttack = /union|select|drop|1=1|admin|'--|\.\.\/|%2e%2e|\.git|\.env/i.test(event.path);
  const statusNum = Number(event.status);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 70px 100px 1fr 70px", gap: 8, padding: "8px 12px", borderBottom: "1px solid var(--border)", fontSize: 11, fontFamily: "var(--mono)", background: isAttack ? "rgba(255,59,59,0.05)" : "transparent", borderLeft: isAttack ? "2px solid #ff3b3b" : "2px solid transparent" }}>
      <span style={{ color: "var(--dim)" }}>{event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : "—"}</span>
      <span style={{ color: event.method === "POST" ? "#f5c518" : event.method === "DELETE" ? "#ff3b3b" : "#4ec9b0" }}>{event.method}</span>
      <span style={{ color: "var(--dim)" }}>{event.ip}</span>
      <span style={{ color: isAttack ? "#ff3b3b" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={event.path}>{event.path}</span>
      <span style={{ color: statusNum >= 400 ? "#ff3b3b" : statusNum >= 300 ? "#f5c518" : "#4ec9b0" }}>{event.status}</span>
    </div>
  );
}

function DetailPanel({ rule, onClose }) {
  if (!rule) return null;
  const queryList = rule.agg_queries || rule.queries || [];
  return (
    <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 420, background: "var(--panel)", borderLeft: "1px solid var(--border)", zIndex: 100, display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(0,0,0,0.5)" }}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 20, marginBottom: 6 }}>{rule.icon} {rule.name}</div>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: SEV_COLOR[rule.severity], background: SEV_BG[rule.severity], padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>{rule.severity}</span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--dim)", fontSize: 22, cursor: "pointer" }}>×</button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <div style={{ marginBottom: 20, fontSize: 13, lineHeight: 1.6, color: "var(--dim)" }}>{rule.description}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[["Total Hits", rule.hits], ["Unique IPs", rule.ips?.length || 0], ["Last Seen", rule.lastSeen ? new Date(rule.lastSeen).toLocaleTimeString() : "—"], ["Status", rule.triggered ? "🔴 ACTIVE" : "🟢 Clear"]].map(([k, v]) => (
            <div key={k} style={{ background: "var(--card)", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "var(--dim)", marginBottom: 4, textTransform: "uppercase" }}>{k}</div>
              <div style={{ fontSize: 15, fontFamily: "var(--mono)", fontWeight: 700, color: k === "Status" && rule.triggered ? "#ff3b3b" : "var(--text)" }}>{v}</div>
            </div>
          ))}
        </div>
        {rule.ips?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Source IPs</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {rule.ips.map((ip) => <span key={ip} style={{ fontFamily: "var(--mono)", fontSize: 12, background: "rgba(255,59,59,0.15)", color: "#ff3b3b", padding: "3px 10px", borderRadius: 4 }}>{ip}</span>)}
            </div>
          </div>
        )}
        {rule.sampleEvents?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Sample Events (merged)</div>
            {rule.sampleEvents.map((e, i) => (
              <div key={i} style={{ background: "var(--card)", borderRadius: 6, padding: 12, marginBottom: 8, fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.7, border: "1px solid var(--border)" }}>
                <div><span style={{ color: "var(--dim)" }}>time:   </span>{e.timestamp || "—"}</div>
                <div><span style={{ color: "var(--dim)" }}>ip:     </span><span style={{ color: "#ff8c00" }}>{e.ip}</span></div>
                <div><span style={{ color: "var(--dim)" }}>method: </span>{e.method}</div>
                <div><span style={{ color: "var(--dim)" }}>path:   </span><span style={{ color: "#ff3b3b" }}>{e.path}</span></div>
                <div><span style={{ color: "var(--dim)" }}>status: </span>{e.status}</div>
                {e.event !== "—"      && <div><span style={{ color: "var(--dim)" }}>event:  </span>{e.event}</div>}
                {e.user_agent !== "—" && <div style={{ wordBreak: "break-all" }}><span style={{ color: "var(--dim)" }}>ua:     </span>{e.user_agent}</div>}
              </div>
            ))}
          </div>
        )}
        <div>
          <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>ES Queries ({queryList.length} index{queryList.length > 1 ? "es" : ""})</div>
          {queryList.map((q, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: "var(--accent)", marginBottom: 4 }}>Index: {q.index}</div>
              <pre style={{ background: "var(--card)", borderRadius: 6, padding: 10, fontFamily: "var(--mono)", fontSize: 10, overflow: "auto", border: "1px solid var(--border)", color: "var(--dim)", lineHeight: 1.5 }}>
                {JSON.stringify(q.body?.query, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function SecurityDashboard() {
  const [detections,    setDetections]    = useState([]);
  const [timeline,      setTimeline]      = useState([]);
  const [topIPs,        setTopIPs]        = useState([]);
  const [recentEvents,  setRecentEvents]  = useState([]);
  const [selectedRule,  setSelectedRule]  = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [lastRefresh,   setLastRefresh]   = useState(null);
  const [esStatus,      setEsStatus]      = useState("checking");
  const [timeRange,     setTimeRange]     = useState("now-24h");
  const [filter,        setFilter]        = useState("all");
  const [notifications, setNotifications] = useState([]);
  const prevDetections = useRef({});

  const pushNotif = useCallback((msg, sev) => {
    const id = Date.now();
    setNotifications((n) => [...n.slice(-4), { id, msg, sev }]);
    setTimeout(() => setNotifications((n) => n.filter((x) => x.id !== id)), 5000);
  }, []);

  const refresh = useCallback(async () => {
    const health = await getIndexHealth();
    setEsStatus(health ? "connected" : "disconnected");
    const [det, tl, ips, recent] = await Promise.all([runDetections(timeRange), getTimeline(), getTopIPs(), getRecentEvents()]);
    det.forEach((d) => {
      const prev = prevDetections.current[d.id];
      if (d.triggered && (!prev || !prev.triggered)) pushNotif(`${d.icon} ${d.name} detected!`, d.severity);
      prevDetections.current[d.id] = d;
    });
    setDetections(det.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]));
    setTimeline(tl);
    setTopIPs(ips);
    setRecentEvents(recent);
    setLastRefresh(new Date());
    setLoading(false);
  }, [timeRange, pushNotif]);

  useEffect(() => { refresh(); const id = setInterval(refresh, POLL_MS); return () => clearInterval(id); }, [refresh]);

  const critical  = detections.filter((d) => d.triggered && d.severity === "critical");
  const high      = detections.filter((d) => d.triggered && d.severity === "high");
  const allActive = detections.filter((d) => d.triggered);
  const filtered  = filter === "active" ? detections.filter((d) => d.triggered) : filter !== "all" ? detections.filter((d) => d.severity === filter) : detections;
  const maxIP     = topIPs[0]?.doc_count || 1;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@400;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#0a0c0f;--panel:#0f1217;--card:#141820;--border:rgba(255,255,255,0.07);--text:#e8eaf0;--dim:#5a6070;--accent:#4ec9b0;--mono:'JetBrains Mono',monospace;--sans:'Syne',sans-serif}
        body{background:var(--bg);color:var(--text);font-family:var(--sans)}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:var(--bg)}
        ::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.3)}}
        @keyframes slideIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        .notif{animation:slideIn 0.3s ease}
        .card-hover:hover{border-color:rgba(255,255,255,0.15)!important}
      `}</style>

      {/* Notifications */}
      <div style={{ position: "fixed", top: 16, right: selectedRule ? 440 : 16, zIndex: 200, display: "flex", flexDirection: "column", gap: 8 }}>
        {notifications.map((n) => (
          <div key={n.id} className="notif" style={{ background: SEV_BG[n.sev], border: `1px solid ${SEV_COLOR[n.sev]}`, borderRadius: 8, padding: "10px 16px", fontSize: 13, color: SEV_COLOR[n.sev], fontFamily: "var(--mono)", fontWeight: 600, maxWidth: 300 }}>
            {n.msg}
          </div>
        ))}
      </div>

      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <header style={{ borderBottom: "1px solid var(--border)", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--panel)", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 18, fontWeight: 700 }}>
              <span style={{ color: "#ff3b3b" }}>⬡</span> SEC<span style={{ color: "var(--dim)" }}>/</span>WATCH
            </div>
            <div style={{ width: 1, height: 20, background: "var(--border)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: esStatus === "connected" ? "#4ec9b0" : "#ff3b3b", animation: esStatus === "connected" ? "pulse 2s infinite" : "none" }} />
              <span style={{ color: "var(--dim)", fontFamily: "var(--mono)", fontSize: 12 }}>ES {esStatus}</span>
            </div>
            <span style={{ color: "var(--dim)", fontFamily: "var(--mono)", fontSize: 11 }}>{APP_INDEX} + {NGINX_INDEX}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 6, padding: "5px 10px", fontSize: 12, fontFamily: "var(--mono)", cursor: "pointer" }}>
              <option value="now-15m">Last 15m</option>
              <option value="now-1h">Last 1h</option>
              <option value="now-6h">Last 6h</option>
              <option value="now-24h">Last 24h</option>
            </select>
            <button onClick={refresh} style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--accent)", borderRadius: 6, padding: "5px 14px", fontSize: 12, fontFamily: "var(--mono)", cursor: "pointer" }}>↺ Refresh</button>
            <span style={{ fontSize: 11, color: "var(--dim)", fontFamily: "var(--mono)" }}>{lastRefresh ? lastRefresh.toLocaleTimeString() : "—"}</span>
          </div>
        </header>

        <div style={{ flex: 1, padding: 24, maxWidth: selectedRule ? "calc(100% - 420px)" : "100%", transition: "max-width 0.3s" }}>

          {/* Alert banner */}
          {allActive.length > 0 && (
            <div style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: 8, padding: "10px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12, animation: "fadeIn 0.3s ease" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff3b3b", animation: "pulse 1s infinite" }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, color: "#ff3b3b" }}>{allActive.length} ACTIVE ALERT{allActive.length > 1 ? "S" : ""}</span>
              <span style={{ color: "var(--dim)", fontSize: 12 }}>
                {critical.length > 0 && `${critical.length} critical`}
                {critical.length > 0 && high.length > 0 && " · "}
                {high.length > 0 && `${high.length} high`}
              </span>
            </div>
          )}

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Active Alerts", value: allActive.length, color: allActive.length > 0 ? "#ff3b3b" : "#4ec9b0", icon: "🚨" },
              { label: "Critical",      value: critical.length,  color: critical.length  > 0 ? "#ff3b3b" : "var(--dim)", icon: "💀" },
              { label: "High",          value: high.length,      color: high.length      > 0 ? "#ff8c00" : "var(--dim)", icon: "⚠️" },
              { label: "Unique IPs",    value: topIPs.length,    color: "var(--accent)", icon: "🌐" },
            ].map((k) => (
              <div key={k.label} className="card-hover" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px", transition: "all 0.2s" }}>
                <div style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{k.icon} {k.label}</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: k.color, fontFamily: "var(--mono)", lineHeight: 1 }}>{loading ? "—" : k.value}</div>
              </div>
            ))}
          </div>

          {/* Main grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, marginBottom: 20 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1 }}>Detection Rules</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {["all", "active", "critical", "high", "medium"].map((f) => (
                    <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? "var(--card)" : "none", border: filter === f ? "1px solid var(--border)" : "1px solid transparent", color: filter === f ? "var(--text)" : "var(--dim)", borderRadius: 5, padding: "3px 10px", fontSize: 11, fontFamily: "var(--mono)", cursor: "pointer", textTransform: "uppercase" }}>{f}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {loading
                  ? Array(8).fill(0).map((_, i) => <div key={i} style={{ background: "var(--card)", borderRadius: 8, height: 110, border: "1px solid var(--border)", opacity: 0.4 }} />)
                  : filtered.map((rule) => <AlertCard key={rule.id} rule={rule} onClick={setSelectedRule} isActive={selectedRule?.id === rule.id} />)
                }
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 11, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>📊 Event Volume 24h (both indexes)</div>
                <TimelineChart buckets={timeline} />
              </div>
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, flex: 1 }}>
                <div style={{ fontSize: 11, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>🌐 Top IPs 1h (merged)</div>
                {topIPs.length === 0
                  ? <div style={{ color: "var(--dim)", fontSize: 12, textAlign: "center", padding: "20px 0" }}>No data</div>
                  : topIPs.slice(0, 8).map((b) => (
                    <div key={b.key} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{b.key}</span>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)" }}>{b.doc_count}</span>
                      </div>
                      <SparkBar value={b.doc_count} max={maxIP} color={b.doc_count > maxIP * 0.7 ? "#ff3b3b" : b.doc_count > maxIP * 0.4 ? "#ff8c00" : "#4ec9b0"} />
                    </div>
                  ))
                }
              </div>
            </div>
          </div>

          {/* Event feed */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontSize: 11, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1 }}>📋 Live Feed (both indexes merged)</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)" }}>time · method · ip · path · status</div>
            </div>
            <div style={{ maxHeight: 280, overflow: "auto" }}>
              {recentEvents.length === 0
                ? <div style={{ padding: 24, textAlign: "center", color: "var(--dim)", fontSize: 13 }}>{loading ? "Loading..." : "No events"}</div>
                : recentEvents.map((e, i) => <EventRow key={i} event={e} />)
              }
            </div>
          </div>

          <div style={{ marginTop: 20, textAlign: "center", color: "var(--dim)", fontSize: 11, fontFamily: "var(--mono)" }}>
            sec/watch · {POLL_MS / 1000}s poll · {APP_INDEX} + {NGINX_INDEX}
          </div>
        </div>
      </div>

      {selectedRule && <DetailPanel rule={selectedRule} onClose={() => setSelectedRule(null)} />}
    </>
  );
}
