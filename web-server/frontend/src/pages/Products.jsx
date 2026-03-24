import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../App.jsx";

const CATEGORIES = ["הכל", "מחשבים ניידים", "סמארטפונים", "טאבלטים", "מסכים", "אחסון", "אביזרים"];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("הכל");
  const [loading, setLoading] = useState(false);
  const { addToCart } = useContext(AppContext);
  const navigate = useNavigate();

  const fetchProducts = async (q = "") => {
    setLoading(true);
    try {
      const url = q ? `/api/products?search=${encodeURIComponent(q)}` : "/api/products";
      const r = await fetch(url);
      const data = await r.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts(search);
    setCategory("הכל");
  };

  const filtered = category === "הכל" ? products : products.filter(p => p.category === category);

  return (
    <div className="container">
      <h1 className="section-title">כל המוצרים</h1>

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="חפש מוצר..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">חיפוש</button>
        {search && (
          <button type="button" className="btn btn-outline" onClick={() => { setSearch(""); fetchProducts(); }}>
            נקה
          </button>
        )}
      </form>

      <div className="filter-tabs">
        {CATEGORIES.map(c => (
          <button key={c} className={`filter-tab ${category === c ? "active" : ""}`} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loader">טוען מוצרים...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><h3>לא נמצאו מוצרים</h3></div>
      ) : (
        <div className="products-grid">
          {filtered.map(p => (
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
      )}
    </div>
  );
}
