import React, { useState } from 'react'
import styles from './Hero.module.css'
import { detectSQLi } from '../utils/detectSQLi'
import { randIP } from '../hooks/useLogger'

export default function Hero({ addLog, onToast }) {
  const [query, setQuery] = useState('')

  function doSearch() {
    const q = query.trim()
    if (!q) return
    const sqli = detectSQLi(q)
    if (sqli) {
      addLog('critical', 'search_query', randIP(true), 'guest', {
        query: q, field: 'search_input',
        threat_type: 'sql_injection', pattern_matched: sqli, action_taken: 'blocked',
      }, `SQL INJECTION in search — pattern: "${sqli}"`)
      addLog('critical', 'db_query_rejected', randIP(true), 'guest', {
        raw_input: q, table_targeted: 'products',
        threat_type: 'sql_injection', query_blocked: true,
      }, `DB query blocked — suspicious input`)
      onToast('⚠ קלט חשוד נחסם ונרשם')
    } else {
      addLog('info', 'search_query', randIP(), 'guest',
        { query: q, field: 'search_input' }, `Search: "${q}"`)
    }
    setQuery('')
  }

  return (
    <div className={styles.hero}>
      <h1>הכל במקום <em>אחד</em></h1>
      <p>מיליוני מוצרים · משלוח מהיר · מחירים שלא תמצא בשום מקום</p>
      <div className={styles.searchWrap}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch()}
          placeholder="חפש מוצר, מותג, קטגוריה..."
        />
        <button onClick={doSearch}>חפש</button>
      </div>
    </div>
  )
}
