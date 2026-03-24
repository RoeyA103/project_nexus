import React, { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import { AppContext } from "../App.jsx";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AppContext);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetch("/api/orders", { credentials: "include" })
      .then(r => r.json())
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return (
    <div className="container">
      <div className="empty-state">
        <h3>יש להתחבר כדי לצפות בהזמנות</h3>
        <Link to="/login" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-block" }}>
          כניסה
        </Link>
      </div>
    </div>
  );

  return (
    <div className="container">
      <h1 className="section-title">📦 ההזמנות שלי</h1>

      {loading ? (
        <div className="loader">טוען הזמנות...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <h3>עדיין אין הזמנות</h3>
          <Link to="/products" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-block" }}>
            לחנות
          </Link>
        </div>
      ) : (
        <table className="orders-table">
          <thead>
            <tr>
              <th>#</th>
              <th>מוצר</th>
              <th>כמות</th>
              <th>מחיר</th>
              <th>תאריך</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td>#{o.id}</td>
                <td>{o.product_name}</td>
                <td>{o.quantity}</td>
                <td>₪{(parseFloat(o.product_price) * o.quantity).toLocaleString()}</td>
                <td>{new Date(o.ordered_at).toLocaleDateString("he-IL")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
