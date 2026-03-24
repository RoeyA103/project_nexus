import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppContext } from "../App.jsx";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [msg, setMsg] = useState("");
  const { addToCart } = useContext(AppContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(p => { if (p) setProduct(p); else navigate("/products"); })
      .catch(() => navigate("/products"));
  }, [id]);

  if (!product) return <div className="loader">טוען...</div>;

  const handleAdd = () => {
    addToCart(product, quantity);
    setMsg("✅ נוסף לסל בהצלחה!");
    setTimeout(() => setMsg(""), 2000);
  };

  return (
    <div className="container">
      <button className="btn btn-outline" style={{ marginBottom: "1rem" }} onClick={() => navigate(-1)}>
        ← חזרה
      </button>

      <div className="product-detail">
        <div>
          <img src={product.image_url} alt={product.name} onError={e => e.target.src = "https://picsum.photos/400/300"} />
        </div>

        <div className="product-detail-info">
          <span className="badge badge-blue">{product.category}</span>
          <h1 style={{ marginTop: "0.5rem" }}>{product.name}</h1>
          <div className="product-detail-price">₪{parseFloat(product.price).toLocaleString()}</div>
          <p className="product-detail-desc">{product.description}</p>

          <div style={{ color: "#27ae60", marginBottom: "1rem" }}>
            ✓ במלאי — {product.stock} יחידות
          </div>

          <div className="quantity-selector">
            <span>כמות:</span>
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}>+</button>
          </div>

          {msg && <div className="alert alert-success">{msg}</div>}

          <button className="btn btn-primary btn-lg" onClick={handleAdd} style={{ width: "100%" }}>
            🛒 הוסף לסל
          </button>
        </div>
      </div>
    </div>
  );
}
