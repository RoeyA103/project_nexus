import React, { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AppContext } from "../App.jsx";

export default function Cart() {
  const { cart, removeFromCart, clearCart, user } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const total = cart.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);

  const handleOrder = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setLoading(true);
    setError("");
    try {
      for (const item of cart) {
        const r = await fetch("/api/orders", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: item.id, quantity: item.quantity }),
        });
        if (!r.ok) throw new Error("שגיאה בביצוע הזמנה");
      }
      clearCart();
      setMsg("✅ ההזמנה בוצעה בהצלחה!");
      setTimeout(() => navigate("/orders"), 1500);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  if (cart.length === 0) {
    return (
      <div className="container">
        <div className="empty-state">
          <div style={{ fontSize: "4rem" }}>🛒</div>
          <h3>הסל שלך ריק</h3>
          <p>הוסף מוצרים כדי להתחיל לקנות</p>
          <Link to="/products" className="btn btn-primary btn-lg" style={{ marginTop: "1rem", display: "inline-block" }}>
            לחנות
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="section-title">🛒 סל הקניות</h1>

      {cart.map(item => (
        <div key={item.id} className="cart-item">
          <img src={item.image_url} alt={item.name} onError={e => e.target.src = "https://picsum.photos/80/60"} />
          <div className="cart-item-info">
            <div className="cart-item-name">{item.name}</div>
            <div className="cart-item-price">₪{parseFloat(item.price).toLocaleString()} × {item.quantity}</div>
          </div>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#4f9cf9", minWidth: "80px", textAlign: "center" }}>
            ₪{(parseFloat(item.price) * item.quantity).toLocaleString()}
          </div>
          <button className="btn btn-danger" style={{ padding: "0.4rem 0.8rem" }} onClick={() => removeFromCart(item.id)}>
            🗑️
          </button>
        </div>
      ))}

      <div className="cart-summary">
        <div className="cart-total">
          <span>סה"כ לתשלום:</span>
          <span style={{ color: "#4f9cf9" }}>₪{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {msg && <div className="alert alert-success">{msg}</div>}

        <div style={{ display: "flex", gap: "1rem" }}>
          <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handleOrder} disabled={loading}>
            {loading ? "מבצע הזמנה..." : "✅ בצע הזמנה"}
          </button>
          <button className="btn btn-outline" onClick={clearCart}>נקה סל</button>
        </div>

        {!user && (
          <p style={{ textAlign: "center", marginTop: "1rem", color: "#999", fontSize: "0.9rem" }}>
            יש <Link to="/login" style={{ color: "#4f9cf9" }}>להתחבר</Link> כדי לבצע הזמנה
          </p>
        )}
      </div>
    </div>
  );
}
