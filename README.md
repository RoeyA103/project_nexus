# CyberShop — אתר קניות פגיע
## חבר 1: Fullstack Developer

---

## מבנה הפרויקט

```
project/
  backend/          ← Node.js + Express (פורט 4000)
    index.js        ← נקודת כניסה ראשית
    db.js           ← חיבור MySQL + אתחול DB
    logger.js       ← כתיבת לוגים ל-app.log
    routes/
      auth.js       ← /api/register, /api/login, /api/logout, /api/me
      products.js   ← /api/products, /api/products/:id
      orders.js     ← /api/orders
      admin.js      ← /api/admin/users
    logs/
      app.log       ← לוגי JSON (חבר 2 קורא מכאן!)

  frontend/         ← React + Vite (פורט 3000)
    src/
      App.jsx       ← Router + Context
      pages/        ← Home, Products, ProductDetail, Cart, Orders, Login, Register
      index.css     ← כל הסגנונות

  nginx/
    nginx.conf      ← הגדרת Reverse Proxy + JSON logs (לחבר 3)

  simulation/
    simulate.js     ← סקריפט סימולציית תקיפות
```

---

## הרצה

### 1. MySQL
```bash
mysql -u root -p
CREATE DATABASE shop_db;
```

### 2. Backend
```bash
cd backend
npm install
DB_HOST=localhost DB_USER=root DB_PASSWORD=YOUR_PASS node index.js
```
הבסיס יאותחל אוטומטית עם 15 מוצרים.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
האתר עולה על http://localhost:3000

---

## API Endpoints

| Method | Path | תיאור | פגיעות |
|--------|------|--------|---------|
| POST | /api/register | רישום | Plain text password |
| POST | /api/login | כניסה | **SQL Injection** |
| GET | /api/products?search= | חיפוש | **SQL Injection** |
| GET | /api/products/:id | מוצר | — |
| POST | /api/orders | הזמנה | דורש session |
| GET | /api/orders?user_id=X | הזמנות | **IDOR** |
| GET | /api/admin/users | כל המשתמשים | **Broken Access Control** |

---

## פורמט הלוג (app.log)

```json
{
  "timestamp": "2024-06-01T14:23:11.000Z",
  "event": "login_attempt",
  "user": "admin",
  "status": "failure",
  "ip": "192.168.1.10",
  "details": {
    "method": "POST",
    "path": "/api/login",
    "http_status": 401,
    "product_id": null,
    "order_id": null,
    "response_time_ms": 42
  }
}
```

אירועים אפשריים: `login_attempt`, `register`, `product_view`, `product_search`, `order_placed`, `admin_access`, `unknown_route`

---

## סימולציית תקיפה

```bash
node simulation/simulate.js http://localhost:80
```

הסקריפט מדמה:
- תנועה רגילה (register, login, browse, order)
- SQL Injection על login ו-search
- Brute Force על login
- IDOR על orders
- Broken Access Control על admin/users
