import { useCallback } from 'react'

const LOG_SERVER = 'http://localhost:3001/logs'

export function useLogger() {
  const log = useCallback((eventType, status = 'success', user = 'guest', details = {}) => {
    const entry = {
      timestamp: new Date().toISOString(),
      event:     eventType,
      user,
      status,
      ip:        '0.0.0.0', // השרת ימלא את ה-IP האמיתי
      details,
    }

    fetch(LOG_SERVER, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(entry),
    }).catch(() => {})

  }, [])

  return { log }
}
