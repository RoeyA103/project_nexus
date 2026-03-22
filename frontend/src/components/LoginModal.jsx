import React, { useState } from 'react'
import styles from './LoginModal.module.css'
import { detectSQLi } from '../utils/detectSQLi'
import { randIP } from '../hooks/useLogger'

export default function LoginModal({ isOpen, onClose, addLog, onToast }) {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [emailBad, setEmailBad]   = useState(false)
  const [passBad, setPassBad]     = useState(false)
  const [showWarn, setShowWarn]   = useState(false)

  function checkField(val, field) {
    const sqli = detectSQLi(val)
    if (sqli) {
      field === 'email' ? setEmailBad(true) : setPassBad(true)
      setShowWarn(true)
      addLog('critical', 'input_scan', randIP(true), 'guest', {
        field, raw_input: val, threat_type: 'sql_injection',
        pattern_matched: sqli, action_taken: 'flagged',
      }, `SQLi pattern in ${field} — "${sqli}"`)
    } else {
      field === 'email' ? setEmailBad(false) : setPassBad(false)
      if (!detectSQLi(field === 'email' ? password : email)) setShowWarn(false)
    }
  }

  function doLogin() {
    const sqli = detectSQLi(email) || detectSQLi(password)
    if (sqli) {
      addLog('critical', 'login_attempt', randIP(true), email || 'unknown', {
        email, threat_type: 'sql_injection', pattern_matched: sqli,
        auth_bypass_attempt: true, action_taken: 'blocked',
      }, `AUTH BYPASS ATTEMPT — SQLi in login form`)
      onToast('⛔ ניסיון מתקפה נחסם ונרשם')
      return
    }
    addLog('warn', 'login_attempt', randIP(), email, {
      email, reason: 'invalid_credentials',
    }, `Login failed — invalid credentials for ${email}`)
    onToast('פרטים שגויים, נסה שוב')
  }

  function handleClose() {
    setEmail(''); setPassword('')
    setEmailBad(false); setPassBad(false); setShowWarn(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className={styles.modal}>
        <div className={styles.head}>
          <h2>כניסה לחשבון</h2>
          <button className={styles.close} onClick={handleClose}>✕</button>
        </div>
        <div className={styles.field}>
          <label>אימייל</label>
          <input type="text" value={email} placeholder="user@example.com"
            className={emailBad ? styles.danger : ''}
            onChange={e => { setEmail(e.target.value); checkField(e.target.value, 'email') }} />
        </div>
        <div className={styles.field}>
          <label>סיסמה</label>
          <input type="password" value={password} placeholder="••••••••"
            className={passBad ? styles.danger : ''}
            onChange={e => { setPassword(e.target.value); checkField(e.target.value, 'password') }} />
        </div>
        {showWarn && <div className={styles.warning}>⚠ קלט חשוד זוהה — הפעולה נחסמה ונרשמה</div>}
        <button className={styles.submit} onClick={doLogin}>התחבר</button>
      </div>
    </div>
  )
}
