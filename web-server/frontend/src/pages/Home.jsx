import React, { useEffect, useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../App.jsx";

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const { addToCart } = useContext(AppContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/products")
      .then(r => r.json())
      .then(data => setFeatured(data.slice(0, 4)))
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="hero">
        <h1>חנות האלקטרוניקה <span>המובילה</span></h1>
        <p>מחשבים, סמארטפונים, טאבלטים ואביזרים — הכל במקום אחד</p>
        <div className="hero-btns">
          <Link to="/products" className="btn btn-primary btn-lg">🛍️ לקניות</Link>
          <Link to="/register" className="btn btn-outline btn-lg">הצטרף עכשיו</Link>
        </div>
      </div>

      <div className="container">
        <h2 className="section-title">מוצרים מובחרים</h2>
        <div className="products-grid">
          {featured.map(p => (
            <div key={p.id} className="product-card" onClick={() => navigate(`/products/${p.id}`)}>
              <img src={p.image_url} alt={p.name} onError={e => e.target.src = "https://picsum.photos/400/300"} />
              <div className="product-card-body">
                <div className="product-category">{p.category}</div>
                <div className="product-name">{p.name}</div>
                <div className="product-price">₪{parseFloat(p.price).toLocaleString()}</div>
                <div className="product-stock">✓ במלאי ({p.stock})</div>
              </div>
              <div className="product-card-footer">
                <button className="btn btn-primary" style={{ width: "100%" }}
                  onClick={e => { e.stopPropagation(); addToCart(p); }}>
                  🛒 הוסף לסל
                </button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <Link to="/products" className="btn btn-outline btn-lg">ראה את כל המוצרים ←</Link>
        </div>
      </div>
    </>
  );
}
