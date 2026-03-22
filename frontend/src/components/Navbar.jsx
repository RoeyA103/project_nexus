import React from 'react'
import styles from './Navbar.module.css'

export default function Navbar({ cartCount, onLoginClick }) {
  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>Shop<em>Zone</em></div>
      <div className={styles.links}>
        <a href="#">בית</a>
        <a href="#">קטגוריות</a>
        <a href="#">מבצעים</a>
        <a href="#" onClick={e => { e.preventDefault(); onLoginClick() }}>כניסה</a>
        <button className={styles.cartBtn}>עגלה ({cartCount})</button>
      </div>
    </nav>
  )
}
