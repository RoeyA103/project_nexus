import React from 'react'
import styles from './ProductCard.module.css'
import { randIP } from '../hooks/useLogger'

export default function ProductCard({ product, addLog, onAddCart }) {
  function handleView() {
    addLog('info', 'product_view', randIP(), 'guest',
      { product_id: product.id, product_name: product.name, price: product.price },
      `Product viewed: ${product.name}`)
  }

  function handleAdd(e) {
    e.stopPropagation()
    onAddCart(product)
    addLog('info', 'add_to_cart', randIP(), 'guest',
      { product_id: product.id, product_name: product.name, price: product.price },
      `Added to cart: ${product.name}`)
  }

  return (
    <div className={styles.card} onClick={handleView}>
      <div className={styles.img}>{product.emoji}</div>
      <div className={styles.body}>
        <div className={styles.name}>{product.name}</div>
        <div className={styles.cat}>{product.cat}</div>
        <div className={styles.footer}>
          <span className={styles.price}>₪{product.price.toLocaleString()}</span>
          <button className={styles.addBtn} onClick={handleAdd}>+ עגלה</button>
        </div>
      </div>
    </div>
  )
}
