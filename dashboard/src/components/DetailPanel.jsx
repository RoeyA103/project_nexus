import { SEV_COLOR, SEV_BG } from '../config/constants.js';

function DetailPanel({ rule, onClose }) {
  if (!rule) return null;
  const queryList = rule.agg_queries || rule.queries || [];
  return (
    <div className="detail-panel">
      <div className="detail-panel-header">
        <div>
          <div className="detail-panel-title">{rule.icon} {rule.name}</div>
          <span className="detail-panel-severity" style={{ color: SEV_COLOR[rule.severity], background: SEV_BG[rule.severity] }}>{rule.severity}</span>
        </div>
        <button onClick={onClose} className="detail-panel-close">×</button>
      </div>
      <div className="detail-panel-content">
        <div className="detail-panel-desc">{rule.description}</div>
        <div className="detail-panel-stats">
          {[
            ["Total Hits", rule.hits],
            ["Unique IPs", rule.ips?.length || 0],
            ["Last Seen", rule.lastSeen ? new Date(rule.lastSeen).toLocaleTimeString() : "—"],
            ["Status", rule.triggered ? "🔴 ACTIVE" : "🟢 Clear"]
          ].map(([k, v]) => (
            <div key={k} className="detail-panel-stat">
              <div className="detail-panel-stat-label">{k}</div>
              <div className="detail-panel-stat-value" style={{ color: k === "Status" && rule.triggered ? "#ff3b3b" : "var(--text)" }}>{v}</div>
            </div>
          ))}
        </div>
        {rule.ips?.length > 0 && (
          <div className="detail-panel-ips">
            <div className="detail-panel-ips-title">Source IPs</div>
            <div className="detail-panel-ips-list">
              {rule.ips.map((ip) => <span key={ip} className="detail-panel-ip">{ip}</span>)}
            </div>
          </div>
        )}
        {rule.sampleEvents?.length > 0 && (
          <div className="detail-panel-events">
            <div className="detail-panel-events-title">Sample Events (merged)</div>
            {rule.sampleEvents.map((e, i) => (
              <div key={i} className="detail-panel-event">
                <div><span style={{ color: "var(--dim)" }}>time:   </span>{e.timestamp || "—"}</div>
                <div><span style={{ color: "var(--dim)" }}>ip:     </span><span style={{ color: "#ff8c00" }}>{e.ip}</span></div>
                <div><span style={{ color: "var(--dim)" }}>method: </span>{e.method}</div>
                <div><span style={{ color: "var(--dim)" }}>path:   </span><span style={{ color: "#ff3b3b" }}>{e.path}</span></div>
                <div><span style={{ color: "var(--dim)" }}>status: </span>{e.status}</div>
                {e.event !== "—"      && <div><span style={{ color: "var(--dim)" }}>event:  </span>{e.event}</div>}
                {e.user_agent !== "—" && <div className="detail-panel-event-field"><span style={{ color: "var(--dim)" }}>ua:     </span>{e.user_agent}</div>}
              </div>
            ))}
          </div>
        )}
        <div>
          <div className="detail-panel-queries">ES Queries ({queryList.length} index{queryList.length > 1 ? "es" : ""})</div>
          {queryList.map((q, i) => (
            <div key={i} className="detail-panel-query">
              <div className="detail-panel-query-index">Index: {q.index}</div>
              <pre className="detail-panel-query-pre">
                {JSON.stringify(q.body?.query, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DetailPanel;