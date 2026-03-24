import express from "express";
import cors from "cors";
import session from "express-session";
import { initDB } from "./db.js";
import { logMiddleware } from "./logger.js";
import authRoutes from "./routes/auth.js";
import productsRoutes from "./routes/products.js";
import ordersRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";
import dotenv from "dotenv"
dotenv.config()

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "cybershop-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: false, maxAge: 86400000 },
}));

app.use(logMiddleware);

app.use("/api", authRoutes);
app.use("/api", productsRoutes);
app.use("/api", ordersRoutes);
app.use("/api", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

initDB()
  .then(() => {
    app.listen(PORT,"0.0.0.0", () => {
      console.log(`✅ Backend running on http://localhost:${PORT}`);
      console.log(`📋 Logs: backend/logs/app.log`);
    });
  })
  .catch((err) => {
    console.error("❌ DB init failed:", err);
    process.exit(1);
  });
