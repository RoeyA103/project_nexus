import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// POST /api/orders
router.post("/orders", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "יש להתחבר תחילה" });

  const { product_id, quantity } = req.body;
  if (!product_id || !quantity) return res.status(400).json({ error: "נדרש product_id וכמות" });

  try {
    const [result] = await pool.query(
      `INSERT INTO orders (user_id, product_id, quantity) VALUES (?, ?, ?)`,
      [req.session.user.id, product_id, quantity]
    );
    const [rows] = await pool.query(`SELECT * FROM orders WHERE id = ?`, [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "שגיאה בביצוע הזמנה: " + err.message });
  }
});

// GET /api/orders?user_id=X — IDOR בכוונה: לא מוודא שייכות
router.get("/orders", async (req, res) => {
  const userId = req.query.user_id || req.session?.user?.id;
  if (!userId) return res.status(401).json({ error: "לא מחובר" });

  try {
    const [rows] = await pool.query(
      `SELECT o.*, p.name as product_name, p.price as product_price
       FROM orders o
       JOIN products p ON o.product_id = p.id
       WHERE o.user_id = ?
       ORDER BY o.ordered_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "שגיאה בטעינת הזמנות" });
  }
});

export default router;
