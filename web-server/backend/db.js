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
        ('MacBook Pro 16"', 'Apple MacBook Pro עם M3 Pro, 18GB RAM, 512GB SSD', 2499.99, 15, 'https://media.istockphoto.com/id/185094377/photo/laptop-front-open.jpg?s=2048x2048&w=is&k=20&c=h95C2jedp4peWckihyCjZn_SDSFNb89cVXL8qRqD4Es=', 'מחשבים ניידים'),
        ('Dell XPS 15', 'Dell XPS 15 עם Intel Core i9, 32GB RAM, 1TB SSD', 1899.99, 20, 'https://media.istockphoto.com/id/174750378/photo/modern-sliver-laptop-xxxl.jpg?s=612x612&w=0&k=20&c=h61mEoG_5dQqn2lW7y1wsAI91wSkSN_NzMRxj3fB690=', 'מחשבים ניידים'),
        ('iPhone 15 Pro', 'Apple iPhone 15 Pro עם A17 Pro, 256GB', 1199.99, 50, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8UGhvbmV8ZW58MHx8MHx8fDA%3D', 'סמארטפונים'),
        ('Samsung Galaxy S24 Ultra', 'Samsung Galaxy S24 Ultra עם S Pen, 512GB', 1299.99, 35, 'https://plus.unsplash.com/premium_photo-1680985551009-05107cd2752c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8UGhvbmV8ZW58MHx8MHx8fDA%3D', 'סמארטפונים'),
        ('iPad Pro 12.9"', 'Apple iPad Pro עם M2, 256GB, Wi-Fi + Cellular', 1099.99, 25, 'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8VGFibGV0c3xlbnwwfHwwfHx8MA%3D%3D', 'טאבלטים'),
        ('Sony WH-1000XM5', 'אוזניות אלחוטיות עם ביטול רעשים, 30 שעות סוללה', 349.99, 45, 'https://plus.unsplash.com/premium_photo-1678099940967-73fe30680949?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8SGVhZHBob25lc3xlbnwwfHwwfHx8MA%3D%3D', 'אביזרים'),
        ('AirPods Pro', 'Apple AirPods Pro עם H2 chip, Adaptive Transparency', 249.99, 60, 'https://images.unsplash.com/photo-1587523459887-e669248cf666?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8QWlyUG9kcyUyMFByb3xlbnwwfHwwfHx8MA%3D%3D', 'אביזרים'),
        ('LG 27" 4K Monitor', 'LG 4K IPS, HDR400, USB-C', 449.99, 12, 'https://images.unsplash.com/photo-1575017159701-e94c1fa4386c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8Y29tcHV0ZXIlMjBzY3JlZW5zfGVufDB8fDB8fHww', 'מסכים'),
        ('Logitech MX Master 3', 'עכבר אלחוטי MagSpeed, 8K DPI', 99.99, 80, 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8V2lyZWxlc3MlMjBtb3VzZXxlbnwwfHwwfHx8MA%3D%3D', 'אביזרים'),
        ('Samsung 1TB SSD', 'Samsung 990 Pro NVMe 1TB, עד 7450 MB/s', 129.99, 100, 'https://images.unsplash.com/photo-1665836700428-45bb099ca888?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8U2Ftc3VuZyUyMFN0b3JhZ2V8ZW58MHx8MHx8fDA%3D', 'אחסון'),
        ('ASUS ROG Gaming Laptop', 'ASUS ROG עם RTX 4080, i9, 32GB RAM, 240Hz', 2799.99, 8, 'https://media.istockphoto.com/id/174634535/photo/laptop-illuminated-by-screen-clipping-paths-included.jpg?s=612x612&w=0&k=20&c=do3CHRAHwSJczRhS0t-gcQjXWsGxNPmx9FpaAUX8x3Y=', 'מחשבים ניידים'),
        ('Google Pixel 8 Pro', 'Google Pixel 8 Pro עם Tensor G3, 128GB', 999.99, 30, 'https://plus.unsplash.com/premium_photo-1681333063733-734619bbc5ef?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTN8fFBob25lfGVufDB8fDB8fHww', 'סמארטפונים'),
        ('Anker 100W Charger', 'Anker GaN 100W, טעינת 3 מכשירים', 59.99, 150, 'https://images.unsplash.com/photo-1571567493758-2a9e76be35d7?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8Q2hhcmdpbmclMjAzJTIwZGV2aWNlc3xlbnwwfHwwfHx8MA%3D%3D', 'אביזרים'),
        ('Keychron K2 Keyboard', 'מקלדת מכנית אלחוטית, Gateron Brown', 89.99, 40, 'https://media.istockphoto.com/id/1394788004/photo/gamer-work-space-concept-top-view-a-gaming-gear-mouse-keyboard-joystick-headset-mobile.webp?a=1&b=1&s=612x612&w=0&k=20&c=H41hQhFXZJwBSHyFhnXJbT1KjH1snwnMoritPIDfStM=', 'אביזרים'),
        ('Samsung Galaxy Tab S9+', 'Samsung Galaxy Tab S9+ עם S Pen, 256GB', 999.99, 18, 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8VGFibGV0c3xlbnwwfHwwfHx8MA%3D%3D', 'טאבלטים')
      `);
      console.log("✅ Seeded 15 products");
    }

    console.log("✅ Database initialized");
  } finally {
    conn.release();
  }
}
