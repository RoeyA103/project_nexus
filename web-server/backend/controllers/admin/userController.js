import { pool } from "../../db.js";

export const getUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM users ORDER BY id`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "שגיאה בטעינת משתמשים" });
  }
};