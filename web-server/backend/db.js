import mysql from "mysql2/promise";
import dotenv from "dotenv"
dotenv.config()
console.log("DB PORT =", process.env.DB_PORT);
console.log("DB HOST =", process.env.DB_HOST);
export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "shop_db",
  waitForConnections: true,
  connectionLimit: 10,
});

export async function initDB() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS shop_db`);
    await conn.query(`USE shop_db`);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        role ENUM('user','admin') DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2),
        stock INT DEFAULT 0,
        image_url TEXT,
        category VARCHAR(100)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        product_id INT,
        quantity INT,
        ordered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    const [rows] = await conn.query(`SELECT COUNT(*) as cnt FROM products`);
    if (rows[0].cnt === 0) {
      await conn.query(`
        INSERT INTO products (name, description, price, stock, image_url, category) VALUES
        ('MacBook Pro 16"', 'Apple MacBook Pro עם M3 Pro, 18GB RAM, 512GB SSD', 2499.99, 15, 'https://picsum.photos/seed/laptop1/400/300', 'מחשבים ניידים'),
        ('Dell XPS 15', 'Dell XPS 15 עם Intel Core i9, 32GB RAM, 1TB SSD', 1899.99, 20, 'https://picsum.photos/seed/laptop2/400/300', 'מחשבים ניידים'),
        ('iPhone 15 Pro', 'Apple iPhone 15 Pro עם A17 Pro, 256GB', 1199.99, 50, 'https://picsum.photos/seed/phone1/400/300', 'סמארטפונים'),
        ('Samsung Galaxy S24 Ultra', 'Samsung Galaxy S24 Ultra עם S Pen, 512GB', 1299.99, 35, 'https://picsum.photos/seed/phone2/400/300', 'סמארטפונים'),
        ('iPad Pro 12.9"', 'Apple iPad Pro עם M2, 256GB, Wi-Fi + Cellular', 1099.99, 25, 'https://picsum.photos/seed/tablet1/400/300', 'טאבלטים'),
        ('Sony WH-1000XM5', 'אוזניות אלחוטיות עם ביטול רעשים, 30 שעות סוללה', 349.99, 45, 'https://picsum.photos/seed/headphones1/400/300', 'אביזרים'),
        ('AirPods Pro', 'Apple AirPods Pro עם H2 chip, Adaptive Transparency', 249.99, 60, 'https://picsum.photos/seed/airpods/400/300', 'אביזרים'),
        ('LG 27" 4K Monitor', 'LG 4K IPS, HDR400, USB-C', 449.99, 12, 'https://picsum.photos/seed/monitor1/400/300', 'מסכים'),
        ('Logitech MX Master 3', 'עכבר אלחוטי MagSpeed, 8K DPI', 99.99, 80, 'https://picsum.photos/seed/mouse1/400/300', 'אביזרים'),
        ('Samsung 1TB SSD', 'Samsung 990 Pro NVMe 1TB, עד 7450 MB/s', 129.99, 100, 'https://picsum.photos/seed/ssd1/400/300', 'אחסון'),
        ('ASUS ROG Gaming Laptop', 'ASUS ROG עם RTX 4080, i9, 32GB RAM, 240Hz', 2799.99, 8, 'https://picsum.photos/seed/laptop3/400/300', 'מחשבים ניידים'),
        ('Google Pixel 8 Pro', 'Google Pixel 8 Pro עם Tensor G3, 128GB', 999.99, 30, 'https://picsum.photos/seed/phone3/400/300', 'סמארטפונים'),
        ('Anker 100W Charger', 'Anker GaN 100W, טעינת 3 מכשירים', 59.99, 150, 'https://picsum.photos/seed/charger1/400/300', 'אביזרים'),
        ('Keychron K2 Keyboard', 'מקלדת מכנית אלחוטית, Gateron Brown', 89.99, 40, 'https://picsum.photos/seed/keyboard1/400/300', 'אביזרים'),
        ('Samsung Galaxy Tab S9+', 'Samsung Galaxy Tab S9+ עם S Pen, 256GB', 999.99, 18, 'https://picsum.photos/seed/tablet2/400/300', 'טאבלטים')
      `);
      console.log("✅ Seeded 15 products");
    }

    console.log("✅ Database initialized");
  } finally {
    conn.release();
  }
}
