const http  = require('http')
const fs    = require('fs')
const path  = require('path')
const mysql = require('mysql2')

const LOG_FILE = path.join(__dirname, 'logs.ndjson')
const PORT     = 3001

// ── MySQL ──────────────────────────────────────────
const db = mysql.createConnection({
  host:     'localhost',
  port:     3306,
  database: 'testdb',
  user:     'user',
  password: '1234',
})

db.connect(err => {
  if (err) {
    console.warn('MySQL not available — saving to file only')
  } else {
    console.log('MySQL connected')
    db.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id        INT AUTO_INCREMENT PRIMARY KEY,
        timestamp VARCHAR(30),
        event     VARCHAR(100),
        user      VARCHAR(100),
        status    VARCHAR(20),
        ip        VARCHAR(45),
        details   JSON
      )
    `)
  }
})

// ── NDJSON file — one line per log ─────────────────
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, '')
}

function appendToFile(entry) {
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n')
}

function appendToMySQL(entry) {
  db.query(
    'INSERT INTO logs (timestamp, event, user, status, ip, details) VALUES (?, ?, ?, ?, ?, ?)',
    [entry.timestamp, entry.event, entry.user, entry.status, entry.ip, JSON.stringify(entry.details)],
    err => { if (err) console.warn('MySQL insert error:', err.message) }
  )
}

// ── HTTP Server ────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

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
          ip:        req.socket.remoteAddress || '0.0.0.0',
          details:   raw.details   || {},
        }

        appendToFile(entry)
        appendToMySQL(entry)

        console.log(`[${entry.status.toUpperCase()}] ${entry.event} | user=${entry.user} | ip=${entry.ip}`)

        res.writeHead(200)
        res.end(JSON.stringify({ ok: true }))
      } catch {
        res.writeHead(400)
        res.end(JSON.stringify({ error: 'invalid JSON' }))
      }
    })
    return
  }

  res.writeHead(404); res.end()
})

server.listen(PORT, () => {
  console.log(`\nLog server → http://localhost:${PORT}`)
  console.log(`Logs file  → ${LOG_FILE}\n`)
})
