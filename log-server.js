const http = require('http')
const fs   = require('fs')
const path = require('path')

const LOG_FILE = path.join(__dirname, 'logs.ndjson')
const PORT     = 3001

// צור קובץ ריק אם לא קיים
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, '')
  console.log(`✓ Created ${LOG_FILE}`)
}

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

        // בנה לוג מסודר עם כל השדות הנדרשים
        const entry = {
          timestamp: raw.timestamp || new Date().toISOString(),
          event:     raw.event     || 'unknown',
          status:    raw.status    || 'unknown',
          ip:        raw.ip        || '0.0.0.0',
          user:      raw.user      || 'guest',
          source:    raw.source    || 'web_app',
          level:     raw.level     || 'info',
          message:   raw.message   || '',
          details:   raw.details   || {},
        }

        // NDJSON — שורה אחת לכל לוג, הכי קל לקריאה ב-Python
        fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n')

        // הדפס לטרמינל בצבע
        const colors = { critical: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[32m' }
        const reset  = '\x1b[0m'
        const color  = colors[entry.level] || reset
        console.log(`${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp.split('T')[1].split('.')[0]} | ip=${entry.ip} | ${entry.event} | ${entry.message}`)

        res.writeHead(200)
        res.end(JSON.stringify({ ok: true }))
      } catch (e) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: 'invalid JSON' }))
      }
    })
    return
  }

  res.writeHead(404); res.end()
})

server.listen(PORT, () => {
  console.log(`\n✓ Log server running on http://localhost:${PORT}`)
  console.log(`✓ Writing logs to: ${LOG_FILE}`)
  console.log(`─────────────────────────────────────\n`)
})
