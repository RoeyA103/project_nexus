function TimelineChart({ buckets }) {
  if (!buckets || buckets.length === 0)
    return <div className="timeline-chart" style={{ color: "var(--dim)", fontSize: 12, textAlign: "center", padding: "20px 0", display: "block" }}>No timeline data</div>;
  const maxVal = Math.max(...buckets.map((b) => b.doc_count), 1);
  return (
    <div className="timeline-chart">
      {buckets.slice(-24).map((b, i) => {
        const h = Math.max(2, (b.doc_count / maxVal) * 60);
        return (
          <div key={i} className="timeline-bar" title={`${new Date(b.key).getHours()}:00 — ${b.doc_count}`}>
            <div className="timeline-bar-fill" style={{ height: h, background: b.doc_count > 20 ? "#ff3b3b" : "#4ec9b0" }} />
          </div>
        );
      })}
    </div>
  );
}

export default TimelineChart;