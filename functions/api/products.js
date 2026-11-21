import { readJson } from "../_lib/json.js";
import { expireUnpaid } from "../_lib/expire.js";
const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
const ok = (r, e) => e.ADMIN_PASSWORD && r.headers.get("x-admin-password") === e.ADMIN_PASSWORD;
const normList = v => (Array.isArray(v) ? v : String(v || "").split(",")).map(s => String(s).trim()).filter(Boolean).join(",");
const CATS = ["women", "men", "kids", "bedsheets", "towels", "pillows", "phone", "toys", "electric", "umbrella", "bags", "school"];
export async function onRequestGet({ env }) {
  await expireUnpaid(env);   // unpaid bank / online orders past the deadline are cancelled and their stock freed
  const cols = "id,name,price,cat,sizes,colors,description,size_chart,stock,feat_order,(image IS NOT NULL AND image<>'') AS has_image,updated";
  let results;
  try {
    ({ results } = await env.DB.prepare("SELECT " + cols + ",offer,old_price FROM products ORDER BY id DESC").all());
  } catch (e) {
    // old_price column not added yet (migrate_old_price.sql not run): the shop keeps working without it.
    try {
      ({ results } = await env.DB.prepare("SELECT " + cols + ",offer FROM products ORDER BY id DESC").all());
    } catch (e2) {
      ({ results } = await env.DB.prepare("SELECT " + cols + " FROM products ORDER BY id DESC").all());
    }
  }
  return J(results);
}

export async function onRequestPost({ request, env }) {
  if (!ok(request, env)) return J({ error: "Wrong password" }, 401);
  const b = await readJson(request);
  if (!b) return J({ error: "Bad request" }, 400);
  if (b.check) return J({ ok: true });
  const name = String(b.name || "").trim(), price = parseInt(b.price, 10), cat = b.cat;
  if (!name || !(price >= 0) || !CATS.includes(cat)) return J({ error: "Invalid data" }, 400);
  const now = Date.now();
  const sizes = normList(b.sizes), colors = normList(b.colors);
  const description = String(b.description || "").trim().slice(0, 2000);
  const sizeChart = String(b.size_chart || "").trim().slice(0, 2000);
  // Stock: empty = not tracked (NULL), a number = how many are left.
  const stock = (b.stock === "" || b.stock === null || b.stock === undefined) ? null : Math.max(0, parseInt(b.stock, 10) || 0);
  // Slider position: 1-15 = shown in the home page slider in that order, 0 = not shown.
  let feat = parseInt(b.feat_order, 10);
  if (!(feat >= 1 && feat <= 15)) feat = 0;
  // Offer: 1 = shown in the "Offers" menu of the shop, 0 = not.
  const offer = b.offer ? 1 : 0;
  let id = b.id;
  if (id) {
    try {
      await env.DB.prepare("UPDATE products SET name=?,price=?,cat=?,sizes=?,colors=?,description=?,size_chart=?,stock=?,feat_order=?,offer=?,updated=? WHERE id=?")
        .bind(name, price, cat, sizes, colors, description, sizeChart, stock, feat, offer, now, id).run();
    } catch (e) {   // offer column not added yet (migrate_offer.sql not run)
      await env.DB.prepare("UPDATE products SET name=?,price=?,cat=?,sizes=?,colors=?,description=?,size_chart=?,stock=?,feat_order=?,updated=? WHERE id=?")
        .bind(name, price, cat, sizes, colors, description, sizeChart, stock, feat, now, id).run();
    }
  } else {
    let r;
    try {
      r = await env.DB.prepare("INSERT INTO products (name,price,cat,sizes,colors,description,size_chart,stock,feat_order,offer,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .bind(name, price, cat, sizes, colors, description, sizeChart, stock, feat, offer, now).run();
    } catch (e) {   // offer column not added yet (migrate_offer.sql not run)
      r = await env.DB.prepare("INSERT INTO products (name,price,cat,sizes,colors,description,size_chart,stock,feat_order,updated) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .bind(name, price, cat, sizes, colors, description, sizeChart, stock, feat, now).run();
    }
    id = r.meta.last_row_id;
  }
  // The same number can only belong to one product: remove it from any other product.
  if (feat > 0) await env.DB.prepare("UPDATE products SET feat_order=0 WHERE feat_order=? AND id<>?").bind(feat, id).run();
  if (b.image) await env.DB.prepare("UPDATE products SET image=? WHERE id=?").bind(b.image, id).run();
  // Old price (before the offer, shown crossed out). Only kept when it is higher than the real price; otherwise 0.
  // The real price in the "price" column is what customers pay: this number is for display only.
  let oldPrice = parseInt(b.old_price, 10);
  if (!(oldPrice > price)) oldPrice = 0;
  try { await env.DB.prepare("UPDATE products SET old_price=? WHERE id=?").bind(oldPrice, id).run(); } catch (e) { /* column not added yet */ }
  return J({ ok: true, id });
}

export async function onRequestDelete({ request, env }) {
  if (!ok(request, env)) return J({ error: "Wrong password" }, 401);
  const id = new URL(request.url).searchParams.get("id");
  await env.DB.batch([
    env.DB.prepare("DELETE FROM product_photos WHERE product_id=?").bind(id),   // its extra photos go too
    env.DB.prepare("DELETE FROM products WHERE id=?").bind(id)
  ]);
  return J({ ok: true });
}
