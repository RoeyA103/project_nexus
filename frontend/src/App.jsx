import React, { useState, useEffect } from 'react'
import s from './App.module.css'

import Navbar      from './components/Navbar'
import Hero        from './components/Hero'
import ProductCard from './components/ProductCard'
import LoginModal  from './components/LoginModal'

import PRODUCTS    from './data/products'
import { useLogger } from './hooks/useLogger'

export default function App() {
  const { log } = useLogger()
  const [cartCount, setCartCount] = useState(0)
  const [loginOpen, setLoginOpen] = useState(false)

  useEffect(() => {
    log('page_view', 'success', 'guest', { page: 'home' })
  }, [])

  function openLogin() {
    setLoginOpen(true)
    log('page_view', 'success', 'guest', { page: 'login_modal' })
  }

  return (
    <>
      <Navbar cartCount={cartCount} onLoginClick={openLogin} />

      <Hero log={log} />

      <div className={s.main}>
        <div className={s.header}>
          <span>מציג {PRODUCTS.length} מוצרים</span>
          <select
            className={s.sort}
            onChange={e => log('sort_changed', 'success', 'guest', { sort_by: e.target.value })}
          >
            <option>מיון: רלוונטי</option>
            <option>מחיר: נמוך לגבוה</option>
            <option>מחיר: גבוה לנמוך</option>
            <option>דירוג משתמשים</option>
          </select>
        </div>

        <div className={s.grid}>
          {PRODUCTS.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              log={log}
              onAddCart={p => setCartCount(c => c + 1)}
            />
          ))}
        </div>
      </div>

      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} log={log} />
    </>
  )
}
