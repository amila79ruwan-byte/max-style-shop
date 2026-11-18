const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
const ok = (r, e) => e.ADMIN_PASSWORD && r.headers.get("x-admin-password") === e.ADMIN_PASSWORD;
const STATUSES = ["received", "confirmed", "packed", "out", "delivered", "cancelled"];
const DISTRICTS = ["Colombo","Gampaha","Kalutara","Kandy","Matale","Nuwara Eliya","Galle","Matara","Hambantota","Jaffna","Kilinochchi","Mannar","Vavuniya","Mullaitivu","Batticaloa","Ampara","Trincomalee","Kurunegala","Puttalam","Anuradhapura","Polonnaruwa","Badulla","Monaragala","Ratnapura","Kegalle"];
const clean = s => String(s || "").trim().slice(0, 200);
const codeOf = id => "MS-" + (1000 + Number(id));
const phoneOk = p => /^[0-9+\s-]{9,15}$/.test(p);
const listOf = v => String(v || "").split(",").map(s => s.trim()).filter(Boolean);

export async function onRequestPost({ request, env }) {
  const b = await request.json();
  const name = clean(b.name), phone1 = clean(b.phone1), phone2 = clean(b.phone2);
  const district = clean(b.district), address = String(b.address || "").trim().slice(0, 500);
  if (!name || !phone1 || !address || !DISTRICTS.includes(district)) return J({ error: "Please fill in all required fields." }, 400);
  if (!phoneOk(phone1) || (phone2 && !phoneOk(phone2))) return J({ error: "Please enter a valid phone number." }, 400);
  const cartIn = Array.isArray(b.items) ? b.items : [];
  if (!cartIn.length || cartIn.length > 50) return J({ error: "Your cart is empty." }, 400);

  // Prices are read from the database here. The browser's prices are never trusted.
  const { results: products } = await env.DB.prepare("SELECT id,name,price,sizes,colors FROM products").all();
  const lines = [];
  let total = 0;
  for (const it of cartIn) {
    const p = products.find(x => x.id == it.id);
    if (!p) return J({ error: "A product in your cart is no longer available." }, 400);
    const qty = Math.min(Math.max(parseInt(it.qty, 10) || 0, 1), 20);
    const sizeList = listOf(p.sizes);
    const size = sizeList.length ? clean(it.size) : "";
    if (sizeList.length && !sizeList.includes(size)) return J({ error: "Please select a size for " + p.name + "." }, 400);
    const colorList = listOf(p.colors);
    const color = colorList.length ? clean(it.color) : "";
    if (colorList.length && !colorList.includes(color)) return J({ error: "Please select a color for " + p.name + "." }, 400);
    lines.push({ name: p.name, size, color, qty, price: p.price });
    total += p.price * qty;
  }

  const r = await env.DB.prepare(
    "INSERT INTO orders (name,phone1,phone2,district,address,items,total,status,created) VALUES (?,?,?,?,?,?,?,?,?)"
  ).bind(name, phone1, phone2, district, address, JSON.stringify(lines), total, "received", Date.now()).run();
  return J({ ok: true, code: codeOf(r.meta.last_row_id), total, lines });
}

// Public: customer checks status with an order code. Admin (with password): full list.
export async function onRequestGet({ request, env }) {
  if (!ok(request, env)) {
    const code = (new URL(request.url).searchParams.get("code") || "").trim().toUpperCase();
    const m = code.match(/^MS-(\d+)$/);
    if (!m) return J({ error: "Please enter a valid order code, like MS-1001." }, 400);
    const row = await env.DB.prepare("SELECT status,items,total,created FROM orders WHERE id=?").bind(Number(m[1]) - 1000).first();
    if (!row) return J({ error: "Order not found. Please check the code." }, 404);
    return J({ code, status: row.status, items: JSON.parse(row.items), total: row.total, created: row.created });
  }
  const { results } = await env.DB.prepare("SELECT * FROM orders ORDER BY id DESC LIMIT 200").all();
  return J(results.map(o => ({ ...o, code: codeOf(o.id), items: JSON.parse(o.items) })));
}

// Admin only: change status.
export async function onRequestPut({ request, env }) {
  if (!ok(request, env)) return J({ error: "Wrong password" }, 401);
  const b = await request.json();
  if (!STATUSES.includes(b.status)) return J({ error: "Invalid status" }, 400);
  await env.DB.prepare("UPDATE orders SET status=? WHERE id=?").bind(b.status, Number(b.id)).run();
  return J({ ok: true });
}
