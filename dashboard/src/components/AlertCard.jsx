import { SEV_COLOR, SEV_BG } from '../config/constants.js';
import SparkBar from './SparkBar.jsx';

function AlertCard({ rule, onClick, isActive }) {
  const age = rule.lastSeen ? Math.round((Date.now() - new Date(rule.lastSeen)) / 60000) + "m ago" : "—";
  return (
    <div onClick={() => onClick(rule)} className={`alert-card ${isActive ? "alert-card-active" : ""}`} style={{ background: isActive ? SEV_BG[rule.severity] : "var(--card)", borderColor: isActive ? SEV_COLOR[rule.severity] : "var(--border)", borderLeftColor: SEV_COLOR[rule.severity] }}>
      {rule.triggered && <div className="alert-card-indicator" style={{ background: SEV_COLOR[rule.severity], boxShadow: `0 0 8px ${SEV_COLOR[rule.severity]}` }} />}
      <div className="alert-card-header">
        <span style={{ fontSize: 18 }}>{rule.icon}</span>
        <span className="alert-card-name" style={{ color: rule.triggered ? SEV_COLOR[rule.severity] : "var(--text)" }}>{rule.name}</span>
      </div>
      <div className="alert-card-desc">{rule.description}</div>
      <div className="alert-card-footer">
        <span className="alert-card-severity" style={{ color: SEV_COLOR[rule.severity], background: SEV_BG[rule.severity] }}>{rule.severity}</span>
        <span className="alert-card-stats">
          {rule.triggered
            ? <span style={{ color: SEV_COLOR[rule.severity], fontWeight: 700 }}>{rule.hits} hits · {age}</span>
            : <span style={{ color: "#4ec9b0" }}>✓ clean</span>}
        </span>
      </div>
      {rule.triggered && <div className="alert-card-spark"><SparkBar value={Math.min(rule.hits, 100)} max={100} color={SEV_COLOR[rule.severity]} /></div>}
    </div>
  );
}

export default AlertCard;