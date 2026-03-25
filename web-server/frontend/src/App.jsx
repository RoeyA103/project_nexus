import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Products from "./pages/Products.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import Cart from "./pages/Cart.jsx";
import Orders from "./pages/Orders.jsx";

export const AppContext = createContext(null);

function Navbar() {
  const { user, setUser, cart } = useContext(AppContext);
  const navigate = useNavigate();

  const logout = async () => {
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    setUser(null);
    navigate("/");
  };

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        🛡️ <span>Cyber</span>Shop
      </Link>
      <div className="navbar-links">
        <Link to="/products">מוצרים</Link>
        {user ? (
          <>
            <Link to="/orders" className="hide-mobile">ההזמנות שלי</Link>
            <Link to="/cart" className="cart-btn">
              🛒
              {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
            </Link>
            <span style={{ color: "#aaa", fontSize: "0.85rem" }}>שלום, {user.username}</span>
            <button onClick={logout} className="btn btn-outline" style={{ fontSize: "0.85rem", padding: "0.3rem 0.8rem" }}>
              התנתק
            </button>
          </>
        ) : (
          <>
            <Link to="/cart" className="cart-btn">
              🛒
              {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
            </Link>
            <Link to="/login">כניסה</Link>
            <Link to="/register" className="btn-nav">הרשמה</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(u => { if (u) setUser(u); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));
  const clearCart = () => setCart([]);

  return (
    <AppContext.Provider value={{ user, setUser, cart, addToCart, removeFromCart, clearCart }}>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/orders" element={<Orders />} />
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  );
}
