import { pool } from "../../db.js";

export const getProducts = async (req, res) => {
  const { search } = req.query;
  try {
    let query;
    if (search) {
      query = `SELECT * FROM products WHERE name LIKE '%${search}%' OR description LIKE '%${search}%'`;
    } else {
      query = `SELECT * FROM products ORDER BY id`;
    }
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "שגיאה בטעינת מוצרים: " + err.message });
  }
};

export const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`SELECT * FROM products WHERE id = ?`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "מוצר לא נמצא" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "שגיאה בטעינת מוצר" });
  }
};