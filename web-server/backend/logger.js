import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, "logs");
const LOG_FILE = path.join(LOG_DIR, "app.log");

fs.mkdirSync(LOG_DIR, { recursive: true });

export function writeLog(event, user, status, ip, details) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    user,
    status,
    ip,
    details,
  };
  fs.appendFile(LOG_FILE, JSON.stringify(entry) + "\n", () => {});
}

export function logMiddleware(req, res, next) {
  res.on("finish", () => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      forwarded?.split(",")[0].trim() ||
      req.headers["x-real-ip"] ||
      req.socket?.remoteAddress ||
      "unknown";
    const user = req.session?.user?.username || "guest";
    const path = req.path;

    let event = "unknown_route";
    if (path === "/api/login") event = "login_attempt";
    else if (path === "/api/register") event = "register";
    else if (path.startsWith("/api/products") && req.query.search) event = "product_search";
    else if (path.startsWith("/api/products")) event = "product_view";
    else if (path === "/api/orders") event = "order_placed";
    else if (path.startsWith("/api/admin")) event = "admin_access";

    const status = res.statusCode < 400 ? "success" : "failure";

    writeLog(event, user, status, ip, {
      method: req.method,
      path,
      http_status: res.statusCode,
      product_id: req.params?.id ? parseInt(req.params.id) : null,
      order_id: null,
      response_time_ms: 0,
    });
  });
  next();
}
