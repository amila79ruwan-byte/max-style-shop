const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
const ok = (r, e) => e.ADMIN_PASSWORD && r.headers.get("x-admin-password") === e.ADMIN_PASSWORD;

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id,name,price,cat,sizes,(image IS NOT NULL AND image<>'') AS has_image,updated FROM products ORDER BY id DESC"
  ).all();
  return J(results);
}

export async function onRequestPost({ request, env }) {
  if (!ok(request, env)) return J({ error: "Wrong password" }, 401);
  const b = await request.json();
  if (b.check) return J({ ok: true });
  const name = String(b.name || "").trim(), price = parseInt(b.price, 10), cat = b.cat;
  if (!name || !(price >= 0) || !["men", "women", "kids"].includes(cat)) return J({ error: "Invalid data" }, 400);
  const now = Date.now();
  // Sizes come in as "S,M,L" (or an array). Store them as a clean comma-separated string.
  const list = Array.isArray(b.sizes) ? b.sizes : String(b.sizes || "").split(",");
  const sizes = list.map(s => String(s).trim()).filter(Boolean).join(",");
  let id = b.id;
  if (id) {
    await env.DB.prepare("UPDATE products SET name=?,price=?,cat=?,sizes=?,updated=? WHERE id=?").bind(name, price, cat, sizes, now, id).run();
  } else {
    const r = await env.DB.prepare("INSERT INTO products (name,price,cat,sizes,updated) VALUES (?,?,?,?,?)").bind(name, price, cat, sizes, now).run();
    id = r.meta.last_row_id;
  }
  if (b.image) await env.DB.prepare("UPDATE products SET image=? WHERE id=?").bind(b.image, id).run();
  return J({ ok: true, id });
}

export async function onRequestDelete({ request, env }) {
  if (!ok(request, env)) return J({ error: "Wrong password" }, 401);
  const id = new URL(request.url).searchParams.get("id");
  await env.DB.prepare("DELETE FROM products WHERE id=?").bind(id).run();
  return J({ ok: true });
}
