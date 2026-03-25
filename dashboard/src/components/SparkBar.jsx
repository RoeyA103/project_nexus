function SparkBar({ value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="spark-bar">
      <div className="spark-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default SparkBar;