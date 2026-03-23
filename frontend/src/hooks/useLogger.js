import { useState, useCallback } from 'react'

const FAKE_IPS   = ['192.168.1.55', '10.0.0.1', '172.16.0.4', '10.0.0.22']
const ATTACK_IPS = ['91.48.12.3', '185.220.101.47', '45.33.32.156']

// כתובת שרת הלוגים המקומי
const LOG_SERVER = 'http://localhost:3001/logs'

export function randIP(attacker = false) {
  const pool = attacker ? ATTACK_IPS : FAKE_IPS
  return pool[Math.floor(Math.random() * pool.length)]
}

export function useLogger() {
  const [logs, setLogs] = useState([])

  const addLog = useCallback((level, event, ip, user, details, message) => {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      status:  level === 'critical' ? 'blocked' : level === 'warn' ? 'failed' : 'success',
      ip,
      user:    user || 'guest',
      source:  'web_app',
      details: details || {},
      message,
      level,
    }

    // 1. שמור ב-state — מה שרואים על המסך
    setLogs(prev => [entry, ...prev])

    // 2. שלח לשרת → יכתוב ל-logs.json
    fetch(LOG_SERVER, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(entry),
    }).catch(() => {
      console.warn('log-server לא רץ — הרץ: node log-server.js')
    })

    return entry
  }, [])

  return { logs, addLog }
}
