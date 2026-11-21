import { readJson } from "../_lib/json.js";
const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
const ok = (r, e) => e.ADMIN_PASSWORD && r.headers.get("x-admin-password") === e.ADMIN_PASSWORD;
const MAX = 5;

// Public: GET /api/photos?product=ID  -> [{id,url}]
export async function onRequestGet({ request, env }) {
  const pid = new URL(request.url).searchParams.get("product");
  if (!pid) return J([]);
  const { results } = await env.DB.prepare(
    "SELECT id FROM product_photos WHERE product_id=? ORDER BY pos, id"
  ).bind(pid).all();
  return J(results.map(r => ({ id: r.id, url: "/api/photo?id=" + r.id })));
}

// Admin: POST {product, image} adds one photo (max 5 per product)
export async function onRequestPost({ request, env }) {
  if (!ok(request, env)) return J({ error: "Wrong password" }, 401);
  const b = await readJson(request);
  if (!b) return J({ error: "Bad request" }, 400);
  const pid = parseInt(b.product, 10);
  if (!pid || !b.image || !String(b.image).startsWith("data:image/")) return J({ error: "Invalid data" }, 400);
  const c = await env.DB.prepare("SELECT COUNT(*) AS n FROM product_photos WHERE product_id=?").bind(pid).first();
  if (c.n >= MAX) return J({ error: "Maximum 5 photos per product" }, 400);
  const r = await env.DB.prepare("INSERT INTO product_photos (product_id,image,pos) VALUES (?,?,?)")
    .bind(pid, b.image, c.n).run();
  return J({ ok: true, id: r.meta.last_row_id });
}

// Admin: DELETE /api/photos?id=PHOTO_ID
export async function onRequestDelete({ request, env }) {
  if (!ok(request, env)) return J({ error: "Wrong password" }, 401);
  const id = new URL(request.url).searchParams.get("id");
  await env.DB.prepare("DELETE FROM product_photos WHERE id=?").bind(id).run();
  return J({ ok: true });
}
