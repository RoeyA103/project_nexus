const http = require('http')
const fs   = require('fs')
const path = require('path')

const LOG_FILE = path.join(__dirname, 'logs.json')
const PORT     = 3001

if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, '[]')
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
        const entry = JSON.parse(body)

        const existing = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'))
        existing.push(entry)
        fs.writeFileSync(LOG_FILE, JSON.stringify(existing, null, 2))

        console.log(`[${entry.level?.toUpperCase()}] ${entry.event} — ${entry.ip}`)

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
  console.log(`✓ Log server on http://localhost:${PORT}`)
  console.log(`✓ Saving to: ${LOG_FILE}`)
})