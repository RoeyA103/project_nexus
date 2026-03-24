import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// GET /api/products?search=...  — פגיע ל-SQL Injection בכוונה
router.get("/products", async (req, res) => {
  const { search } = req.query;
  try {
    let query;
    if (search) {
      // SQL Injection intentional vulnerability
      query = `SELECT * FROM products WHERE name LIKE '%${search}%' OR description LIKE '%${search}%'`;
    } else {
      query = `SELECT * FROM products ORDER BY id`;
    }
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "שגיאה בטעינת מוצרים: " + err.message });
  }
});

// GET /api/products/:id
router.get("/products/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`SELECT * FROM products WHERE id = ?`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "מוצר לא נמצא" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "שגיאה בטעינת מוצר" });
  }
});

export default router;
