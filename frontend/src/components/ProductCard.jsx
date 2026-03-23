import React from 'react'
import s from './ProductCard.module.css'

export default function ProductCard({ product, log, onAddCart }) {
  function handleView() {
    log('product_view', 'success', 'guest', {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      category: product.cat,
    })
  }

  function handleAdd(e) {
    e.stopPropagation()
    onAddCart(product)
    log('add_to_cart', 'success', 'guest', {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
    })
  }

  return (
    <div className={s.card} onClick={handleView}>
      <div className={s.img}>{product.emoji}</div>
      <div className={s.body}>
        <div className={s.name}>{product.name}</div>
        <div className={s.cat}>{product.cat}</div>
        <div className={s.footer}>
          <span className={s.price}>₪{product.price.toLocaleString()}</span>
          <button className={s.btn} onClick={handleAdd}>+ עגלה</button>
        </div>
      </div>
    </div>
  )
}
