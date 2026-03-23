import React, { useState } from 'react'
import s from './Hero.module.css'

export default function Hero({ log }) {
  const [query, setQuery] = useState('')

  function doSearch() {
    const q = query.trim()
    if (!q) return
    log('search', 'success', 'guest', { query: q })
    setQuery('')
  }

  return (
    <div className={s.hero}>
      <h1>הכל במקום <em>אחד</em></h1>
      <p>מיליוני מוצרים · משלוח מהיר · מחירים הכי טובים</p>
      <div className={s.wrap}>
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
