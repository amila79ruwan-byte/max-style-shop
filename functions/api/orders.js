import { expireUnpaid, SLIP_HOURS } from "../_lib/expire.js";
import { hit } from "../_lib/ratelimit.js";
const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
const ok = (r, e) => e.ADMIN_PASSWORD && r.headers.get("x-admin-password") === e.ADMIN_PASSWORD;
const STATUSES = ["received", "confirmed", "packed", "out", "delivered", "cancelled"];
const DISTRICTS = ["Colombo","Gampaha","Kalutara","Kandy","Matale","Nuwara Eliya","Galle","Matara","Hambantota","Jaffna","Kilinochchi","Mannar","Vavuniya","Mullaitivu","Batticaloa","Ampara","Trincomalee","Kurunegala","Puttalam","Anuradhapura","Polonnaruwa","Badulla","Monaragala","Ratnapura","Kegalle"];
const clean = s => String(s || "").trim().slice(0, 200);
const codeOf = id => "MS-" + (1000 + Number(id));
const phoneOk = p => /^[0-9+\s-]{9,15}$/.test(p);
const last9 = p => String(p || "").replace(/\D/g, "").slice(-9);
const clientIp = r => r.headers.get("cf-connecting-ip") || "unknown";
// A damaged items value must never break a whole page (stats, order list...).
const parseItems = v => { try { const a = JSON.parse(v || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const listOf = v => String(v || "").split(",").map(s => s.trim()).filter(Boolean);

// Price rules (all in Rs.)
const FIRST_ORDER_PCT = 10;      // first order discount, on the items total
const FREE_DELIVERY_FROM = 7000; // free delivery when the items total (after discount) is this or more
const DELIVERY_FEE = 350;        // courier delivery
const COD_FEE = 150;             // extra fee for cash on delivery
const GIFT_WRAP_FEE = 200;       // optional gift wrapping

// The signed-in customer for a token (or null).
async function customerOf(env, token) {
  if (!token) return null;
  return await env.DB.prepare("SELECT id,phone FROM customers WHERE token=? AND (token_exp=0 OR token_exp>?)").bind(String(token), Date.now()).first();
}

// First order discount: only for a signed-in customer, and only when there is no active (not cancelled)
// order from the account phone or from the phone typed at checkout. Phones are matched by their last 9 digits.
// Deleting an account does not delete its orders, so a new account cannot get the discount again.
async function isFirstOrder(env, token, phone) {
  const c = await customerOf(env, token);
  if (!c) return false;
  const last9s = [...new Set([c.phone, phone]
    .map(p => String(p || "").replace(/\D/g, "").slice(-9))
    .filter(x => x.length === 9))];
  for (const l of last9s) {
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE phone_norm=? AND status<>'cancelled'").bind(l).first();
    if (row && row.n > 0) return false;
  }
  return true;
}

// Stock: sign +1 puts the items back, sign -1 takes them out. Products with no stock number (NULL) are not tracked.
async function adjustStock(env, items, sign) {
  if (!items || !items.length) return;
  const { results: prods } = await env.DB.prepare("SELECT id,name FROM products").all();
  const qtyById = {};
  for (const it of items) {
    const p = prods.find(x => (it.id ? x.id == it.id : x.name === it.name));
    if (!p) continue;
    qtyById[p.id] = (qtyById[p.id] || 0) + (Number(it.qty) || 0);
  }
  const st = Object.entries(qtyById).map(([id, q]) => sign > 0
    ? env.DB.prepare("UPDATE products SET stock=stock+? WHERE id=? AND stock IS NOT NULL").bind(q, id)
    : env.DB.prepare("UPDATE products SET stock=MAX(stock-?,0) WHERE id=? AND stock IS NOT NULL").bind(q, id));
  if (st.length) await env.DB.batch(st);
}

// Takes the stock out for a new order in one safe step per product: the UPDATE only works when enough is left,
// so two orders at the same moment can never take the same last item. Products with no stock number (NULL) are skipped.
// Returns { ok:true, taken } or { ok:false, error } (and puts back anything it already took).
async function reserveStock(env, need, products) {
  const taken = [];
  for (const id in need) {
    const p = products.find(x => x.id == id);
    if (!p || p.stock === null || p.stock === undefined) continue;   // not tracked
    const r = await env.DB.prepare("UPDATE products SET stock=stock-? WHERE id=? AND stock IS NOT NULL AND stock>=?").bind(need[id], id, need[id]).run();
    if (r.meta && r.meta.changes > 0) { taken.push({ id, qty: need[id] }); continue; }
    await releaseStock(env, taken);
    const now = await env.DB.prepare("SELECT stock FROM products WHERE id=?").bind(id).first();
    const left = now && now.stock !== null && now.stock !== undefined ? now.stock : 0;
    return { ok: false, error: left <= 0 ? p.name + " is sold out." : "Only " + left + " left of " + p.name + "." };
  }
  return { ok: true, taken };
}
async function releaseStock(env, taken) {
  if (!taken || !taken.length) return;
  await env.DB.batch(taken.map(t => env.DB.prepare("UPDATE products SET stock=stock+? WHERE id=? AND stock IS NOT NULL").bind(t.qty, t.id)));
}

// Admin stats: totals, per day (Sri Lanka time, day changes at 00:00) and per product. Cancelled orders are not counted.
async function buildStats(env) {
  const { results: orders } = await env.DB.prepare("SELECT id,items,total,status,created FROM orders").all();
  const { results: prods } = await env.DB.prepare("SELECT id,name,stock FROM products").all();
  const dayOf = t => new Date(t).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
  const today = dayOf(Date.now());
  const sum = { orders: 0, qty: 0, revenue: 0, cancelled: 0 };
  const days = {}, byProd = {};
  for (const o of orders) {
    if (o.status === "cancelled") { sum.cancelled++; continue; }
    const items = parseItems(o.items);
    const q = items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    sum.orders++; sum.qty += q; sum.revenue += Number(o.total) || 0;
    const k = dayOf(o.created);
    const d = days[k] || (days[k] = { day: k, orders: 0, qty: 0, revenue: 0 });
    d.orders++; d.qty += q; d.revenue += Number(o.total) || 0;
    for (const i of items) {
      const p = prods.find(x => (i.id ? x.id == i.id : x.name === i.name));
      const key = p ? "p" + p.id : "n" + i.name;
      const r = byProd[key] || (byProd[key] = { id: p ? p.id : null, name: p ? p.name : i.name, sold: 0, revenue: 0, stock: p ? (p.stock ?? null) : null });
      r.sold += Number(i.qty) || 0;
      r.revenue += (Number(i.price) || 0) * (Number(i.qty) || 0);
    }
  }
  for (const p of prods) {
    if (!byProd["p" + p.id]) byProd["p" + p.id] = { id: p.id, name: p.name, sold: 0, revenue: 0, stock: p.stock ?? null };
  }
  return {
    summary: sum,
    today: days[today] || { day: today, orders: 0, qty: 0, revenue: 0 },
    days: Object.values(days).sort((a, b) => (a.day < b.day ? 1 : -1)),
    products: Object.values(byProd).sort((a, b) => b.sold - a.sold)
  };
}

export async function onRequestPost({ request, env }) {
  await expireUnpaid(env);   // free the stock of unpaid orders first
  const b = await request.json();
  // Customer says "I sent the slip": order code + phone must match. Only moves awaiting -> slip_sent.
  if (b.action === "slipSent") {
    const m = String(b.code || "").trim().toUpperCase().match(/^MS-(\d+)$/);
    const pn = last9(b.phone);
    if (!m || pn.length !== 9) return J({ error: "Invalid details" }, 400);
    if (!(await hit(env, "slip:" + clientIp(request), 20, 3600000))) return J({ error: "Too many tries. Please try again later." }, 429);
    const r = await env.DB.prepare("UPDATE orders SET pay_state='slip_sent' WHERE id=? AND phone_norm=? AND pay_state='awaiting'")
      .bind(Number(m[1]) - 1000, pn).run();
    return J({ ok: true, changed: !!(r.meta && r.meta.changes > 0) });
  }
  // Bot check (Cloudflare Turnstile). Only active when the TURNSTILE_SECRET variable is set in Cloudflare Pages.
  if (env.TURNSTILE_SECRET) {
    const tok = String(b.cf || "");
    if (!tok) return J({ error: "Please complete the security check and try again." }, 400);
    try {
      const fd = new FormData();
      fd.append("secret", env.TURNSTILE_SECRET); fd.append("response", tok); fd.append("remoteip", clientIp(request));
      const v = await (await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: fd })).json();
      if (!v.success) return J({ error: "Security check failed. Please try again." }, 400);
    } catch (e) { /* Cloudflare could not be reached: let the order through rather than lose it */ }
  }
  const name = clean(b.name), phone1 = clean(b.phone1), phone2 = clean(b.phone2);
  const district = clean(b.district), address = String(b.address || "").trim().slice(0, 500);
  if (!name || !phone1 || !address || !DISTRICTS.includes(district)) return J({ error: "Please fill in all required fields." }, 400);
  if (!phoneOk(phone1) || (phone2 && !phoneOk(phone2))) return J({ error: "Please enter a valid phone number." }, 400);
  const payment = String(b.payment || "cod");
  if (!["cod", "bank", "online"].includes(payment)) return J({ error: "This payment method is not available." }, 400);
  const isGift = !!b.gift;
  if (isGift && payment === "cod") return J({ error: "Cash on delivery is not available for gifts." }, 400);
  let pm = null;   // chosen bank / online method
  if (payment !== "cod") {
    pm = await env.DB.prepare("SELECT id,type,title,details FROM pay_methods WHERE id=? AND active=1").bind(Number(b.payMethodId) || 0).first();
    if (!pm || pm.type !== payment) return J({ error: "Please choose a payment method." }, 400);
  }
  const senderName = isGift ? clean(b.senderName).slice(0, 60) : "";
  const senderPhone = isGift ? clean(b.senderPhone) : "";
  if (isGift && (!senderName || !phoneOk(senderPhone))) return J({ error: "Please enter your name and phone number (sender)." }, 400);
  const giftMsg = isGift ? String(b.giftMsg || "").trim().slice(0, 300) : "";
  const cartIn = Array.isArray(b.items) ? b.items : [];
  if (!cartIn.length || cartIn.length > 30) return J({ error: "Your cart is empty." }, 400);

  // Anti-spam: (1) max 10 orders per hour per IP, (2) max 2 open (not yet confirmed) orders per phone,
  // (3) max 40 pieces per order. Stops someone locking all the stock with fake orders.
  const phoneN = last9(phone1);
  const ipKey = "ordip:" + clientIp(request), nowT = Date.now();
  try {
    const row = await env.DB.prepare("SELECT n,updated FROM login_attempts WHERE k=?").bind(ipKey).first();
    const n = row && nowT - row.updated < 3600000 ? row.n : 0;
    if (n >= 10) return J({ error: "Too many orders from this connection. Please try again later or WhatsApp us." }, 429);
    await env.DB.prepare("INSERT INTO login_attempts (k,n,locked_until,updated) VALUES (?,?,0,?) ON CONFLICT(k) DO UPDATE SET n=?, updated=?")
      .bind(ipKey, n + 1, row && n ? row.updated : nowT, n + 1, row && n ? row.updated : nowT).run();
  } catch (e) { /* limiter failure must not stop real orders */ }
  const open = await env.DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE phone_norm=? AND status='received'").bind(phoneN).first();
  if (open && open.n >= 2) return J({ error: "You already have 2 orders waiting for confirmation. Please wait for us to confirm them, or WhatsApp us." }, 429);
  if (cartIn.reduce((s, i) => s + Math.min(Math.max(parseInt(i && i.qty, 10) || 0, 1), 20), 0) > 40) return J({ error: "Too many items in one order. Please WhatsApp us for bulk orders." }, 400);

  // Prices are read from the database here. The browser's prices are never trusted.
  const { results: products } = await env.DB.prepare("SELECT id,name,price,sizes,colors,stock FROM products").all();
  const lines = [];
  let subtotal = 0;
  for (const it of cartIn) {
    const p = products.find(x => x.id == it.id);
    if (!p) return J({ error: "A product in your cart is no longer available." }, 400);
    const qty = Math.min(Math.max(parseInt(it.qty, 10) || 0, 1), 20);
    const sizeList = listOf(p.sizes);
    const size = sizeList.length ? clean(it.size) : "";
    if (sizeList.length && !sizeList.includes(size)) return J({ error: "Please select a size for " + p.name + "." }, 400);
    // Colors may be stored as "Name" or "Name:#hex". Only the name is compared.
    const colorList = listOf(p.colors).map(c => c.split(":")[0].trim());
    const color = colorList.length ? clean(it.color) : "";
    if (colorList.length && !colorList.includes(color)) return J({ error: "Please select a color for " + p.name + "." }, 400);
    lines.push({ id: p.id, name: p.name, size, color, qty, price: p.price });
    subtotal += p.price * qty;
  }

  // Stock check (only for products that have a stock number)
  const need = {};
  for (const l of lines) need[l.id] = (need[l.id] || 0) + l.qty;
  for (const id in need) {
    const p = products.find(x => x.id == id);
    if (p.stock !== null && p.stock !== undefined && p.stock < need[id]) {
      return J({ error: p.stock <= 0 ? p.name + " is sold out." : "Only " + p.stock + " left of " + p.name + "." }, 400);
    }
  }

  // Discounts and fees (first order discount: signed-in customers only)
  const firstOrder = await isFirstOrder(env, b.token, phone1);
  const discount = firstOrder ? Math.round(subtotal * FIRST_ORDER_PCT / 100) : 0;
  const afterDiscount = subtotal - discount;
  const delivery = afterDiscount >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE;
  const codFee = payment === "cod" ? COD_FEE : 0;
  const giftWrap = isGift && b.giftWrap ? GIFT_WRAP_FEE : 0;
  const total = afterDiscount + delivery + codFee + giftWrap;
  const payState = payment === "cod" ? "none" : "awaiting";   // awaiting = waiting for the payment slip
  const now = Date.now();

  // Take the stock first (safe against two orders at the same moment). If anything fails after this, it is put back.
  const res = await reserveStock(env, need, products);
  if (!res.ok) return J({ error: res.error }, 400);

  const cust = await customerOf(env, b.token);
  const cols = "name,phone1,phone2,phone_norm,customer_id,district,address,items,total,status,created,payment,subtotal,discount,delivery_fee,cod_fee,is_gift,gift_wrap,gift_msg,sender_name,sender_phone,hide_sender,pay_state,pay_method_id";
  let r;
  try {
  r = await env.DB.prepare(
    "INSERT INTO orders (" + cols + ") VALUES (" + cols.split(",").map(() => "?").join(",") + ")"
  ).bind(name, phone1, phone2, phoneN, cust ? cust.id : 0, district, address, JSON.stringify(lines), total, "received", now, payment, subtotal, discount, delivery, codFee,
    isGift ? 1 : 0, giftWrap, giftMsg, senderName, senderPhone, isGift && b.hideSender ? 1 : 0, payState, pm ? pm.id : 0).run();
  } catch (e) {
    await releaseStock(env, res.taken);   // the order could not be saved: put the stock back
    return J({ error: "Could not place the order. Please try again." }, 500);
  }
  return J({ ok: true, code: codeOf(r.meta.last_row_id), subtotal, discount, delivery, codFee, giftWrap, total, lines, payState,
    payTitle: pm ? pm.title : "", payDetails: pm ? pm.details : "", deadline: payState === "awaiting" ? now + SLIP_HOURS * 3600000 : 0 });
}

// Public: customer checks status with an order code. Admin (with password): full list, or ?stats=1 for statistics.
export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams;
  if (q.has("turnstile")) return J({ sitekey: env.TURNSTILE_SITEKEY || "" });   // public key for the checkout page ("" = check is off)
  await expireUnpaid(env);
  // Public: is this signed-in customer eligible for the first order discount? (returns only true/false)
  if (q.has("firstcheck")) {
    // Max 30 checks per hour per connection: stops people probing which phone numbers have ordered before.
    if (!(await hit(env, "fc:" + clientIp(request), 30, 3600000))) return J({ error: "Too many tries. Please try again later.", first: false }, 429);
    const bearer = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    return J({ first: await isFirstOrder(env, bearer || q.get("token"), q.get("firstcheck")) });
  }
  if (!ok(request, env)) {
    const code = (q.get("code") || "").trim().toUpperCase();
    const m = code.match(/^MS-(\d+)$/);
    if (!m) return J({ error: "Please enter a valid order code, like MS-1001." }, 400);
    // The last 4 digits of the order's phone number are needed too, so codes cannot simply be counted up (MS-1001, 1002...).
    const p4 = String(q.get("p") || "").replace(/\D/g, "");
    if (p4.length !== 4) return J({ error: "Please also enter the last 4 digits of the phone number used for the order." }, 400);
    // Guessing limit: 30 tries per hour per connection.
    const tk = "trk:" + clientIp(request), tn = Date.now();
    try {
      const t = await env.DB.prepare("SELECT n,updated FROM login_attempts WHERE k=?").bind(tk).first();
      const cnt = t && tn - t.updated < 3600000 ? t.n : 0;
      if (cnt >= 30) return J({ error: "Too many tries. Please try again later." }, 429);
      await env.DB.prepare("INSERT INTO login_attempts (k,n,locked_until,updated) VALUES (?,?,0,?) ON CONFLICT(k) DO UPDATE SET n=?, updated=?")
        .bind(tk, cnt + 1, cnt ? t.updated : tn, cnt + 1, cnt ? t.updated : tn).run();
    } catch (e) {}
    // Also limit tries per order code (20 per hour), so changing IP address does not help someone guess the 4 digits.
    if (!(await hit(env, "trkc:" + m[1], 20, 3600000))) return J({ error: "Too many tries for this order. Please try again later or WhatsApp us." }, 429);
    const row = await env.DB.prepare("SELECT status,items,total,created,phone_norm FROM orders WHERE id=?").bind(Number(m[1]) - 1000).first();
    if (!row || !row.phone_norm || row.phone_norm.slice(-4) !== p4) return J({ error: "Order not found. Please check the code and phone digits." }, 404);
    return J({ code, status: row.status, items: parseItems(row.items), total: row.total, created: row.created });
  }
  if (q.has("stats")) return J(await buildStats(env));
  const { results } = await env.DB.prepare("SELECT o.*, p.title AS pay_title FROM orders o LEFT JOIN pay_methods p ON p.id=o.pay_method_id ORDER BY o.id DESC LIMIT 200").all();
  return J(results.map(o => ({ ...o, code: codeOf(o.id), items: parseItems(o.items) })));
}

// Admin only: change status and/or edit customer details.
export async function onRequestPut({ request, env }) {
  if (!ok(request, env)) return J({ error: "Wrong password" }, 401);
  const b = await request.json();
  const id = Number(b.id);
  const cur = await env.DB.prepare("SELECT status,items FROM orders WHERE id=?").bind(id).first();
  if (!cur) return J({ error: "Order not found" }, 404);

  const hasStatus = "status" in b;
  const hasDetails = "name" in b;
  const hasPay = "pay_state" in b;
  if (hasStatus && !STATUSES.includes(b.status)) return J({ error: "Invalid status" }, 400);
  if (hasPay && !["awaiting", "slip_sent", "paid"].includes(b.pay_state)) return J({ error: "Invalid payment state" }, 400);

  let det = null;
  if (hasDetails) {
    const name = clean(b.name), phone1 = clean(b.phone1), phone2 = clean(b.phone2);
    const district = clean(b.district), address = String(b.address || "").trim().slice(0, 500);
    if (!name || !phone1 || !address || !DISTRICTS.includes(district)) return J({ error: "Please fill in all required fields." }, 400);
    if (!phoneOk(phone1) || (phone2 && !phoneOk(phone2))) return J({ error: "Please enter a valid phone number." }, 400);
    det = { name, phone1, phone2, district, address };
  }

  if (hasStatus) {
    const was = cur.status === "cancelled", will = b.status === "cancelled";
    const items = parseItems(cur.items);
    if (!was && will) await adjustStock(env, items, +1);   // cancelled: put the stock back
    if (was && !will) {   // un-cancelled: take the stock out again, but only if enough is left
      const { results: prods } = await env.DB.prepare("SELECT id,name,stock FROM products").all();
      const need = {};
      for (const it of items) {
        const pr = prods.find(x => (it.id ? x.id == it.id : x.name === it.name));
        if (pr) need[pr.id] = (need[pr.id] || 0) + (Number(it.qty) || 0);
      }
      const rs = await reserveStock(env, need, prods);
      if (!rs.ok) return J({ error: "Cannot restore this order: " + rs.error }, 400);
    }
    await env.DB.prepare("UPDATE orders SET status=? WHERE id=?").bind(b.status, id).run();
  }
  if (hasPay) {   // admin: mark the bank / online payment as paid (slip checked). Paid orders are never auto-cancelled.
    await env.DB.prepare("UPDATE orders SET pay_state=? WHERE id=? AND payment<>'cod'").bind(b.pay_state, id).run();
  }
  if (det) {
    await env.DB.prepare("UPDATE orders SET name=?,phone1=?,phone2=?,phone_norm=?,district=?,address=? WHERE id=?")
      .bind(det.name, det.phone1, det.phone2, last9(det.phone1), det.district, det.address, id).run();
  }
  return J({ ok: true });
}

// Admin only: delete one order (?id=5), or reset everything (?all=1&confirm=RESET). Reset restarts bill numbers at MS-1001.
export async function onRequestDelete({ request, env }) {
  if (!ok(request, env)) return J({ error: "Wrong password" }, 401);
  const q = new URL(request.url).searchParams;

  if (q.get("all") === "1") {
    if (q.get("confirm") !== "RESET") return J({ error: "Type RESET to confirm." }, 400);
    const { results } = await env.DB.prepare("SELECT items,status FROM orders").all();
    const back = [];
    for (const o of results) if (o.status !== "cancelled" && o.status !== "delivered") back.push(...parseItems(o.items));
    await adjustStock(env, back, +1);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM orders"),
      env.DB.prepare("DELETE FROM sqlite_sequence WHERE name='orders'")
    ]);
    return J({ ok: true, reset: true });
  }

  const id = Number(q.get("id"));
  const cur = await env.DB.prepare("SELECT status,items FROM orders WHERE id=?").bind(id).first();
  if (!cur) return J({ error: "Order not found" }, 404);
  if (cur.status !== "cancelled" && cur.status !== "delivered") await adjustStock(env, parseItems(cur.items), +1);   // delivered goods already left the shop
  await env.DB.prepare("DELETE FROM orders WHERE id=?").bind(id).run();
  return J({ ok: true });
}
