import React from 'react'
import s from './Navbar.module.css'

export default function Navbar({ cartCount, onLoginClick }) {
  return (
    <nav className={s.nav}>
      <div className={s.logo}>Shop<em>Zone</em></div>
      <div className={s.links}>
        <a href="#">בית</a>
        <a href="#">קטגוריות</a>
        <a href="#">מבצעים</a>
        <a href="#" onClick={e => { e.preventDefault(); onLoginClick() }}>כניסה</a>
        <button className={s.cart}>עגלה ({cartCount})</button>
      </div>
    </nav>
  )
}
