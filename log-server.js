const http  = require('http')
const fs    = require('fs')
const path  = require('path')

const LOG_DIR  = path.join(__dirname, 'logs')
const LOG_FILE = path.join(LOG_DIR, 'logs.ndjson')
const PORT     = 3001

// ── Ensure logs folder exists ──────────────────────
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR)
}

// ── Ensure file exists ─────────────────────────────
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, '')
}

// ── Write log ──────────────────────────────────────
function appendToFile(entry) {
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n')
}

// ── HTTP Server ────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/logs') {
    let body = ''

    req.on('data', chunk => { body += chunk })

    req.on('end', () => {
      try {
        const raw = JSON.parse(body)

        const entry = {
          timestamp: raw.timestamp || new Date().toISOString(),
          event:     raw.event     || 'unknown',
          user:      raw.user      || 'guest',
          status:    raw.status    || 'success',
          ip:        req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0',
          details:   raw.details   || {},
        }

        appendToFile(entry)

        console.log(
          `[${entry.status.toUpperCase()}] ${entry.event} | user=${entry.user} | ip=${entry.ip}`
        )

        res.writeHead(200)
        res.end(JSON.stringify({ ok: true }))
      } catch {
        res.writeHead(400)
        res.end(JSON.stringify({ error: 'invalid JSON' }))
      }
    })

    return
  }

  res.writeHead(404)
  res.end()
})

server.listen(PORT, () => {
  console.log(`\nLog server → http://localhost:${PORT}`)
  console.log(`Logs file  → ${LOG_FILE}\n`)
})