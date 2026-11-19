const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
const ok = (r, e) => e.ADMIN_PASSWORD && r.headers.get("x-admin-password") === e.ADMIN_PASSWORD;
const normList = v => (Array.isArray(v) ? v : String(v || "").split(",")).map(s => String(s).trim()).filter(Boolean).join(",");

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id,name,price,cat,sizes,colors,description,size_chart,stock,feat_order,(image IS NOT NULL AND image<>'') AS has_image,updated FROM products ORDER BY id DESC"
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
  const sizes = normList(b.sizes), colors = normList(b.colors);
  const description = String(b.description || "").trim().slice(0, 2000);
  const sizeChart = String(b.size_chart || "").trim().slice(0, 2000);
  // Stock: empty = not tracked (NULL), a number = how many are left.
  const stock = (b.stock === "" || b.stock === null || b.stock === undefined) ? null : Math.max(0, parseInt(b.stock, 10) || 0);
  // Slider position: 1-15 = shown in the home page slider in that order, 0 = not shown.
  let feat = parseInt(b.feat_order, 10);
  if (!(feat >= 1 && feat <= 15)) feat = 0;
  let id = b.id;
  if (id) {
    await env.DB.prepare("UPDATE products SET name=?,price=?,cat=?,sizes=?,colors=?,description=?,size_chart=?,stock=?,feat_order=?,updated=? WHERE id=?")
      .bind(name, price, cat, sizes, colors, description, sizeChart, stock, feat, now, id).run();
  } else {
    const r = await env.DB.prepare("INSERT INTO products (name,price,cat,sizes,colors,description,size_chart,stock,feat_order,updated) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .bind(name, price, cat, sizes, colors, description, sizeChart, stock, feat, now).run();
    id = r.meta.last_row_id;
  }
  // The same number can only belong to one product: remove it from any other product.
  if (feat > 0) await env.DB.prepare("UPDATE products SET feat_order=0 WHERE feat_order=? AND id<>?").bind(feat, id).run();
  if (b.image) await env.DB.prepare("UPDATE products SET image=? WHERE id=?").bind(b.image, id).run();
  return J({ ok: true, id });
}

export async function onRequestDelete({ request, env }) {
  if (!ok(request, env)) return J({ error: "Wrong password" }, 401);
  const id = new URL(request.url).searchParams.get("id");
  await env.DB.prepare("DELETE FROM products WHERE id=?").bind(id).run();
  return J({ ok: true });
}
