import React, { useState, useEffect } from 'react'
import styles from './LogPanel.module.css'

export default function LogPanel({ logs }) {
  const [expanded, setExpanded] = useState(false)
  const latest = logs[0]

  useEffect(() => {
    if (latest?.level !== 'info') setExpanded(true)
  }, [latest])

  function levelCls(l) {
    if (l === 'critical') return styles.critical
    if (l === 'warn')     return styles.warn
    return styles.info
  }

  function levelTag(l) {
    if (l === 'critical') return 'CRITICAL'
    if (l === 'warn')     return 'WARN    '
    return 'INFO    '
  }

  return (
    <div className={`${styles.panel} ${expanded ? styles.expanded : ''}`}>
      <div className={styles.header} onClick={() => setExpanded(p => !p)}>
        <div className={`${styles.dot} ${latest?.level === 'critical' ? styles.red : ''}`} />
        <span className={styles.label}>App Logs</span>
        <span className={styles.latest}>
          {latest ? `${latest.event} — ${latest.ip}` : 'ממתין לפעילות...'}
        </span>
        <span className={styles.count}>{logs.length} entries</span>
        <span className={styles.toggle}>{expanded ? '▼ כווץ' : '▲ הרחב'}</span>
      </div>
      <div className={styles.body}>
        {logs.map((log, i) => (
          <div key={i} className={styles.entry}>
            <span className={styles.time}>{log.timestamp.replace('T',' ').split('.')[0]}</span>
            {'  '}
            <span className={levelCls(log.level)}>[{levelTag(log.level)}]</span>
            {'  '}
            <span className={styles.meta}>ip={log.ip} user={log.user} event={log.event}</span>
            {'  '}
            <span className={log.level === 'critical' ? styles.msgDanger : log.level === 'warn' ? styles.msgWarn : styles.msg}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
