import React, { useState } from 'react'
import s from './LoginModal.module.css'

export default function LoginModal({ isOpen, onClose, log }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')

  function doLogin() {
    if (!email || !password) return
    log('login_attempt', 'failed', email, { email })
    handleClose()
  }

  function handleClose() {
    setEmail(''); setPassword(''); onClose()
  }

  if (!isOpen) return null

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className={s.modal}>
        <div className={s.head}>
          <h2>כניסה לחשבון</h2>
          <button className={s.close} onClick={handleClose}>✕</button>
        </div>
        <div className={s.field}>
          <label>אימייל</label>
          <input type="text" value={email} placeholder="user@example.com" onChange={e => setEmail(e.target.value)} />
        </div>
        <div className={s.field}>
          <label>סיסמה</label>
          <input type="password" value={password} placeholder="••••••••" onChange={e => setPassword(e.target.value)} />
        </div>
        <button className={s.submit} onClick={doLogin}>התחבר</button>
      </div>
    </div>
  )
}
