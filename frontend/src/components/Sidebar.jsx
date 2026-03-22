import React, { useState } from 'react'
import styles from './Sidebar.module.css'
import { detectSQLi } from '../utils/detectSQLi'
import { randIP } from '../hooks/useLogger'

const CATEGORIES = ['אלקטרוניקה', 'ביגוד', 'ספורט', 'בית', 'צעצועים']

export default function Sidebar({ addLog, onToast }) {
  const [min, setMin] = useState('0')
  const [max, setMax] = useState('9999')

  function handlePriceBlur() {
    const sqli = detectSQLi(min) || detectSQLi(max)
    if (sqli) {
      addLog('critical', 'filter_applied', randIP(true), 'guest', {
        field: 'price_filter', min, max,
        threat_type: 'sql_injection', pattern_matched: sqli, action_taken: 'blocked',
      }, `SQLi in price filter — min="${min}" max="${max}"`)
      onToast('⚠ קלט חשוד בפילטר מחיר')
    } else {
      addLog('info', 'filter_applied', randIP(), 'guest',
        { filter_type: 'price', min, max }, `Price filter: ₪${min}–₪${max}`)
    }
  }

  function handleCategory(cat, checked) {
    addLog('info', 'filter_applied', randIP(), 'guest',
      { filter_type: 'category', category: cat, enabled: checked },
      `Category filter ${checked ? 'enabled' : 'disabled'}: ${cat}`)
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.card}>
        <h3>קטגוריה</h3>
        {CATEGORIES.map(cat => (
          <label key={cat} className={styles.item}>
            <input type="checkbox" defaultChecked onChange={e => handleCategory(cat, e.target.checked)} />
            {cat}
          </label>
        ))}
      </div>
      <div className={styles.card}>
        <h3>מחיר</h3>
        <div className={styles.priceRow}>
          <input value={min} onChange={e => setMin(e.target.value)} onBlur={handlePriceBlur} placeholder="מינ׳" />
          <input value={max} onChange={e => setMax(e.target.value)} onBlur={handlePriceBlur} placeholder="מקס׳" />
        </div>
      </div>
    </aside>
  )
}
