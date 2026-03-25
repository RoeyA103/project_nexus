import { useState, useEffect, useCallback, useRef } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const ES_BASE     = "/es";
const APP_INDEX   = import.meta.env.VITE_APP_INDEX   ?? "project_logs";
const NGINX_INDEX = import.meta.env.VITE_NGINX_INDEX ?? "project_logs";
const POLL_MS     = Number(import.meta.env.VITE_POLL_MS ?? 10000);

// ─── ATTACK DETECTION RULES ──────────────────────────────────────────────────
const DETECTION_RULES = [
  {
    id: "broken_access_admin",
    name: "Broken Access Control — Admin Endpoint",
    severity: "critical",
    description: "Access to /api/admin/users",
    icon: "🔓",
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
  {
    id: "sqli_login",
    name: "SQL Injection — Login",
    severity: "critical",
    description: "SQLi pattern in login request",
    icon: "💉",
    query: {
      bool: {
        must: [
          { wildcard: { "details.path.keyword": "*/login*" } },
          { term: { "details.method.keyword": "POST" } },
        ],
      },
    },
  },
  {
    id: "sqli_products",
    name: "SQL Injection — Products Search",
    severity: "critical",
    description: "SQLi pattern in products search",
    icon: "💉",
    query: {
      bool: {
        must: [
          { wildcard: { "details.path.keyword": "*/products*" } },
        ],
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
  {
    id: "idor_orders",
    name: "IDOR — Orders Enumeration",
    severity: "high",
    description: "user_id manipulation in orders endpoint",
    icon: "🕵️",
    query: {
      bool: {
        must: [
          { wildcard: { "details.path.keyword": "*/orders*" } },
          { wildcard: { "details.path.keyword": "*user_id=*" } },
        ],
      },
    },
  },
  {
    id: "brute_force",
    name: "Brute Force — Login",
    severity: "high",
    description: "High rate of POSTs to login from same IP",
    icon: "🔨",
    agg_query: {
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
      aggs: {
        by_ip: {
          terms: { field: "ip", min_doc_count: 5 },
        },
      },
    },
  },
  {
    id: "sensitive_data_leak",
    name: "Sensitive Data Exposure",
    severity: "critical",
    description: "Successful response from admin/users",
    icon: "🔑",
    query: {
      bool: {
        must: [
          { wildcard: { "details.path.keyword": "*/admin/users*" } },
          { term: { status: "success" } },
        ],
      },
    },
  },
  {
    id: "path_traversal",
    name: "Path Traversal Attempt",
    severity: "high",
    description: "Directory traversal patterns in path",
    icon: "📁",
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
  {
    id: "scanner_detected",
    name: "Automated Scanner",
    severity: "medium",
    description: "Scanner paths or known probe endpoints",
    icon: "🤖",
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
];

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const SEV_COLOR = {
  critical: "#ff3b3b",
  high: "#ff8c00",
  medium: "#f5c518",
  low: "#4ec9b0",
};
const SEV_BG = {
  critical: "rgba(255,59,59,0.12)",
  high: "rgba(255,140,0,0.12)",
  medium: "rgba(245,197,24,0.12)",
  low: "rgba(78,201,176,0.12)",
};

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
  } catch (e) {
    return null;
  }
}

async function getIndexHealth() {
  try {
    const r = await fetch(`${ES_BASE}/_cat/indices/${APP_INDEX}?format=json`);
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

async function runDetections(since = "now-24h") {
  const results = [];
  for (const rule of DETECTION_RULES) {
    if (rule.agg_query) {
      const data = await esQuery(APP_INDEX, rule.agg_query);
      const buckets = data?.aggregations?.by_ip?.buckets || [];
      const count = buckets.reduce((s, b) => s + b.doc_count, 0);
      results.push({
        ...rule,
        hits: count,
        ips: buckets.map((b) => b.key),
        triggered: count > 0,
        lastSeen: count > 0 ? new Date().toISOString() : null,
        sampleEvents: [],
      });
    } else {
      const body = {
        size: 5,
        sort: [{ timestamp: { order: "desc" } }],
        query: {
          bool: {
            must: [
              { range: { timestamp: { gte: since } } },
              rule.query,
            ],
          },
        },
      };
      const data = await esQuery(APP_INDEX, body);
      const hits = data?.hits?.total?.value ?? 0;
      const events = data?.hits?.hits?.map((h) => h._source) || [];
      results.push({
        ...rule,
        hits,
        triggered: hits > 0,
        lastSeen: events[0]?.timestamp || null,
        sampleEvents: events,
        ips: [...new Set(events.map((e) => e.ip).filter(Boolean))],
      });
    }
  }
  return results;
}

async function getTimeline() {
  const body = {
    size: 0,
    query: { range: { timestamp: { gte: "now-24h" } } },
    aggs: {
      over_time: {
        date_histogram: { field: "timestamp", fixed_interval: "1h" },
      },
    },
  };
  return esQuery(APP_INDEX, body);
}

async function getTopIPs() {
  const body = {
    size: 0,
    query: { range: { timestamp: { gte: "now-1h" } } },
    aggs: {
      top_ips: { terms: { field: "ip", size: 10 } },
    },
  };
  return esQuery(APP_INDEX, body);
}

async function getRecentEvents() {
  return esQuery(APP_INDEX, {
    size: 20,
    sort: [{ timestamp: { order: "desc" } }],
    query: { match_all: {} },
  });
}

// ─── MINI CHART ──────────────────────────────────────────────────────────────
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
    return (
      <div style={{ color: "var(--dim)", fontSize: 12, textAlign: "center", padding: "20px 0" }}>
        No timeline data
      </div>
    );
  const maxVal = Math.max(...buckets.map((b) => b.doc_count), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 60, padding: "0 4px" }}>
      {buckets.slice(-24).map((b, i) => {
        const h = Math.max(2, (b.doc_count / maxVal) * 60);
        const time = new Date(b.key_as_string || b.key).getHours() + ":00";
        return (
          <div
            key={i}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}
            title={`${time}: ${b.doc_count} events`}
          >
            <div
              style={{
                width: "100%",
                height: h,
                background: b.doc_count > 10 ? "#ff3b3b" : "#4ec9b0",
                borderRadius: "2px 2px 0 0",
                opacity: 0.85,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────
function AlertCard({ rule, onClick, isActive }) {
  const age = rule.lastSeen
    ? Math.round((Date.now() - new Date(rule.lastSeen)) / 1000 / 60) + "m ago"
    : "—";
  return (
    <div
      onClick={() => onClick(rule)}
      style={{
        background: isActive ? SEV_BG[rule.severity] : "var(--card)",
        border: `1px solid ${isActive ? SEV_COLOR[rule.severity] : "var(--border)"}`,
        borderLeft: `3px solid ${SEV_COLOR[rule.severity]}`,
        borderRadius: 8,
        padding: "14px 16px",
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {rule.triggered && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: SEV_COLOR[rule.severity],
            boxShadow: `0 0 8px ${SEV_COLOR[rule.severity]}`,
            animation: "pulse 1.5s infinite",
          }}
        />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>{rule.icon}</span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: rule.triggered ? SEV_COLOR[rule.severity] : "var(--text)",
            fontFamily: "var(--mono)",
          }}
        >
          {rule.name}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 8 }}>{rule.description}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1,
            color: SEV_COLOR[rule.severity],
            textTransform: "uppercase",
            background: SEV_BG[rule.severity],
            padding: "2px 7px",
            borderRadius: 4,
          }}
        >
          {rule.severity}
        </span>
        <span style={{ fontSize: 11, color: "var(--dim)", fontFamily: "var(--mono)" }}>
          {rule.triggered ? (
            <span style={{ color: SEV_COLOR[rule.severity], fontWeight: 700 }}>
              {rule.hits} hits · {age}
            </span>
          ) : (
            <span style={{ color: "#4ec9b0" }}>✓ clean</span>
          )}
        </span>
      </div>
      {rule.triggered && rule.hits > 0 && (
        <div style={{ marginTop: 8 }}>
          <SparkBar value={Math.min(rule.hits, 100)} max={100} color={SEV_COLOR[rule.severity]} />
        </div>
      )}
    </div>
  );
}

function EventRow({ event }) {
  const path = event.details?.path || event.path || "";
  const method = event.details?.method || event.method || "";
  const httpStatus = event.details?.http_status || event.status || "";
  const isAttack =
    /union|select|drop|insert|1=1|'--|admin/i.test(path) ||
    /\.\.\/|%2e%2e|\.git|\.env/i.test(path);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 70px 80px 1fr 80px",
        gap: 8,
        padding: "8px 12px",
        borderBottom: "1px solid var(--border)",
        fontSize: 11,
        fontFamily: "var(--mono)",
        background: isAttack ? "rgba(255,59,59,0.05)" : "transparent",
        borderLeft: isAttack ? "2px solid #ff3b3b" : "2px solid transparent",
      }}
    >
      <span style={{ color: "var(--dim)" }}>
        {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : "—"}
      </span>
      <span
        style={{
          color:
            method === "POST" ? "#f5c518" : method === "DELETE" ? "#ff3b3b" : "#4ec9b0",
        }}
      >
        {method || "—"}
      </span>
      <span style={{ color: "var(--dim)" }}>{event.ip || "—"}</span>
      <span
        style={{
          color: isAttack ? "#ff3b3b" : "var(--text)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={path}
      >
        {path || "—"}
      </span>
      <span
        style={{
          color:
            httpStatus >= 400 ? "#ff3b3b" : httpStatus >= 300 ? "#f5c518" : "#4ec9b0",
        }}
      >
        {httpStatus || "—"}
      </span>
    </div>
  );
}

function DetailPanel({ rule, onClose }) {
  if (!rule) return null;
  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        bottom: 0,
        width: 400,
        background: "var(--panel)",
        borderLeft: "1px solid var(--border)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div style={{ fontSize: 22, marginBottom: 6 }}>
            {rule.icon} {rule.name}
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              color: SEV_COLOR[rule.severity],
              background: SEV_BG[rule.severity],
              padding: "3px 8px",
              borderRadius: 4,
              textTransform: "uppercase",
            }}
          >
            {rule.severity}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--dim)",
            fontSize: 20,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--dim)",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Description
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>{rule.description}</div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--dim)",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Stats
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              ["Total Hits", rule.hits],
              ["Unique IPs", rule.ips?.length || 0],
              ["Last Seen", rule.lastSeen ? new Date(rule.lastSeen).toLocaleTimeString() : "—"],
              ["Status", rule.triggered ? "🔴 ACTIVE" : "🟢 Clear"],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{ background: "var(--card)", borderRadius: 8, padding: "12px 14px" }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--dim)",
                    marginBottom: 4,
                    textTransform: "uppercase",
                  }}
                >
                  {k}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontFamily: "var(--mono)",
                    fontWeight: 700,
                    color: k === "Status" && rule.triggered ? "#ff3b3b" : "var(--text)",
                  }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>
        </div>
        {rule.ips?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 11,
                color: "var(--dim)",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Source IPs
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {rule.ips.map((ip) => (
                <span
                  key={ip}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                    background: "rgba(255,59,59,0.15)",
                    color: "#ff3b3b",
                    padding: "3px 10px",
                    borderRadius: 4,
                  }}
                >
                  {ip}
                </span>
              ))}
            </div>
          </div>
        )}
        {rule.sampleEvents?.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 11,
                color: "var(--dim)",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Sample Events
            </div>
            {rule.sampleEvents.map((e, i) => (
              <div
                key={i}
                style={{
                  background: "var(--card)",
                  borderRadius: 6,
                  padding: 12,
                  marginBottom: 8,
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  lineHeight: 1.7,
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <span style={{ color: "var(--dim)" }}>time: </span>
                  {e.timestamp || "—"}
                </div>
                <div>
                  <span style={{ color: "var(--dim)" }}>ip: </span>
                  <span style={{ color: "#ff8c00" }}>{e.ip || "—"}</span>
                </div>
                <div>
                  <span style={{ color: "var(--dim)" }}>path: </span>
                  <span style={{ color: "#ff3b3b" }}>{e.details?.path || "—"}</span>
                </div>
                <div>
                  <span style={{ color: "var(--dim)" }}>method: </span>
                  {e.details?.method || "—"}
                </div>
                <div>
                  <span style={{ color: "var(--dim)" }}>status: </span>
                  {e.details?.http_status || e.status || "—"}
                </div>
                <div>
                  <span style={{ color: "var(--dim)" }}>event: </span>
                  {e.event || "—"}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--dim)",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            ES Query
          </div>
          <pre
            style={{
              background: "var(--card)",
              borderRadius: 6,
              padding: 12,
              fontFamily: "var(--mono)",
              fontSize: 10,
              overflow: "auto",
              border: "1px solid var(--border)",
              color: "var(--dim)",
              lineHeight: 1.5,
            }}
          >
            {JSON.stringify(rule.agg_query || rule.query, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
export default function SecurityDashboard() {
  const [detections, setDetections] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [topIPs, setTopIPs] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [selectedRule, setSelectedRule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [esStatus, setEsStatus] = useState("checking");
  const [timeRange, setTimeRange] = useState("now-24h");
  const [filter, setFilter] = useState("all");
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

    const [det, tl, ips, recent] = await Promise.all([
      runDetections(timeRange),
      getTimeline(),
      getTopIPs(),
      getRecentEvents(),
    ]);

    det.forEach((d) => {
      const prev = prevDetections.current[d.id];
      if (d.triggered && (!prev || !prev.triggered)) {
        pushNotif(`${d.icon} ${d.name} detected!`, d.severity);
      }
      prevDetections.current[d.id] = d;
    });

    setDetections(
      det.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    );
    setTimeline(tl?.aggregations?.over_time?.buckets || []);
    setTopIPs(ips?.aggregations?.top_ips?.buckets || []);
    setRecentEvents(recent?.hits?.hits?.map((h) => h._source) || []);
    setLastRefresh(new Date());
    setLoading(false);
  }, [timeRange, pushNotif]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const critical = detections.filter((d) => d.triggered && d.severity === "critical");
  const high = detections.filter((d) => d.triggered && d.severity === "high");
  const allActive = detections.filter((d) => d.triggered);
  const filtered =
    filter === "active"
      ? detections.filter((d) => d.triggered)
      : filter !== "all"
      ? detections.filter((d) => d.severity === filter)
      : detections;

  const maxIP = topIPs[0]?.doc_count || 1;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@400;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0a0c0f;
          --panel: #0f1217;
          --card: #141820;
          --border: rgba(255,255,255,0.07);
          --text: #e8eaf0;
          --dim: #5a6070;
          --accent: #4ec9b0;
          --mono: 'JetBrains Mono', monospace;
          --sans: 'Syne', sans-serif;
        }
        body { background: var(--bg); color: var(--text); font-family: var(--sans); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .notif { animation: slideIn 0.3s ease; }
        .card-hover:hover { border-color: rgba(255,255,255,0.15) !important; background: rgba(255,255,255,0.03) !important; }
      `}</style>

      {/* Notifications */}
      <div
        style={{
          position: "fixed",
          top: 16,
          right: selectedRule ? 424 : 16,
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {notifications.map((n) => (
          <div
            key={n.id}
            className="notif"
            style={{
              background: SEV_BG[n.sev],
              border: `1px solid ${SEV_COLOR[n.sev]}`,
              borderRadius: 8,
              padding: "10px 16px",
              fontSize: 13,
              color: SEV_COLOR[n.sev],
              fontFamily: "var(--mono)",
              fontWeight: 600,
              maxWidth: 300,
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}
          >
            {n.msg}
          </div>
        ))}
      </div>

      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <header
          style={{
            borderBottom: "1px solid var(--border)",
            padding: "0 24px",
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--panel)",
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: -0.5,
              }}
            >
              <span style={{ color: "#ff3b3b" }}>⬡</span> SEC
              <span style={{ color: "var(--dim)" }}>/</span>WATCH
            </div>
            <div style={{ width: 1, height: 20, background: "var(--border)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background:
                    esStatus === "connected"
                      ? "#4ec9b0"
                      : esStatus === "disconnected"
                      ? "#ff3b3b"
                      : "#f5c518",
                  animation: esStatus === "connected" ? "pulse 2s infinite" : "none",
                }}
              />
              <span style={{ color: "var(--dim)", fontFamily: "var(--mono)" }}>
                ES {esStatus}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                borderRadius: 6,
                padding: "5px 10px",
                fontSize: 12,
                fontFamily: "var(--mono)",
                cursor: "pointer",
              }}
            >
              <option value="now-15m">Last 15m</option>
              <option value="now-1h">Last 1h</option>
              <option value="now-6h">Last 6h</option>
              <option value="now-24h">Last 24h</option>
            </select>
            <button
              onClick={refresh}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--accent)",
                borderRadius: 6,
                padding: "5px 14px",
                fontSize: 12,
                fontFamily: "var(--mono)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ↺ Refresh
            </button>
            <span style={{ fontSize: 11, color: "var(--dim)", fontFamily: "var(--mono)" }}>
              {lastRefresh ? lastRefresh.toLocaleTimeString() : "—"}
            </span>
          </div>
        </header>

        <div
          style={{
            flex: 1,
            padding: 24,
            maxWidth: selectedRule ? "calc(100% - 400px)" : "100%",
            transition: "max-width 0.3s",
          }}
        >
          {/* Status bar */}
          {allActive.length > 0 && (
            <div
              style={{
                background: "rgba(255,59,59,0.1)",
                border: "1px solid rgba(255,59,59,0.3)",
                borderRadius: 8,
                padding: "10px 16px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 12,
                animation: "fadeIn 0.3s ease",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#ff3b3b",
                  animation: "pulse 1s infinite",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#ff3b3b",
                }}
              >
                {allActive.length} ACTIVE ALERT{allActive.length > 1 ? "S" : ""}
              </span>
              <span style={{ color: "var(--dim)", fontSize: 12 }}>
                {critical.length > 0 && `${critical.length} critical`}
                {critical.length > 0 && high.length > 0 && " · "}
                {high.length > 0 && `${high.length} high`}
              </span>
            </div>
          )}

          {/* KPI Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 24,
            }}
          >
            {[
              {
                label: "Active Alerts",
                value: allActive.length,
                color: allActive.length > 0 ? "#ff3b3b" : "#4ec9b0",
                icon: "🚨",
              },
              {
                label: "Critical",
                value: critical.length,
                color: critical.length > 0 ? "#ff3b3b" : "var(--dim)",
                icon: "💀",
              },
              {
                label: "High",
                value: high.length,
                color: high.length > 0 ? "#ff8c00" : "var(--dim)",
                icon: "⚠️",
              },
              { label: "Unique IPs", value: topIPs.length, color: "var(--accent)", icon: "🌐" },
            ].map((k) => (
              <div
                key={k.label}
                className="card-hover"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "16px 20px",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--dim)",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 8,
                  }}
                >
                  {k.icon} {k.label}
                </div>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 800,
                    color: k.color,
                    fontFamily: "var(--mono)",
                    lineHeight: 1,
                  }}
                >
                  {loading ? "—" : k.value}
                </div>
              </div>
            ))}
          </div>

          {/* Main grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 320px",
              gap: 20,
              marginBottom: 20,
            }}
          >
            {/* Left: detections */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--dim)",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Detection Rules
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {["all", "active", "critical", "high", "medium"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      style={{
                        background: filter === f ? "var(--card)" : "none",
                        border:
                          filter === f ? "1px solid var(--border)" : "1px solid transparent",
                        color: filter === f ? "var(--text)" : "var(--dim)",
                        borderRadius: 5,
                        padding: "3px 10px",
                        fontSize: 11,
                        fontFamily: "var(--mono)",
                        cursor: "pointer",
                        textTransform: "uppercase",
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {loading
                  ? Array(8)
                      .fill(0)
                      .map((_, i) => (
                        <div
                          key={i}
                          style={{
                            background: "var(--card)",
                            borderRadius: 8,
                            height: 100,
                            border: "1px solid var(--border)",
                            opacity: 0.5,
                          }}
                        />
                      ))
                  : filtered.map((rule) => (
                      <AlertCard
                        key={rule.id}
                        rule={rule}
                        onClick={setSelectedRule}
                        isActive={selectedRule?.id === rule.id}
                      />
                    ))}
              </div>
            </div>

            {/* Right: Top IPs + Timeline */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--dim)",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 12,
                  }}
                >
                  📊 Event Volume (24h)
                </div>
                <TimelineChart buckets={timeline} />
              </div>

              <div
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 16,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--dim)",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 12,
                  }}
                >
                  🌐 Top Source IPs (1h)
                </div>
                {topIPs.length === 0 ? (
                  <div
                    style={{ color: "var(--dim)", fontSize: 12, textAlign: "center", padding: "20px 0" }}
                  >
                    No data
                  </div>
                ) : (
                  topIPs.slice(0, 8).map((b) => (
                    <div key={b.key} style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text)" }}>
                          {b.key}
                        </span>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)" }}>
                          {b.doc_count}
                        </span>
                      </div>
                      <SparkBar
                        value={b.doc_count}
                        max={maxIP}
                        color={
                          b.doc_count > maxIP * 0.7
                            ? "#ff3b3b"
                            : b.doc_count > maxIP * 0.4
                            ? "#ff8c00"
                            : "#4ec9b0"
                        }
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent Events */}
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "var(--dim)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                📋 Live Event Feed
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)" }}>
                time · method · ip · path · status
              </div>
            </div>
            <div style={{ maxHeight: 280, overflow: "auto" }}>
              {recentEvents.length === 0 ? (
                <div
                  style={{ padding: "24px", textAlign: "center", color: "var(--dim)", fontSize: 13 }}
                >
                  {loading ? "Loading events..." : "No events found"}
                </div>
              ) : (
                recentEvents.map((e, i) => <EventRow key={i} event={e} />)
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: 20,
              textAlign: "center",
              color: "var(--dim)",
              fontSize: 11,
              fontFamily: "var(--mono)",
            }}
          >
            sec/watch · polling every {POLL_MS / 1000}s · index: {APP_INDEX}
          </div>
        </div>
      </div>

      {selectedRule && <DetailPanel rule={selectedRule} onClose={() => setSelectedRule(null)} />}
    </>
  );
}
