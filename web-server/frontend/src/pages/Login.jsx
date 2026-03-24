import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../App.jsx";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useContext(AppContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "שגיאה בהתחברות");
      setUser(data.user);
      navigate("/");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="form-container">
      <h2 className="form-title">🔐 כניסה</h2>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>שם משתמש</label>
          <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>סיסמה</label>
          <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
          {loading ? "מתחבר..." : "כניסה"}
        </button>
      </form>
      <div className="form-link">
        אין לך חשבון? <Link to="/register">הרשמה</Link>
      </div>
    </div>
  );
}
