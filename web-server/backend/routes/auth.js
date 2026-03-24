import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// POST /api/register
router.post("/register", async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "שם משתמש וסיסמה נדרשים" });
  }
  try {
    // פגיע בכוונה: plain text password + SQL concatenation
    const [result] = await pool.query(
      `INSERT INTO users (username, password, email) VALUES ('${username}', '${password}', '${email || ""}')`
    );
    const [rows] = await pool.query(`SELECT * FROM users WHERE id = ${result.insertId}`);
    req.session.user = { id: rows[0].id, username: rows[0].username, role: rows[0].role };
    res.status(201).json({ message: "נרשמת בהצלחה", user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: "שגיאה ברישום: " + err.message });
  }
});

// POST /api/login — פגיע ל-SQL Injection בכוונה
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    // SQL Injection intentional vulnerability
    const query = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;
    const [rows] = await pool.query(query);

    if (rows.length === 0) {
      return res.status(401).json({ error: "שם משתמש או סיסמה שגויים" });
    }
    req.session.user = { id: rows[0].id, username: rows[0].username, role: rows[0].role };
    res.json({ message: "התחברת בהצלחה", user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: "שגיאה בהתחברות: " + err.message });
  }
});

// POST /api/logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {});
  res.json({ message: "התנתקת בהצלחה" });
});

// GET /api/me
router.get("/me", (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "לא מחובר" });
  res.json(req.session.user);
});

export default router;
