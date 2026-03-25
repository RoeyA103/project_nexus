import { useState, useEffect, useCallback, useRef } from "react";
import { POLL_MS, SEVERITY_ORDER, SEV_COLOR, SEV_BG, APP_INDEX, NGINX_INDEX } from "./config/constants.js";
import { runDetections, getTimeline, getTopIPs, getRecentEvents, getIndexHealth } from "./utils/elasticsearch.js";
import SparkBar from "./components/SparkBar.jsx";
import TimelineChart from "./components/TimelineChart.jsx";
import AlertCard from "./components/AlertCard.jsx";
import EventRow from "./components/EventRow.jsx";
import DetailPanel from "./components/DetailPanel.jsx";
import "./styles.css";

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
      {/* Notifications */}
      <div className={`notifications ${selectedRule ? "notifications-right-panel" : "notifications-right"}`}>
        {notifications.map((n) => (
          <div key={n.id} className="notification" style={{ background: SEV_BG[n.sev], border: `1px solid ${SEV_COLOR[n.sev]}`, color: SEV_COLOR[n.sev] }}>
            {n.msg}
          </div>
        ))}
      </div>

      <div className="app-container">

        {/* Header */}
        <header className="app-header">
          <div className="app-header-left">
            <div className="app-logo">
              <span className="app-logo-dot">⬡</span> SEC<span className="app-logo-slash">/</span>WATCH
            </div>
            <div className="app-divider" />
            <div className="app-status">
              <div className={`app-status-dot ${esStatus === "connected" ? "app-status-dot-connected" : "app-status-dot-disconnected"}`} />
              <span className="app-status-text">ES {esStatus}</span>
            </div>
            <span className="app-indexes">{APP_INDEX} + {NGINX_INDEX}</span>
          </div>
          <div className="app-header-right">
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="app-time-select">
              <option value="now-15m">Last 15m</option>
              <option value="now-1h">Last 1h</option>
              <option value="now-6h">Last 6h</option>
              <option value="now-24h">Last 24h</option>
            </select>
            <button onClick={refresh} className="app-refresh-btn">↺ Refresh</button>
            <span className="app-last-refresh">{lastRefresh ? lastRefresh.toLocaleTimeString() : "—"}</span>
          </div>
        </header>

        <div className={`app-main ${selectedRule ? "app-main-panel" : "app-main-full"}`}>

          {/* Alert banner */}
          {allActive.length > 0 && (
            <div className="app-alert-banner">
              <div className="app-alert-dot" />
              <span className="app-alert-text">{allActive.length} ACTIVE ALERT{allActive.length > 1 ? "S" : ""}</span>
              <span className="app-alert-details">
                {critical.length > 0 && `${critical.length} critical`}
                {critical.length > 0 && high.length > 0 && " · "}
                {high.length > 0 && `${high.length} high`}
              </span>
            </div>
          )}

          {/* KPIs */}
          <div className="app-kpis">
            {[
              { label: "Active Alerts", value: allActive.length, color: allActive.length > 0 ? "#ff3b3b" : "#4ec9b0", icon: "🚨" },
              { label: "Critical",      value: critical.length,  color: critical.length  > 0 ? "#ff3b3b" : "var(--dim)", icon: "💀" },
              { label: "High",          value: high.length,      color: high.length      > 0 ? "#ff8c00" : "var(--dim)", icon: "⚠️" },
              { label: "Unique IPs",    value: topIPs.length,    color: "var(--accent)", icon: "🌐" },
            ].map((k) => (
              <div key={k.label} className="app-kpi">
                <div className="app-kpi-label">{k.icon} {k.label}</div>
                <div className="app-kpi-value" style={{ color: k.color }}>{loading ? "—" : k.value}</div>
              </div>
            ))}
          </div>

          {/* Main grid */}
          <div className="app-main-grid">
            <div>
              <div className="app-rules-header">
                <div className="app-rules-title">Detection Rules</div>
                <div className="app-rules-filters">
                  {["all", "active", "critical", "high", "medium"].map((f) => (
                    <button key={f} onClick={() => setFilter(f)} className={filter === f ? "app-filter-btn app-filter-btn-active" : "app-filter-btn app-filter-btn-inactive"}>{f}</button>
                  ))}
                </div>
              </div>
              <div className="app-rules-grid">
                {loading
                  ? Array(8).fill(0).map((_, i) => <div key={i} className="app-loading-card" />)
                  : filtered.map((rule) => <AlertCard key={rule.id} rule={rule} onClick={setSelectedRule} isActive={selectedRule?.id === rule.id} />)
                }
              </div>
            </div>

            <div className="app-sidebar">
              <div className="app-timeline">
                <div className="app-timeline-title">📊 Event Volume 24h (both indexes)</div>
                <TimelineChart buckets={timeline} />
              </div>
              <div className="app-ips">
                <div className="app-ips-title">🌐 Top IPs 1h (merged)</div>
                {topIPs.length === 0
                  ? <div className="app-ips-empty">No data</div>
                  : topIPs.slice(0, 8).map((b) => (
                    <div key={b.key} className="app-ip-item">
                      <div className="app-ip-header">
                        <span className="app-ip-key">{b.key}</span>
                        <span className="app-ip-count">{b.doc_count}</span>
                      </div>
                      <SparkBar value={b.doc_count} max={maxIP} color={b.doc_count > maxIP * 0.7 ? "#ff3b3b" : b.doc_count > maxIP * 0.4 ? "#ff8c00" : "#4ec9b0"} />
                    </div>
                  ))
                }
              </div>
            </div>
          </div>

          {/* Event feed */}
          <div className="app-events">
            <div className="app-events-header">
              <div className="app-events-title">📋 Live Feed (both indexes merged)</div>
              <div className="app-events-columns">time · method · ip · path · status</div>
            </div>
            <div className="app-events-list">
              {recentEvents.length === 0
                ? <div className="app-events-empty">{loading ? "Loading..." : "No events"}</div>
                : recentEvents.map((e, i) => <EventRow key={i} event={e} />)
              }
            </div>
          </div>

          <div className="app-footer">
            sec/watch · {POLL_MS / 1000}s poll · {APP_INDEX} + {NGINX_INDEX}
          </div>
        </div>
      </div>

      {selectedRule && <DetailPanel rule={selectedRule} onClose={() => setSelectedRule(null)} />}
    </>
  );
}
