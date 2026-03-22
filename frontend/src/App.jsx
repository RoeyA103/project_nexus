import React, { useState, useEffect } from 'react'
import styles from './App.module.css'

import Navbar      from './components/Navbar'
import Hero        from './components/Hero'
import Sidebar     from './components/Sidebar'
import ProductCard from './components/ProductCard'
import LoginModal  from './components/LoginModal'
import LogPanel    from './components/LogPanel'

import PRODUCTS    from './data/products'
import { useLogger, randIP } from './hooks/useLogger'

export default function App() {
  const { logs, addLog } = useLogger()
  const [cartCount,    setCartCount]    = useState(0)
  const [loginOpen,    setLoginOpen]    = useState(false)
  const [toast,        setToast]        = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  function showToast(msg) {
    setToast(msg)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 3000)
  }

  function handleAddCart(product) {
    setCartCount(c => c + 1)
    showToast(`נוסף לעגלה: ${product.name}`)
  }

  function openLogin() {
    setLoginOpen(true)
    addLog('info', 'login_page_view', randIP(), 'guest',
      { page: 'login_modal' }, 'Login modal opened')
  }

  // לוג ראשוני של טעינת דף
  useEffect(() => {
    addLog('info', 'page_view', randIP(), 'guest',
      { page: 'shop_home' }, 'User loaded shop homepage')
  }, [])

  // סימולציית תוקף ברקע
  useEffect(() => {
    const attacks = [
      () => addLog('critical', 'search_query', '91.48.12.3', 'guest', {
        query: "' OR '1'='1", field: 'search_input',
        threat_type: 'sql_injection', pattern_matched: 'OR bypass', action_taken: 'blocked',
      }, `SQL INJECTION in search — "' OR '1'='1"`),

      () => addLog('critical', 'login_attempt', '185.220.101.47', "admin'--", {
        email: "admin'--", threat_type: 'sql_injection',
        pattern_matched: 'single quote / comment',
        auth_bypass_attempt: true, action_taken: 'blocked',
      }, `AUTH BYPASS ATTEMPT — email: "admin'--"`),

      () => addLog('critical', 'search_query', '45.33.32.156', 'guest', {
        query: '1 UNION SELECT * FROM users--', field: 'search_input',
        threat_type: 'sql_injection', pattern_matched: 'UNION injection', action_taken: 'blocked',
      }, `SQLi UNION attack — "1 UNION SELECT * FROM users--"`),

      () => addLog('critical', 'filter_applied', '91.48.12.3', 'guest', {
        field: 'price_filter', min: "0' OR 1=1--",
        threat_type: 'sql_injection', pattern_matched: 'OR bypass', action_taken: 'blocked',
      }, `SQLi in price filter — "0' OR 1=1--"`),

      () => addLog('warn', 'login_attempt', '185.220.101.47', 'admin', {
        reason: 'invalid_credentials',
        attempt_number: Math.floor(Math.random() * 8) + 2,
      }, `Login failed — repeated attempts for "admin"`),
    ]

    const timers = [
      setTimeout(() => attacks[0](), 4000),
      setTimeout(() => attacks[1](), 9000),
      setTimeout(() => attacks[2](), 15000),
      setTimeout(() => attacks[3](), 21000),
      setTimeout(() => attacks[4](), 27000),
    ]
    const interval = setInterval(() => {
      attacks[Math.floor(Math.random() * attacks.length)]()
    }, 20000)

    return () => {
      timers.forEach(clearTimeout)
      clearInterval(interval)
    }
  }, [addLog])

  return (
    <>
      <Navbar cartCount={cartCount} onLoginClick={openLogin} />

      <Hero addLog={addLog} onToast={showToast} />

      <div className={styles.main}>
        <Sidebar addLog={addLog} onToast={showToast} />

        <section className={styles.products}>
          <div className={styles.productsHeader}>
            <span>מציג {PRODUCTS.length} מוצרים</span>
            <select
              className={styles.sort}
              onChange={e => addLog('info', 'sort_changed', randIP(), 'guest',
                { sort_by: e.target.value }, `Sort changed: ${e.target.value}`)}
            >
              <option>מיון: רלוונטי</option>
              <option>מחיר: נמוך לגבוה</option>
              <option>מחיר: גבוה לנמוך</option>
              <option>דירוג משתמשים</option>
            </select>
          </div>

          <div className={styles.grid}>
            {PRODUCTS.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                addLog={addLog}
                onAddCart={handleAddCart}
              />
            ))}
          </div>
        </section>
      </div>

      <div className={styles.spacer} />

      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        addLog={addLog}
        onToast={showToast}
      />

      <LogPanel logs={logs} />

      <div className={`${styles.toast} ${toastVisible ? styles.toastShow : ''}`}>
        {toast}
      </div>
    </>
  )
}
