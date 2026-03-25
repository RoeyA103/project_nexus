// ─── DETECTION RULES ─────────────────────────────────────────────────────────
// Rule types:
//   queries[]     → [{index, body}] — run on one or both indexes, hits summed
//   agg_queries[] → [{index, body}] — aggregation queries for counting by IP
export const DETECTION_RULES = [
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

import { APP_INDEX, NGINX_INDEX } from './constants.js';