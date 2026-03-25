import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../App.jsx";

export default function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useContext(AppContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "שגיאה ברישום");
      setUser(data.user);
      navigate("/");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="form-container">
      <h2 className="form-title">📝 הרשמה</h2>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>שם משתמש</label>
          <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>אימייל</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="form-group">
          <label>סיסמה</label>
          <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
          {loading ? "נרשם..." : "הרשמה"}
        </button>
      </form>
      <div className="form-link">
        כבר יש לך חשבון? <Link to="/login">כניסה</Link>
      </div>
    </div>
  );
}
