import { ES_BASE, APP_INDEX, NGINX_INDEX } from '../config/constants.js';

// ─── ES HELPERS ──────────────────────────────────────────────────────────────
export async function esQuery(index, body) {
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

export async function getIndexHealth() {
  try {
    const r = await fetch(`${ES_BASE}/_cat/indices/${APP_INDEX},${NGINX_INDEX}?format=json`);
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

// Normalize a raw _source into a common shape regardless of which index it came from
export function normalize(src) {
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

export async function runDetections(since = "now-24h") {
  const { DETECTION_RULES } = await import('../config/detectionRules.js');
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

export async function getTimeline() {
  const agg = { size: 0, query: { range: { timestamp: { gte: "now-24h" } } }, aggs: { over_time: { date_histogram: { field: "timestamp", fixed_interval: "1h" } } } };
  const [a, n] = await Promise.all([esQuery(APP_INDEX, agg), esQuery(NGINX_INDEX, agg)]);
  const merged  = {};
  [...(a?.aggregations?.over_time?.buckets || []), ...(n?.aggregations?.over_time?.buckets || [])].forEach((b) => {
    merged[b.key] = (merged[b.key] || 0) + b.doc_count;
  });
  return Object.entries(merged).map(([k, v]) => ({ key: Number(k), doc_count: v })).sort((a, b) => a.key - b.key);
}

export async function getTopIPs() {
  const agg = { size: 0, query: { range: { timestamp: { gte: "now-1h" } } }, aggs: { top_ips: { terms: { field: "ip", size: 20 } } } };
  const [a, n] = await Promise.all([esQuery(APP_INDEX, agg), esQuery(NGINX_INDEX, agg)]);
  const counts  = {};
  [...(a?.aggregations?.top_ips?.buckets || []), ...(n?.aggregations?.top_ips?.buckets || [])].forEach((b) => {
    counts[b.key] = (counts[b.key] || 0) + b.doc_count;
  });
  return Object.entries(counts).map(([k, v]) => ({ key: k, doc_count: v })).sort((a, b) => b.doc_count - a.doc_count).slice(0, 10);
}

export async function getRecentEvents() {
  const q = { size: 10, sort: [{ timestamp: { order: "desc" } }], query: { match_all: {} } };
  const [a, n] = await Promise.all([esQuery(APP_INDEX, q), esQuery(NGINX_INDEX, q)]);
  return [
    ...(a?.hits?.hits || []).map((h) => normalize(h._source)),
    ...(n?.hits?.hits || []).map((h) => normalize(h._source)),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20);
}