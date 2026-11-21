const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
const ok = (r, e) => e.ADMIN_PASSWORD && r.headers.get("x-admin-password") === e.ADMIN_PASSWORD;
const STATUSES = ["received", "confirmed", "packed", "out", "delivered", "cancelled"];
const DISTRICTS = ["Colombo","Gampaha","Kalutara","Kandy","Matale","Nuwara Eliya","Galle","Matara","Hambantota","Jaffna","Kilinochchi","Mannar","Vavuniya","Mullaitivu","Batticaloa","Ampara","Trincomalee","Kurunegala","Puttalam","Anuradhapura","Polonnaruwa","Badulla","Monaragala","Ratnapura","Kegalle"];
const clean = s => String(s || "").trim().slice(0, 200);
const codeOf = id => "MS-" + (1000 + Number(id));
const phoneOk = p => /^[0-9+\s-]{9,15}$/.test(p);
const listOf = v => String(v || "").split(",").map(s => s.trim()).filter(Boolean);

// Price rules (all in Rs.)
const FIRST_ORDER_PCT = 10;      // first order discount, on the items total
const FREE_DELIVERY_FROM = 7000; // free delivery when the items total (after discount) is this or more
const DELIVERY_FEE = 350;        // courier delivery
const COD_FEE = 150;             // extra fee for cash on delivery
const GIFT_WRAP_FEE = 200;       // optional gift wrapping
const SLIP_HOURS = 24;           // bank / online orders: payment slip must arrive within this time

// The signed-in customer for a token (or null).
async function customerOf(env, token) {
  if (!token) return null;
  return await env.DB.prepare("SELECT id,phone FROM customers WHERE token=?").bind(String(token)).first();
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
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE phone1 LIKE ? AND status<>'cancelled'").bind("%" + l).first();
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
    const items = JSON.parse(o.items);
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
  const b = await request.json();
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
  if (!cartIn.length || cartIn.length > 50) return J({ error: "Your cart is empty." }, 400);

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

  const cols = "name,phone1,phone2,district,address,items,total,status,created,payment,subtotal,discount,delivery_fee,cod_fee,is_gift,gift_wrap,gift_msg,sender_name,sender_phone,hide_sender,pay_state,pay_method_id";
  let r;
  try {
  r = await env.DB.prepare(
    "INSERT INTO orders (" + cols + ") VALUES (" + cols.split(",").map(() => "?").join(",") + ")"
  ).bind(name, phone1, phone2, district, address, JSON.stringify(lines), total, "received", now, payment, subtotal, discount, delivery, codFee,
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
  // Public: is this signed-in customer eligible for the first order discount? (returns only true/false)
  if (q.has("firstcheck")) {
    return J({ first: await isFirstOrder(env, q.get("token"), q.get("firstcheck")) });
  }
  if (!ok(request, env)) {
    const code = (q.get("code") || "").trim().toUpperCase();
    const m = code.match(/^MS-(\d+)$/);
    if (!m) return J({ error: "Please enter a valid order code, like MS-1001." }, 400);
    const row = await env.DB.prepare("SELECT status,items,total,created FROM orders WHERE id=?").bind(Number(m[1]) - 1000).first();
    if (!row) return J({ error: "Order not found. Please check the code." }, 404);
    return J({ code, status: row.status, items: JSON.parse(row.items), total: row.total, created: row.created });
  }
  if (q.has("stats")) return J(await buildStats(env));
  const { results } = await env.DB.prepare("SELECT o.*, p.title AS pay_title FROM orders o LEFT JOIN pay_methods p ON p.id=o.pay_method_id ORDER BY o.id DESC LIMIT 200").all();
  return J(results.map(o => ({ ...o, code: codeOf(o.id), items: JSON.parse(o.items) })));
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
  if (hasStatus && !STATUSES.includes(b.status)) return J({ error: "Invalid status" }, 400);

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
    const items = JSON.parse(cur.items);
    if (!was && will) await adjustStock(env, items, +1);   // cancelled: put the stock back
    if (was && !will) await adjustStock(env, items, -1);   // un-cancelled: take the stock out again
    await env.DB.prepare("UPDATE orders SET status=? WHERE id=?").bind(b.status, id).run();
  }
  if (det) {
    await env.DB.prepare("UPDATE orders SET name=?,phone1=?,phone2=?,district=?,address=? WHERE id=?")
      .bind(det.name, det.phone1, det.phone2, det.district, det.address, id).run();
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
    for (const o of results) if (o.status !== "cancelled") back.push(...JSON.parse(o.items));
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
  if (cur.status !== "cancelled") await adjustStock(env, JSON.parse(cur.items), +1);
  await env.DB.prepare("DELETE FROM orders WHERE id=?").bind(id).run();
  return J({ ok: true });
}
