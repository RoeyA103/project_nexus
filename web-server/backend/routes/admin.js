import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// GET /api/admin/users — Broken Access Control בכוונה: ללא בדיקת הרשאות
router.get("/admin/users", async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM users ORDER BY id`);
    // Sensitive Data Exposure: מחזיר סיסמאות ב-plain text בכוונה
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "שגיאה בטעינת משתמשים" });
  }
});

export default router;
